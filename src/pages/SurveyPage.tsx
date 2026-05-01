import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SurveyChat } from "@/survey/SurveyChat";
import { StatusScreen } from "@/survey/components/StatusScreen";
import { SURVEYS, getEligibleStage, STAGE_LABELS, type SurveyStage } from "@/survey/survey-config";
import type { ScoredSurvey } from "@/survey/scoring";

interface EmployeeRow {
  id: string;
  name: string;
  doj: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "too-early" }
  | { status: "already-done"; stage: SurveyStage }
  | { status: "ready"; employee: EmployeeRow; stage: SurveyStage }
  | { status: "submitted"; employeeName: string; stage: SurveyStage }
  | { status: "error"; message: string };

function daysBetween(fromIsoDate: string, to: Date) {
  const from = new Date(fromIsoDate + "T00:00:00");
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const SurveyPage = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid" });
      return;
    }

    let cancelled = false;
    (async () => {
      // 1. Look up employee by token via SECURITY DEFINER RPC (no anon SELECT on employees)
      const { data: empRows, error: empErr } = await supabase.rpc(
        "get_employee_by_token" as any,
        { p_token: token },
      );

      if (cancelled) return;
      if (empErr) {
        console.error("Employee lookup failed", empErr);
        setState({ status: "error", message: "Something went wrong. Please try again later." });
        return;
      }
      const employee = Array.isArray(empRows) ? (empRows[0] as EmployeeRow | undefined) : undefined;
      if (!employee) {
        setState({ status: "invalid" });
        return;
      }

      // 2. Compute eligible stage
      const days = daysBetween(employee.doj, new Date());
      const stage = getEligibleStage(days);
      if (!stage) {
        setState({ status: "too-early" });
        return;
      }

      // 3. Check if this stage is already submitted via RPC
      const { data: alreadyDone, error: respErr } = await supabase.rpc(
        "survey_already_submitted" as any,
        { p_token: token, p_stage: String(stage) },
      );

      if (cancelled) return;
      if (respErr) {
        console.error("Survey response lookup failed", respErr);
        setState({ status: "error", message: "Something went wrong. Please try again later." });
        return;
      }
      if (alreadyDone) {
        setState({ status: "already-done", stage });
        return;
      }

      setState({ status: "ready", employee, stage });
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleComplete(
    employeeId: string,
    stage: SurveyStage,
    employeeName: string,
    result: ScoredSurvey & {
      free_text_response: string | null;
      completion_time_seconds: number;
    },
  ) {
    const payload = {
      employee_id: employeeId,
      stage: String(stage) as "15" | "30" | "45" | "60" | "90" | "180",
      responses: result.responses as unknown as never,
      free_text_response: result.free_text_response,
      scores: result.scores as unknown as never,
      critical_flags: result.critical_flags as unknown as never,
      gaming_flag: result.gaming_flag,
      completion_time_seconds: result.completion_time_seconds,
      final_score: result.scores.final_score,
      risk_level: result.scores.risk_level,
    };
    const { error } = await supabase.from("survey_responses").insert(payload);

    if (error) {
      // Show error but keep the friendly closing screen — the chat already
      // congratulated the user. Console logs the issue for HR debugging.
      console.error("Failed to save survey response", error);
    }
    setState({ status: "submitted", employeeName, stage });
  }

  switch (state.status) {
    case "loading":
      return (
        <div className="flex min-h-dvh items-center justify-center bg-gradient-warm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="typing-dot block h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot block h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot block h-2 w-2 rounded-full bg-primary" />
          </div>
        </div>
      );

    case "invalid":
      return (
        <StatusScreen
          emoji="🔗"
          title="This link doesn't look right"
          message="The check-in link you used isn't valid. Please ask HR to resend your link."
          showHome
        />
      );

    case "too-early":
      return (
        <StatusScreen
          emoji="⏳"
          title="Your first check-in isn't ready yet"
          message="See you soon! We'll reach out when it's time for your first check-in."
        />
      );

    case "already-done":
      return (
        <StatusScreen
          emoji="🙏"
          title="You've already completed this check-in"
          message={`Thanks for sharing your ${STAGE_LABELS[state.stage]} thoughts with us. The next one will arrive at the right time.`}
        />
      );

    case "submitted":
      return (
        <StatusScreen
          emoji="✨"
          title={`All done, ${state.employeeName}!`}
          message="Your inputs help HR support you better. You can close this window now."
        />
      );

    case "error":
      return (
        <StatusScreen
          emoji="⚠️"
          title="Something went wrong"
          message={state.message || "Please try refreshing the page in a moment."}
          showHome
        />
      );

    case "ready": {
      const config = SURVEYS[state.stage];
      return (
        <SurveyChat
          config={config}
          traineeName={state.employee.name.split(" ")[0]}
          onComplete={(result) =>
            handleComplete(state.employee.id, state.stage, state.employee.name.split(" ")[0], result)
          }
        />
      );
    }
  }
};

export default SurveyPage;

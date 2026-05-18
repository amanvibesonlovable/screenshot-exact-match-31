import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SurveyChat } from "@/survey/SurveyChat";
import { StatusScreen } from "@/survey/components/StatusScreen";
import { SURVEYS, getEligibleStage, STAGE_LABELS, type SurveyStage } from "@/survey/survey-config";
import {
  INTERN_SURVEYS,
  INTERN_WEEK_LABELS,
  getEligibleInternWeek,
  internConfigForChat,
  type InternWeek,
} from "@/survey/intern-survey-config";
import type { ScoredSurvey } from "@/survey/scoring";

interface EmployeeRow {
  id: string;
  name: string;
  doj: string;
  program?: string | null;
}

type StageKey = SurveyStage | InternWeek;

type PendingSubmission = {
  program: "str" | "ascent";
  stage: StageKey;
  employeeName: string;
  result: ScoredSurvey & {
    free_text_response: string | null;
    completion_time_seconds: number;
    rawAnswers: { question_id: string; selected: number[] }[];
  };
};

type LoadState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "too-early"; program: "str" | "ascent"; name: string }
  | { status: "all-done"; name: string }
  | { status: "already-done"; program: "str" | "ascent"; stage: StageKey; name: string }
  | { status: "ready"; program: "str" | "ascent"; employee: EmployeeRow; stage: StageKey }
  | { status: "submitted"; program: "str" | "ascent"; employeeName: string; stage: StageKey }
  | { status: "submit-error"; pending: PendingSubmission; submitting: boolean; message: string }
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

  async function submitToServer(pending: PendingSubmission): Promise<{ ok: boolean; message?: string }> {
    if (!token) return { ok: true };
    const { error } = await supabase.rpc("submit_survey_response" as any, {
      p_token: token,
      p_stage: String(pending.stage),
      p_answers: pending.result.rawAnswers as unknown as never,
      p_free_text: pending.result.free_text_response,
      p_completion_time_seconds: pending.result.completion_time_seconds,
    });
    if (error) {
      console.error("Failed to save survey response", error);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async function handleComplete(
    _employeeId: string,
    stage: SurveyStage,
    employeeName: string,
    result: ScoredSurvey & {
      free_text_response: string | null;
      completion_time_seconds: number;
      rawAnswers: { question_id: string; selected: number[] }[];
    },
  ) {
    const pending: PendingSubmission = { stage, employeeName, result };
    const res = await submitToServer(pending);
    if (res.ok) {
      setState({ status: "submitted", employeeName, stage });
    } else {
      setState({ status: "submit-error", pending, submitting: false, message: res.message ?? "" });
    }
  }

  async function handleRetry() {
    if (state.status !== "submit-error") return;
    setState({ ...state, submitting: true });
    const res = await submitToServer(state.pending);
    if (res.ok) {
      setState({ status: "submitted", employeeName: state.pending.employeeName, stage: state.pending.stage });
    } else {
      setState({ status: "submit-error", pending: state.pending, submitting: false, message: res.message ?? "" });
    }
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

    case "submit-error":
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-warm px-6 py-12 text-center">
          <div className="flex max-w-sm flex-col items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand text-4xl shadow-soft">💾</div>
            <h1 className="text-2xl font-extrabold text-foreground">We couldn't save your check-in yet</h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Your answers are safe on this screen. Tap retry — it usually works on the second try.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              disabled={state.submitting}
              className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity disabled:opacity-60"
            >
              {state.submitting ? "Retrying…" : "Retry saving"}
            </button>
            {state.message && (
              <p className="text-xs text-muted-foreground/60">Tech detail: {state.message}</p>
            )}
          </div>
        </div>
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

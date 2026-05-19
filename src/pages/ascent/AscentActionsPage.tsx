import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  RISK_COLORS,
  isNonResponsive,
  latestResponse,
  relTime,
  responsesByIntern,
  useAscentInterns,
  useAscentResponses,
  weekNum,
  type Intern,
} from "@/ascent/lib";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ACTION_TYPES = [
  "Called intern",
  "Spoke to AM",
  "Spoke to Unit HR",
  "Flagged to BM",
  "PPO conversation",
  "PPO investigation",
  "Confirmed dropout",
  "Other",
];

type ActionRow = {
  id: string;
  employee_id: string;
  action_type: string;
  notes: string | null;
  created_by_email: string | null;
  created_at: string;
};

function useAscentActions(internIds: string[] | undefined) {
  return useQuery({
    queryKey: ["ascent-actions", internIds?.length ?? 0],
    enabled: !!internIds && internIds.length > 0,
    queryFn: async (): Promise<ActionRow[]> => {
      if (!internIds || !internIds.length) return [];
      const { data, error } = await supabase
        .from("hr_actions")
        .select("id, employee_id, action_type, notes, created_by_email, created_at")
        .in("employee_id", internIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActionRow[];
    },
  });
}

export default function AscentActionsPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);
  const { data: actions = [] } = useAscentActions(internIds);
  const [params] = useSearchParams();

  const [modalIntern, setModalIntern] = useState<Intern | null>(null);
  const [modalType, setModalType] = useState<string>(ACTION_TYPES[0]);
  const [modalNotes, setModalNotes] = useState("");

  // Open modal via query string ?intern=...&type=...
  useEffect(() => {
    const iid = params.get("intern");
    const t = params.get("type");
    if (iid && interns.length > 0) {
      const i = interns.find((x) => x.id === iid);
      if (i) {
        setModalIntern(i);
        if (t) setModalType(t);
      }
    }
  }, [params, interns]);

  const qc = useQueryClient();
  const byEmp = responsesByIntern(responses);
  const active = interns.filter((i) => i.status === "training");

  const actionsByEmp = new Map<string, ActionRow[]>();
  for (const a of actions) {
    if (!actionsByEmp.has(a.employee_id)) actionsByEmp.set(a.employee_id, []);
    actionsByEmp.get(a.employee_id)!.push(a);
  }

  const highRiskNoAction = active
    .filter((i) => {
      const l = latestResponse(byEmp.get(i.id) ?? []);
      return l?.risk_level === "HIGH" && !(actionsByEmp.get(i.id)?.length);
    });
  const nonRespNoAction = active.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? []) && !(actionsByEmp.get(i.id)?.length));

  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = actions.filter((a) => new Date(a.created_at).getTime() >= weekAgo).length;
  const pending = highRiskNoAction.length + nonRespNoAction.length;

  // Action coverage
  const allHrInterns = new Set([...active.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "HIGH").map((i) => i.id), ...active.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? [])).map((i) => i.id)]);
  const addressed = Array.from(allHrInterns).filter((id) => (actionsByEmp.get(id)?.length ?? 0) > 0).length;

  // Most common action type
  const typeCounts = new Map<string, number>();
  for (const a of actions) typeCounts.set(a.action_type, (typeCounts.get(a.action_type) ?? 0) + 1);
  const mostCommon = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const internById = new Map(interns.map((i) => [i.id, i]));

  async function submitAction() {
    if (!modalIntern) return;
    if (modalType === "Confirmed dropout") {
      if (!confirm(`This will mark ${modalIntern.name} as a confirmed dropout. Are you sure?`)) return;
      const { error } = await supabase.from("employees").update({ status: "exited" }).eq("id", modalIntern.id);
      if (error) { toast.error(error.message); return; }
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("hr_actions").insert({
      employee_id: modalIntern.id,
      action_type: modalType,
      notes: modalNotes || null,
      created_by_email: userData.user?.email ?? null,
      created_by: userData.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Action logged");
    setModalIntern(null);
    setModalNotes("");
    setModalType(ACTION_TYPES[0]);
    qc.invalidateQueries({ queryKey: ["ascent-actions"] });
    qc.invalidateQueries({ queryKey: ["ascent-interns"] });
  }

  return (
    <AscentLayout title="Actions">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Total Actions" value={actions.length} />
          <Stat label="Actions This Week" value={thisWeek} />
          <Stat label="Pending Attention" value={pending} color={pending > 0 ? RISK_COLORS.HIGH : undefined} />
        </div>

        {/* Pending sections */}
        {(highRiskNoAction.length > 0 || nonRespNoAction.length > 0) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Pending Attention</h2>
            {highRiskNoAction.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">High-Risk Interns — No Action Taken</p>
                <ul className="mt-2 space-y-2">
                  {highRiskNoAction.map((i) => {
                    const last = latestResponse(byEmp.get(i.id) ?? [])!;
                    const flag = last.critical_flags?.[0];
                    return (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                        <div className="text-sm">
                          🔴 <Link to={`/ascent/interns/${i.id}`} className="font-semibold text-foreground hover:underline">{i.name}</Link>
                          <span className="ml-2 text-muted-foreground">{i.branch} · HIGH · W{weekNum(last.stage)} · {flag ? `"${flag}"` : ""} · {relTime(last.submitted_at)}</span>
                        </div>
                        <button onClick={() => setModalIntern(i)} className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">Take Action</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {nonRespNoAction.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Non-Responsive Interns — No Action Taken</p>
                <ul className="mt-2 space-y-2">
                  {nonRespNoAction.map((i) => {
                    const rs = byEmp.get(i.id) ?? [];
                    const last = rs[rs.length - 1];
                    return (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                        <div className="text-sm">
                          ⚠️ <Link to={`/ascent/interns/${i.id}`} className="font-semibold text-foreground hover:underline">{i.name}</Link>
                          <span className="ml-2 text-muted-foreground">{i.branch} · Missed 2+ consecutive weeks{last ? ` · Last: W${weekNum(last.stage)} (${relTime(last.submitted_at)})` : ""}</span>
                        </div>
                        <button onClick={() => setModalIntern(i)} className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">Take Action</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Most Common Action" value={mostCommon} small />
          <Stat label="Action Coverage" value={`${addressed} of ${allHrInterns.size}`} small context="high-risk / non-responsive addressed" />
          <Stat label="Active Interns" value={active.length} small />
        </section>

        {/* History */}
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-bold text-foreground">Action History</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Intern</th>
                  <th className="px-3 py-2 text-left">Branch</th>
                  <th className="px-3 py-2 text-left">Risk</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2 text-left">Logged By</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => {
                  const intern = internById.get(a.employee_id);
                  const risk = intern ? latestResponse(byEmp.get(intern.id) ?? [])?.risk_level : null;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{intern ? <Link to={`/ascent/interns/${intern.id}`} className="font-semibold text-foreground hover:underline">{intern.name}</Link> : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{intern?.branch ?? "—"}</td>
                      <td className="px-3 py-2">{risk ? <RiskPill risk={risk} /> : "—"}</td>
                      <td className="px-3 py-2">{a.action_type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.notes ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.created_by_email ?? "—"}</td>
                    </tr>
                  );
                })}
                {actions.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">No actions logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal */}
      {modalIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalIntern(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground">Log Action</h3>
            <p className="mt-1 text-xs text-muted-foreground">{modalIntern.name} · {modalIntern.branch} · {modalIntern.employee_code}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action Type</label>
                <select value={modalType} onChange={(e) => setModalType(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                <textarea value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalIntern(null)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Cancel</button>
              <button onClick={submitAction} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Log Action</button>
            </div>
          </div>
        </div>
      )}
    </AscentLayout>
  );
}

function Stat({ label, value, color, small, context }: { label: string; value: number | string; color?: string; small?: boolean; context?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold ${small ? "text-lg" : "text-3xl"}`} style={{ color }}>{value}</p>
      {context && <p className="mt-1 text-[11px] text-muted-foreground">{context}</p>}
    </div>
  );
}

function RiskPill({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  return <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: RISK_COLORS[risk] }}>{risk}</span>;
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { relativeTime } from "@/hr/ResponseDetail";

type Employee = {
  id: string;
  name: string;
  employee_code: string;
  branch: string;
  area_manager: string;
};

type Response = {
  id: string;
  employee_id: string;
  stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_score: number;
  critical_flags: string[] | null;
  submitted_at: string;
};

type Action = {
  id: string;
  employee_id: string;
  action_type: string;
  notes: string | null;
  created_at: string;
  created_by_email: string | null;
};

const ACTION_TYPES = [
  "Called trainee",
  "Spoke to Area Manager",
  "Spoke to Branch Manager",
  "Scheduled follow-up check-in",
  "Escalated to Senior HR Manager",
  "Referred to Employee Relations",
  "Other",
];

const RISK_BG: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-destructive/15 text-destructive",
};

const PER_PAGE = 15;

function ActionsInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [modalEmp, setModalEmp] = useState<Employee | null>(null);
  const [modalActionType, setModalActionType] = useState(ACTION_TYPES[0]);
  const [modalCustomType, setModalCustomType] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // History filters
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterActionType, setFilterActionType] = useState("ALL");
  const [filterDateRange, setFilterDateRange] = useState<"ALL" | "7" | "30" | "90">("ALL");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const refresh = async () => {
    setLoading(true);
    const [{ data: emp }, { data: resp }, { data: act }] = await Promise.all([
      supabase.from("employees").select("id,name,employee_code,branch,area_manager"),
      supabase.from("survey_responses").select("id,employee_id,stage,risk_level,final_score,critical_flags,submitted_at").order("submitted_at", { ascending: false }),
      supabase.from("hr_actions").select("*").order("created_at", { ascending: false }),
    ]);
    setEmployees((emp ?? []) as Employee[]);
    setResponses((resp ?? []) as unknown as Response[]);
    setActions((act ?? []) as Action[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Latest response per employee
  const latestByEmp = useMemo(() => {
    const m = new Map<string, Response>();
    for (const r of responses) if (!m.has(r.employee_id)) m.set(r.employee_id, r);
    return m;
  }, [responses]);

  // Pending: latest response is HIGH AND no action exists with created_at AFTER that survey's submitted_at
  const pending = useMemo(() => {
    const items: { emp: Employee; resp: Response }[] = [];
    for (const [empId, r] of latestByEmp.entries()) {
      const e = empById.get(empId);
      if (!e) continue;
      if (r.risk_level !== "HIGH" && r.risk_level !== "MEDIUM") continue;
      const submittedAt = new Date(r.submitted_at).getTime();
      const hasFollowupAction = actions.some(
        (a) => a.employee_id === empId && new Date(a.created_at).getTime() > submittedAt,
      );
      if (!hasFollowupAction) items.push({ emp: e, resp: r });
    }
    // High risk first, then medium; older surveys first (urgency)
    return items.sort((a, b) => {
      if (a.resp.risk_level !== b.resp.risk_level) return a.resp.risk_level === "HIGH" ? -1 : 1;
      return new Date(a.resp.submitted_at).getTime() - new Date(b.resp.submitted_at).getTime();
    });
  }, [latestByEmp, actions, empById]);

  const pendingHighOnly = useMemo(() => pending.filter((p) => p.resp.risk_level === "HIGH"), [pending]);

  // Summary stats
  const totalActions = actions.length;
  const actionsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return actions.filter((a) => new Date(a.created_at).getTime() >= cutoff).length;
  }, [actions]);
  const pendingCount = pendingHighOnly.length;

  // Action stats
  const mostCommon = useMemo(() => {
    if (actions.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const a of actions) counts[a.action_type] = (counts[a.action_type] ?? 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [type, count] = sorted[0];
    return { type, pct: Math.round((count / actions.length) * 100) };
  }, [actions]);

  const avgResponseDays = useMemo(() => {
    const diffs: number[] = [];
    for (const r of responses) {
      if (r.risk_level !== "HIGH") continue;
      const ra = actions
        .filter((a) => a.employee_id === r.employee_id && new Date(a.created_at).getTime() >= new Date(r.submitted_at).getTime())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (!ra) continue;
      diffs.push((new Date(ra.created_at).getTime() - new Date(r.submitted_at).getTime()) / 86400000);
    }
    if (diffs.length === 0) return null;
    return diffs.reduce((s, x) => s + x, 0) / diffs.length;
  }, [responses, actions]);

  const actionCoverage = useMemo(() => {
    const highEmps = new Set<string>();
    for (const r of responses) if (r.risk_level === "HIGH") highEmps.add(r.employee_id);
    if (highEmps.size === 0) return null;
    let addressed = 0;
    for (const empId of highEmps) {
      if (actions.some((a) => a.employee_id === empId)) addressed++;
    }
    return { addressed, total: highEmps.size, pct: Math.round((addressed / highEmps.size) * 100) };
  }, [responses, actions]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    let arr = actions.slice();
    if (filterBranch !== "ALL") {
      arr = arr.filter((a) => empById.get(a.employee_id)?.branch === filterBranch);
    }
    if (filterActionType !== "ALL") arr = arr.filter((a) => a.action_type === filterActionType);
    if (filterDateRange !== "ALL") {
      const cutoff = Date.now() - Number(filterDateRange) * 86400000;
      arr = arr.filter((a) => new Date(a.created_at).getTime() >= cutoff);
    }
    if (q) arr = arr.filter((a) => empById.get(a.employee_id)?.name.toLowerCase().includes(q));
    return arr;
  }, [actions, filterBranch, filterActionType, filterDateRange, historySearch, empById]);

  const branches = useMemo(
    () => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(),
    [employees],
  );
  const actionTypesUsed = useMemo(
    () => Array.from(new Set(actions.map((a) => a.action_type))).sort(),
    [actions],
  );

  useEffect(() => { setHistoryPage(1); }, [filterBranch, filterActionType, filterDateRange, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / PER_PAGE));
  const historyPageItems = filteredHistory.slice((historyPage - 1) * PER_PAGE, historyPage * PER_PAGE);

  const openModal = (emp: Employee) => {
    setModalEmp(emp);
    setModalActionType(ACTION_TYPES[0]);
    setModalCustomType("");
    setModalNotes("");
  };
  const closeModal = () => setModalEmp(null);

  const saveAction = async () => {
    if (!modalEmp) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const action_type = modalActionType === "Other" ? (modalCustomType.trim() || "Other") : modalActionType;
    const { error } = await supabase.from("hr_actions").insert({
      employee_id: modalEmp.id,
      action_type,
      notes: modalNotes.trim() || null,
      created_by: user?.id ?? null,
      created_by_email: user?.email ?? null,
    });
    setSaving(false);
    if (error) {
      setToast(`Failed: ${error.message}`);
    } else {
      setToast(`Action logged for ${modalEmp.name}`);
      closeModal();
      await refresh();
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <DashboardHeader rightSlot={
        <>
          <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary">
            Sign out
          </button>
        </>
      } />

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">HR actions</h1>
            <p className="text-xs text-muted-foreground">Log and track follow-ups with flagged trainees.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-bubble backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total actions</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">{totalActions}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">all time</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-bubble backdrop-blur ${actionsThisWeek > 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/60 bg-card/80"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Actions this week</p>
              <p className={`mt-1 text-3xl font-extrabold tabular-nums ${actionsThisWeek > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>{actionsThisWeek}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">last 7 days</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-bubble backdrop-blur ${pendingCount > 0 ? "border-l-4 border-destructive border-destructive/40 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pending attention</p>
              {pendingCount > 0 ? (
                <>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-destructive">{pendingCount}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">high-risk trainees with no action yet</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">All clear ✓</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">no pending high-risk trainees</p>
                </>
              )}
            </div>
          </div>

          {/* Pending section */}
          {pending.length > 0 && (
            <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Needs attention</h2>
              <p className="text-xs text-muted-foreground">High &amp; medium-risk trainees who haven't been followed up since their latest survey.</p>
              <ul className="mt-3 space-y-2">
                {pending.map(({ emp, resp }) => (
                  <li key={emp.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[resp.risk_level]}`}>{resp.risk_level}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/dashboard/trainees/${emp.id}`} className="font-bold text-foreground hover:underline">{emp.name}</Link>
                        <span className="text-xs text-muted-foreground">· {emp.branch} · Day {resp.stage}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {Array.isArray(resp.critical_flags) && resp.critical_flags.length > 0
                          ? <>🚨 {resp.critical_flags.join(" · ")}</>
                          : <>Score: {resp.final_score.toFixed(1)}</>}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">submitted {relativeTime(resp.submitted_at)}</span>
                    <button
                      onClick={() => openModal(emp)}
                      className="shrink-0 rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-soft"
                    >
                      Take Action
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* History */}
          <section className="rounded-3xl border border-border/60 bg-card/80 shadow-bubble backdrop-blur">
            <div className="border-b border-border/60 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Action history log</h2>
              <p className="text-xs text-muted-foreground">{filteredHistory.length} action{filteredHistory.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
              <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value as any)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <option value="ALL">All time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <option value="ALL">All branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterActionType} onChange={(e) => setFilterActionType(e.target.value)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <option value="ALL">All action types</option>
                {actionTypesUsed.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by trainee name…"
                className="min-w-[180px] flex-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            {loading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : actions.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">
                No actions logged yet. When you respond to flagged trainees, log your actions here to track follow-ups and build accountability.
              </p>
            ) : filteredHistory.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">No actions match these filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-2 py-2.5">Trainee</th>
                        <th className="px-2 py-2.5">Branch</th>
                        <th className="px-2 py-2.5">Risk</th>
                        <th className="px-2 py-2.5">Action type</th>
                        <th className="px-2 py-2.5">Notes</th>
                        <th className="px-4 py-2.5">Logged by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyPageItems.map((a) => {
                        const e = empById.get(a.employee_id);
                        const currentRisk = latestByEmp.get(a.employee_id)?.risk_level;
                        const date = new Date(a.created_at);
                        return (
                          <tr key={a.id} className="border-t border-border/40">
                            <td className="px-4 py-2.5 text-xs text-foreground" title={date.toLocaleString()}>
                              {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-2 py-2.5">
                              {e ? (
                                <Link to={`/dashboard/trainees/${e.id}`} className="font-bold text-foreground hover:underline">
                                  {e.name}
                                </Link>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2.5 text-xs text-muted-foreground">{e?.branch ?? "—"}</td>
                            <td className="px-2 py-2.5">
                              {currentRisk ? (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[currentRisk]}`}>{currentRisk}</span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2.5 text-xs text-foreground">{a.action_type}</td>
                            <td className="px-2 py-2.5 text-xs text-muted-foreground" title={a.notes ?? ""}>
                              {a.notes ? (a.notes.length > 100 ? a.notes.slice(0, 100) + "…" : a.notes) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.created_by_email ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                  <span>Page {historyPage} of {totalHistoryPages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1}
                      className="rounded-full border border-border bg-card px-3 py-1 font-bold hover:bg-secondary disabled:opacity-50">
                      ← Prev
                    </button>
                    <button onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages}
                      className="rounded-full border border-border bg-card px-3 py-1 font-bold hover:bg-secondary disabled:opacity-50">
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Stats */}
          {actions.length > 0 && (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-bubble backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Most common action</p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {mostCommon ? `${mostCommon.type} (${mostCommon.pct}%)` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-bubble backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Avg response time</p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {avgResponseDays !== null ? `${avgResponseDays.toFixed(1)} days for high-risk flags` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-bubble backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Action coverage</p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {actionCoverage
                    ? `${actionCoverage.addressed} of ${actionCoverage.total} high-risk trainees addressed (${actionCoverage.pct}%)`
                    : "—"}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Take action modal */}
      <Dialog open={modalEmp !== null} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log HR action</DialogTitle>
          </DialogHeader>
          {modalEmp && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-xs">
                <p className="font-bold text-foreground">{modalEmp.name} <span className="text-muted-foreground">· {modalEmp.employee_code}</span></p>
                <p className="text-muted-foreground">{modalEmp.branch} · AM: {modalEmp.area_manager}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Action type</label>
                <select
                  value={modalActionType}
                  onChange={(e) => setModalActionType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {modalActionType === "Other" && (
                  <input
                    value={modalCustomType}
                    onChange={(e) => setModalCustomType(e.target.value)}
                    placeholder="Custom action type"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={5}
                  placeholder="What did you do? What did you learn? Any next steps?"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={closeModal} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-secondary">
              Cancel
            </button>
            <button
              onClick={saveAction}
              disabled={saving}
              className="rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save action"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

export default function ActionsPage() {
  return (
    <RequireHr>
      <ActionsInner />
    </RequireHr>
  );
}

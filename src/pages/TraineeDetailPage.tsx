import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { UserMenu } from "@/hr/UserMenu";
import { DIM_COLORS, DIM_LABELS, RISK_COLORS } from "@/hr/DashboardCharts";

function TraineeDetailInner() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [actionType, setActionType] = useState("Called trainee");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: emp }, { data: resp }, { data: acts }] = await Promise.all([
      supabase.from("employees").select("*").eq("id", id).maybeSingle(),
      supabase.from("survey_responses").select("*").eq("employee_id", id).order("submitted_at", { ascending: false }),
      supabase.from("hr_actions").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
    ]);
    setEmployee(emp);
    setResponses(resp ?? []);
    setActions(acts ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-line */ }, [id]);

  const logAction = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("hr_actions").insert({
      employee_id: id,
      action_type: actionType,
      notes: note || null,
      created_by: user?.id ?? null,
      created_by_email: user?.email ?? null,
    });
    setNote("");
    refresh();
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!employee) return <div className="p-12 text-center">Trainee not found.</div>;

  const daysSince = Math.floor((Date.now() - new Date(employee.doj).getTime()) / 86400000);
  const dims = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"] as const;

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to dashboard
          </Link>
          <UserMenu />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* Profile */}
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{employee.employee_code}</p>
              <h1 className="mt-1 text-3xl font-extrabold text-foreground">{employee.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {employee.branch} · {employee.area_manager}
              </p>
              <p className="text-xs text-muted-foreground">
                DOJ {employee.doj} · day {daysSince} · {employee.status}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {employee.email} · {employee.phone}
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
              Survey link:{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">/s/{employee.token}</code>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Survey history */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Survey history ({responses.length})
            </h2>
            {responses.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No survey responses yet.
              </p>
            )}
            {responses.map((r) => {
              const respList = Array.isArray(r.responses) ? r.responses : [];
              return (
                <div key={r.id} className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-extrabold text-foreground">Day {r.stage} check-in</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-extrabold"
                      style={{ background: `${RISK_COLORS[r.risk_level]}22`, color: RISK_COLORS[r.risk_level] }}
                    >
                      {r.risk_level} · {Number(r.final_score).toFixed(1)}
                    </span>
                  </div>

                  {/* dimension bars */}
                  {r.scores && (
                    <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {dims.map((d) => {
                        const v = r.scores[d];
                        if (v === null || v === undefined) return null;
                        const pct = Math.min(100, (Number(v) / 25) * 100);
                        return (
                          <div key={d} className="flex items-center gap-2 text-[11px]">
                            <span className="w-32 truncate text-muted-foreground">{DIM_LABELS[d]}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div style={{ width: `${pct}%`, background: DIM_COLORS[d] }} className="h-full" />
                            </div>
                            <span className="w-6 text-right tabular-nums text-muted-foreground">{Number(v).toFixed(0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(r.critical_flags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.critical_flags.map((f: string) => (
                        <span key={f} className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                          🚨 {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.gaming_flag && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      ⚡ Possible rushed response — completed in {r.completion_time_seconds}s
                    </p>
                  )}

                  {/* Q&A */}
                  {respList.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground">
                        Show all answers ({respList.length})
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {respList.map((qa: any, i: number) => (
                          <li key={i} className="rounded-xl bg-secondary/40 p-2.5 text-xs">
                            <p className="font-bold text-foreground">{qa.question_text}</p>
                            <p className="mt-0.5 text-muted-foreground">→ {qa.answer_text}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {qa.dimension} · +{qa.points}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {r.free_text_response && (
                    <p className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm italic text-foreground">
                      "{r.free_text_response}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">HR actions</h2>
            <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2 text-sm"
              >
                <option>Called trainee</option>
                <option>Spoke to manager</option>
                <option>Scheduled check-in</option>
                <option>Escalated to senior HR</option>
                <option>Custom note</option>
              </select>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes (optional)…"
                className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm"
                rows={3}
              />
              <button
                onClick={logAction}
                className="mt-2 w-full rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
              >
                Log action
              </button>
            </div>
            <ul className="space-y-2">
              {actions.length === 0 && (
                <li className="rounded-2xl border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
                  No actions logged yet.
                </li>
              )}
              {actions.map((a) => (
                <li key={a.id} className="rounded-2xl border border-border/60 bg-card/80 p-3 text-xs">
                  <p className="font-bold text-foreground">{a.action_type}</p>
                  <p className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  {a.created_by_email && (
                    <p className="text-[10px] text-muted-foreground">by {a.created_by_email}</p>
                  )}
                  {a.notes && <p className="mt-1 italic text-foreground">"{a.notes}"</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function TraineeDetailPage() {
  return (
    <RequireHr>
      <TraineeDetailInner />
    </RequireHr>
  );
}

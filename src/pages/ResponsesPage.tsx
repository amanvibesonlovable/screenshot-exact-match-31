import { Fragment as FragmentWithKey, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import {
  ResponsesFilterBar,
  ResponsesFilters,
  emptyResponsesFilters,
  responseMatchesAll,
} from "@/hr/ResponsesFilterBar";
import { ResponseDetail, ResponseLite, EmpLite, relativeTime } from "@/hr/ResponseDetail";
import { RISK_COLORS } from "@/hr/DashboardCharts";
import { UserMenu } from "@/hr/UserMenu";

type Employee = EmpLite;

const RISK_BG: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-destructive/15 text-destructive",
};

const PER_PAGE = 20;

type SortKey = "submitted_at" | "name" | "branch" | "stage" | "risk" | "score";

function ResponsesInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responses, setResponses] = useState<ResponseLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ResponsesFilters>(emptyResponsesFilters());
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emp }, { data: resp }] = await Promise.all([
        supabase.from("employees").select("id,name,employee_code,branch,area_manager"),
        supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false }),
      ]);
      setEmployees((emp ?? []) as Employee[]);
      setResponses((resp ?? []) as unknown as ResponseLite[]);
      setLoading(false);
    })();
  }, []);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const branches = useMemo(
    () => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const e = empById.get(r.employee_id);
      if (!e) return false;
      return responseMatchesAll(r, e, filters);
    });
  }, [responses, filters, empById]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ea = empById.get(a.employee_id), eb = empById.get(b.employee_id);
      let v = 0;
      switch (sortKey) {
        case "submitted_at":
          v = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(); break;
        case "name":
          v = (ea?.name ?? "").localeCompare(eb?.name ?? ""); break;
        case "branch":
          v = (ea?.branch ?? "").localeCompare(eb?.branch ?? ""); break;
        case "stage":
          v = Number(a.stage) - Number(b.stage); break;
        case "risk":
          v = ({ LOW: 0, MEDIUM: 1, HIGH: 2 }[a.risk_level] - { LOW: 0, MEDIUM: 1, HIGH: 2 }[b.risk_level]); break;
        case "score":
          v = a.final_score - b.final_score; break;
      }
      return sortDir === "asc" ? v : -v;
    });
    return arr;
  }, [filtered, sortKey, sortDir, empById]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [filters, sortKey, sortDir]);

  const freeTextRecent = useMemo(() => {
    return filtered
      .filter((r) => r.free_text_response && r.free_text_response.trim().length > 0)
      .slice(0, 10);
  }, [filtered]);

  const freeTextCount = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      if (r.free_text_response && r.free_text_response.trim().length > 0) set.add(r.employee_id);
    }
    return set.size;
  }, [filtered]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "submitted_at" || k === "score" ? "desc" : "asc"); }
  };

  const sortIndicator = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <DashboardHeader rightSlot={
        <>
          <UserMenu />
        </>
      } />

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Survey responses</h1>
            <p className="text-xs text-muted-foreground">Browse all survey responses and read free-text answers.</p>
          </div>

          <ResponsesFilterBar filters={filters} setFilters={setFilters} branches={branches} />

          {/* Free-text spotlight */}
          <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">In their own words</h2>
                <p className="text-xs text-muted-foreground">Recent free-text responses from trainees — the insights buttons can't capture.</p>
              </div>
              <span className="text-xs text-muted-foreground">{freeTextCount} trainee{freeTextCount === 1 ? "" : "s"} shared written feedback</span>
            </div>
            <div className="mt-4">
              {freeTextRecent.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No free-text responses yet. These will appear as trainees share written feedback.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {freeTextRecent.map((r) => {
                    const e = empById.get(r.employee_id);
                    if (!e) return null;
                    const color = RISK_COLORS[r.risk_level];
                    return (
                      <Link
                        key={r.id}
                        to={`/dashboard/trainees/${e.id}`}
                        className="block rounded-xl border border-border/60 bg-background/40 p-3 text-sm transition hover:bg-background/70"
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        <p className="line-clamp-3 italic text-foreground">"{r.free_text_response}"</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span><span className="font-bold text-foreground">{e.name}</span> · {e.branch} · Day {r.stage}</span>
                          <span className={`rounded-full px-2 py-0.5 font-bold ${RISK_BG[r.risk_level]}`}>{r.risk_level}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* All responses table */}
          <section className="rounded-3xl border border-border/60 bg-card/80 shadow-bubble backdrop-blur">
            <div className="border-b border-border/60 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">All responses</h2>
              <p className="text-xs text-muted-foreground">{sorted.length} response{sorted.length === 1 ? "" : "s"} · click a row to expand</p>
            </div>

            {loading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading responses…</p>
            ) : sorted.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">
                {responses.length === 0
                  ? "No survey responses yet. This page will populate as trainees complete their check-ins."
                  : "No responses match these filters."}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>Trainee{sortIndicator("name")}</th>
                        <th className="px-2 py-2.5">Employee ID</th>
                        <th className="px-2 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("branch")}>Branch{sortIndicator("branch")}</th>
                        <th className="px-2 py-2.5">Manager</th>
                        <th className="px-2 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("stage")}>Stage{sortIndicator("stage")}</th>
                        <th className="px-2 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("risk")}>Risk{sortIndicator("risk")}</th>
                        <th className="px-2 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("score")}>Score{sortIndicator("score")}</th>
                        <th className="px-2 py-2.5">Flags</th>
                        <th className="px-2 py-2.5">Free</th>
                        <th className="px-2 py-2.5">Game</th>
                        <th className="px-4 py-2.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("submitted_at")}>Submitted{sortIndicator("submitted_at")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((r) => {
                        const e = empById.get(r.employee_id);
                        if (!e) return null;
                        const isOpen = expanded === r.id;
                        const flagCount = Array.isArray(r.critical_flags) ? r.critical_flags.length : 0;
                        return (
                          <FragmentWithKey key={r.id}>
                            <tr
                              onClick={() => setExpanded(isOpen ? null : r.id)}
                              className={`cursor-pointer border-t border-border/40 hover:bg-background/40 ${isOpen ? "bg-background/40" : ""}`}
                            >
                              <td className="px-4 py-2.5">
                                <Link to={`/dashboard/trainees/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="font-bold text-foreground hover:underline">
                                  {e.name}
                                </Link>
                              </td>
                              <td className="px-2 py-2.5 text-xs text-muted-foreground">{e.employee_code}</td>
                              <td className="px-2 py-2.5 text-xs text-foreground">{e.branch}</td>
                              <td className="px-2 py-2.5 text-xs text-muted-foreground">{e.area_manager}</td>
                              <td className="px-2 py-2.5">
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">Day {r.stage}</span>
                              </td>
                              <td className="px-2 py-2.5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[r.risk_level]}`}>{r.risk_level}</span>
                              </td>
                              <td className="px-2 py-2.5 text-sm font-bold tabular-nums text-foreground">{r.final_score.toFixed(1)}</td>
                              <td className="px-2 py-2.5 text-xs">
                                {flagCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-destructive">
                                    <span className="h-2 w-2 rounded-full bg-destructive" />
                                    {flagCount}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2.5 text-xs">
                                {r.free_text_response && r.free_text_response.trim() ? "✏️" : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-2 py-2.5 text-xs">{r.gaming_flag ? "⚡" : ""}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground" title={new Date(r.submitted_at).toLocaleString()}>
                                {relativeTime(r.submitted_at)}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr className="border-t border-border/40 bg-background/30">
                                <td colSpan={11} className="p-4">
                                  <ResponseDetail response={r} employee={e} />
                                </td>
                              </tr>
                            )}
                          </FragmentWithKey>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                  <span>Page {page} of {totalPages} · {sorted.length} total</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ResponsesPage() {
  return (
    <RequireHr>
      <ResponsesInner />
    </RequireHr>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AscentLayout } from "@/ascent/AscentLayout";
import { AscentFilterBar } from "@/ascent/AscentFilterBar";
import {
  AscentFilters,
  DEFAULT_FILTERS,
  DIM_COLORS,
  DIM_KEYS,
  DIM_SHORT,
  RISK_COLORS,
  applyFilters,
  pulseScore,
  relTime,
  uniqueBatches,
  uniqueBranches,
  useAscentInterns,
  useAscentResponses,
  weekNum,
} from "@/ascent/lib";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

export default function AscentResponsesPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);

  const [filters, setFilters] = useState<AscentFilters>(DEFAULT_FILTERS);
  const [hasFreeText, setHasFreeText] = useState(false);
  const [hasFlag, setHasFlag] = useState(false);
  const [gaming, setGaming] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const f = applyFilters(interns, responses, filters);

  let visible = f.responses;
  if (hasFreeText) visible = visible.filter((r) => r.free_text_response);
  if (hasFlag) visible = visible.filter((r) => r.critical_flags && r.critical_flags.length > 0);
  if (gaming) visible = visible.filter((r) => r.gaming_flag);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    const ids = new Set(
      f.interns.filter((i) => i.name.toLowerCase().includes(q) || i.employee_code.toLowerCase().includes(q)).map((i) => i.id),
    );
    visible = visible.filter((r) => ids.has(r.employee_id));
  }
  visible = [...visible].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  const internById = new Map(interns.map((i) => [i.id, i]));

  // Spotlight: latest 10 with free text
  const spotlight = [...responses]
    .filter((r) => r.free_text_response)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 10);

  const PER_PAGE = 20;
  const pageCount = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const pageRows = visible.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <AscentLayout title="Responses">
      <div className="space-y-6">
        <AscentFilterBar filters={filters} onChange={(f) => { setFilters(f); setPage(0); }} branches={uniqueBranches(interns)} batches={uniqueBatches(interns)} />

        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Toggle on={hasFreeText} onChange={setHasFreeText} label="Has free text" />
          <Toggle on={hasFlag} onChange={setHasFlag} label="Critical flag" />
          <Toggle on={gaming} onChange={setGaming} label="Gaming flagged" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name or ID..."
            className="h-8 flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 text-xs"
          />
        </div>

        {/* Free-text spotlight */}
        {spotlight.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-foreground">In their own words</h2>
            <p className="mb-3 text-xs text-muted-foreground">Recent free-text responses from interns.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {spotlight.map((r) => {
                const intern = internById.get(r.employee_id);
                if (!intern) return null;
                return (
                  <Link key={r.id} to={`/ascent/interns/${intern.id}`} className="block rounded-lg border bg-card p-4 hover:bg-muted/30" style={{ borderLeftWidth: 4, borderLeftColor: RISK_COLORS[r.risk_level] }}>
                    <p className="text-sm italic text-foreground">"{r.free_text_response}"</p>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{intern.name}</span> · {intern.branch} · W{weekNum(r.stage)} · <span style={{ color: RISK_COLORS[r.risk_level] }} className="font-bold">{r.risk_level}</span> · {relTime(r.submitted_at)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* All responses table */}
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-5 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">All Responses</h2>
              <p className="text-xs text-muted-foreground">{visible.length} responses · click any row to expand</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded border border-border px-2 py-1 disabled:opacity-40">Prev</button>
              <span className="text-muted-foreground">Page {page + 1} of {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Branch</th>
                  <th className="px-3 py-2 text-left">AM</th>
                  <th className="px-3 py-2 text-left">Week</th>
                  <th className="px-3 py-2 text-left">Risk</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Pulse</th>
                  <th className="px-3 py-2 text-left">Flags</th>
                  <th className="px-3 py-2 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const intern = internById.get(r.employee_id);
                  if (!intern) return null;
                  const w = weekNum(r.stage);
                  const ps = pulseScore(r);
                  const isOpen = expanded === r.id;
                  return (
                    <>
                      <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <td className="px-2">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td className="px-3 py-2 font-semibold text-foreground">{intern.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{intern.employee_code}</td>
                        <td className="px-3 py-2 text-muted-foreground">{intern.branch}</td>
                        <td className="px-3 py-2 text-muted-foreground">{intern.area_manager}</td>
                        <td className="px-3 py-2"><WeekBadge w={w} /></td>
                        <td className="px-3 py-2"><RiskPill risk={r.risk_level} /></td>
                        <td className="px-3 py-2 font-semibold">{r.final_score}</td>
                        <td className="px-3 py-2 text-muted-foreground">{ps ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.critical_flags && r.critical_flags.length > 0 && <span title={r.critical_flags.join(", ")}>🚨 {r.critical_flags.length}</span>}
                          {r.free_text_response && <span className="ml-1" title="Has free text">💬</span>}
                          {r.gaming_flag && <span className="ml-1" title="Gaming flagged">⚡</span>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{relTime(r.submitted_at)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border bg-muted/20">
                          <td colSpan={11} className="px-6 py-4">
                            <ExpandedDetail r={r} intern={intern} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={11} className="px-6 py-10 text-center text-sm text-muted-foreground">No responses match filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AscentLayout>
  );
}

function ExpandedDetail({ r, intern }: { r: any; intern: any }) {
  const scores = r.scores || {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link to={`/ascent/interns/${intern.id}`} className="text-base font-bold text-foreground hover:underline">{intern.name}</Link>
          <span className="ml-2 text-xs text-muted-foreground">{intern.employee_code} · {intern.branch} · W{weekNum(r.stage)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <RiskPill risk={r.risk_level} />
          <span>Score: <span className="font-bold">{r.final_score}</span></span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {DIM_KEYS.map((k) => {
          const val = Number(scores[k] ?? 0);
          return (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 text-[11px] font-semibold text-muted-foreground">{DIM_SHORT[k]}</span>
              <span className="w-6 text-xs font-bold">{val}</span>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (val / 10) * 100)}%`, background: DIM_COLORS[k] }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Week Multiplier: {scores.week_multiplier ?? "—"}× | Composite: {scores.composite ?? "—"} | Final: {r.final_score}
      </p>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Questions & Answers</p>
        <ul className="mt-2 space-y-2">
          {(r.responses || []).map((q: any, i: number) => {
            const isFlag = r.critical_flags?.some((f: string) => f.toLowerCase().includes(q.answer_text?.toLowerCase()?.slice(0, 20) ?? "_")) || false;
            return (
              <li key={i} className="text-sm">
                <p className="text-foreground"><span className="text-muted-foreground">Q:</span> {q.question_text}</p>
                <p className="ml-3 text-foreground">
                  ➤ <span className="italic">{q.answer_text}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">→ +{q.points} {q.dimension !== "none" ? q.dimension.replace(/_/g, " ") : ""}</span>
                  {isFlag && <span className="ml-1">🚨</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      {r.free_text_response && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Free text</p>
          <blockquote className="mt-1 rounded-md border-l-2 border-border bg-muted/30 px-3 py-2 text-sm italic text-foreground">"{r.free_text_response}"</blockquote>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">⏱️ Completed in {Math.floor(r.completion_time_seconds / 60)} min {r.completion_time_seconds % 60} sec</p>
      <Link to={`/ascent/interns/${intern.id}`} className="inline-block text-xs font-semibold text-primary hover:underline">View Full Intern Profile →</Link>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
      {label}
    </button>
  );
}

function RiskPill({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  return <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: RISK_COLORS[risk] }}>{risk}</span>;
}

function WeekBadge({ w }: { w: number }) {
  return <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">W{w}</span>;
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  ASCENT_TEAL,
  DIM_COLORS,
  DIM_KEYS,
  DIM_SHORT,
  RISK_COLORS,
  responsesByIntern,
  uniqueBranches,
  uniqueBatches,
  useAscentInterns,
  useAscentResponses,
  dimAverages,
  pulseSeries,
  latestResponse,
  weekNum,
} from "@/ascent/lib";
import { classifyPpo, avgPulse, w6Response, w7Response, ppoAnswer, shortIntent, PPO_COLORS, PPO_LABEL, type PpoBucket } from "@/ascent/ppo";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Cell } from "recharts";

const TONE_COLOR: Record<string, string> = {
  good: "#16A34A",
  neutral: "#64748B",
  bad: "#DC2626",
  strongBad: "#991B1B",
};

export default function AscentPpoTrackerPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);
  const [branch, setBranch] = useState("all");
  const [batch, setBatch] = useState("all");
  const [intent, setIntent] = useState<PpoBucket | "all">("all");

  const branches = uniqueBranches(interns);
  const batches = uniqueBatches(interns);
  const byEmp = responsesByIntern(responses);
  const active = interns.filter((i) => i.status === "training");
  const filtered = active.filter(
    (i) => (branch === "all" || i.branch === branch) && (batch === "all" || i.intern_batch === batch),
  );

  // Per intern PPO bucket
  const internPpo = filtered.map((i) => {
    const rs = byEmp.get(i.id) ?? [];
    return {
      intern: i,
      rs,
      bucket: classifyPpo(i, rs),
      avgP: avgPulse(rs),
      latest: latestResponse(rs),
      w6: w6Response(rs),
      w7: w7Response(rs),
    };
  });

  const eligible = internPpo.filter((x) => x.bucket !== "NONE");
  const notReached = internPpo.length - eligible.length;
  const accept = eligible.filter((x) => x.bucket === "ACCEPT");
  const fence = eligible.filter((x) => x.bucket === "FENCE");
  const decline = eligible.filter((x) => x.bucket === "DECLINE");

  const pctOf = (n: number) => (eligible.length ? Math.round((n / eligible.length) * 100) : 0);

  const visible = intent === "all" ? internPpo.filter((x) => x.bucket !== "NONE") : internPpo.filter((x) => x.bucket === intent);
  // Default sort: red first, amber, green; within each, avgPulse ascending
  const bucketOrder: PpoBucket[] = ["DECLINE", "FENCE", "ACCEPT", "NONE"];
  visible.sort((a, b) => {
    const ba = bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket);
    if (ba !== 0) return ba;
    return (a.avgP ?? 99) - (b.avgP ?? 99);
  });

  // Correlation bar — avg pulse by bucket
  const corrData = (["ACCEPT", "FENCE", "DECLINE"] as PpoBucket[]).map((b) => {
    const arr = eligible.filter((x) => x.bucket === b).map((x) => x.avgP).filter((x): x is number => x != null);
    return {
      group: PPO_LABEL[b],
      avg: arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : 0,
      color: PPO_COLORS[b],
    };
  });

  // Per branch
  const branchRows = branches.map((b) => {
    const ofB = internPpo.filter((x) => x.intern.branch === b);
    const a = ofB.filter((x) => x.bucket === "ACCEPT").length;
    const f = ofB.filter((x) => x.bucket === "FENCE").length;
    const d = ofB.filter((x) => x.bucket === "DECLINE").length;
    const total = a + f + d;
    return { branch: b, a, f, d, total };
  }).filter((r) => r.total > 0);

  const earliestWeek = Math.min(...active.map((i) => {
    const d = Math.floor((Date.now() - new Date(i.doj).getTime()) / 86_400_000);
    return Math.max(1, Math.min(7, Math.floor(d / 7)));
  })) || 1;

  return (
    <AscentLayout title="PPO Tracker">
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Select label="Branch" value={branch} onChange={setBranch} options={[{ value: "all", label: "All" }, ...branches.map((b) => ({ value: b, label: b }))]} />
          <Select label="Batch" value={batch} onChange={setBatch} options={[{ value: "all", label: "All" }, ...batches.map((b) => ({ value: b, label: b }))]} />
          <Select label="PPO Intent" value={intent} onChange={(v) => setIntent(v as any)} options={[
            { value: "all", label: "All" }, { value: "ACCEPT", label: "Likely Accept" }, { value: "FENCE", label: "On the Fence" }, { value: "DECLINE", label: "Likely Decline" },
          ]} />
          {(branch !== "all" || batch !== "all" || intent !== "all") && (
            <button onClick={() => { setBranch("all"); setBatch("all"); setIntent("all"); }} className="ml-auto h-8 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground hover:text-foreground">Reset</button>
          )}
        </div>

        {eligible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-base font-semibold text-foreground">PPO tracking will activate once interns reach Week 6.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Currently {active.length} active interns. Earliest in Week {earliestWeek}. First PPO data appears around Week 6.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard color={PPO_COLORS.ACCEPT} title="LIKELY TO ACCEPT" emoji="🟢" count={accept.length} pct={pctOf(accept.length)} sub="Pipeline healthy" />
              <SummaryCard color={PPO_COLORS.FENCE} title="ON THE FENCE" emoji="🟡" count={fence.length} pct={pctOf(fence.length)} sub="Intervention opportunity" />
              <SummaryCard color={PPO_COLORS.DECLINE} title="LIKELY TO DECLINE" emoji="🔴" count={decline.length} pct={pctOf(decline.length)} sub="Investigate reasons" />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {eligible.length} interns who completed Week 6 or 7 surveys. {notReached} interns haven't reached Week 6 yet.
            </p>

            {/* Readiness Table */}
            <section className="rounded-xl border border-border bg-card">
              <header className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-bold text-foreground">PPO Readiness</h2>
                <p className="text-xs text-muted-foreground">Sorted by urgency: declines first, then fence, then accepts.</p>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Branch</th>
                      <th className="px-4 py-2 text-left">AM</th>
                      <th className="px-4 py-2 text-left">Risk</th>
                      <th className="px-4 py-2 text-left">Avg Pulse</th>
                      <th className="px-4 py-2 text-left">W6 Intent</th>
                      <th className="px-4 py-2 text-left">W7 Intent</th>
                      <th className="px-4 py-2 text-left">PPO Signal</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ intern, bucket, avgP, latest, w6, w7 }) => {
                      const w6s = shortIntent(ppoAnswer(w6));
                      const w7s = shortIntent(ppoAnswer(w7));
                      const pColor = avgP == null ? "#64748B" : avgP >= 4 ? RISK_COLORS.LOW : avgP >= 3 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
                      return (
                        <tr key={intern.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5">
                            <Link to={`/ascent/interns/${intern.id}`} className="font-semibold text-foreground hover:underline">{intern.name}</Link>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{intern.branch}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{intern.area_manager}</td>
                          <td className="px-4 py-2.5">
                            {latest ? <RiskPill risk={latest.risk_level} /> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: pColor }}>{avgP ?? "—"}</td>
                          <td className="px-4 py-2.5" style={{ color: TONE_COLOR[w6s.tone], fontWeight: w6s.tone === "strongBad" ? 700 : 500 }}>{w6s.label}</td>
                          <td className="px-4 py-2.5" style={{ color: TONE_COLOR[w7s.tone], fontWeight: w7s.tone === "strongBad" ? 700 : 500 }}>{w7s.label}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: PPO_COLORS[bucket] }}>
                              {PPO_LABEL[bucket]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {bucket === "FENCE" ? (
                              <Link to={`/ascent/actions?intern=${intern.id}&type=PPO+conversation`} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">Talk to them</Link>
                            ) : bucket === "DECLINE" ? (
                              <Link to={`/ascent/actions?intern=${intern.id}&type=PPO+investigation`} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">Investigate</Link>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* On the Fence deep dive */}
            {fence.length > 0 && (
              <section>
                <div className="mb-3">
                  <h2 className="text-base font-bold text-foreground">On the Fence — These interns are persuadable</h2>
                  <p className="text-xs text-muted-foreground">A single HR conversation can turn a "maybe" into a "yes".</p>
                </div>
                <div className="space-y-4">
                  {fence.map(({ intern, rs, avgP }) => {
                    const dims = dimAverages(rs);
                    const ps = pulseSeries(rs).filter((p) => p.pulse != null);
                    const ftexts = rs.filter((r) => r.free_text_response).map((r) => ({ week: weekNum(r.stage), text: r.free_text_response! }));
                    const talkingPoints: string[] = [];
                    if (dims.guidance_support >= 5) talkingPoints.push("Their AM relationship needs attention (Guidance score elevated)");
                    if (dims.engagement_motivation >= 5) talkingPoints.push("They're not finding the work meaningful");
                    if (dims.experience_wellbeing >= 5) talkingPoints.push("Physical/practical concerns are dragging them down");
                    if (dims.project_clarity >= 5) talkingPoints.push("Project scope or expectations may be unclear");
                    if (ftexts.length) talkingPoints.push(`Reference their own words: "${ftexts[ftexts.length - 1].text.slice(0, 100)}..."`);
                    talkingPoints.push("Discuss the STR career path and growth trajectory");

                    return (
                      <div key={intern.id} className="rounded-xl border-l-4 border bg-card p-5" style={{ borderLeftColor: PPO_COLORS.FENCE }}>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PPO_COLORS.FENCE }}>🟡 ON THE FENCE</p>
                            <Link to={`/ascent/interns/${intern.id}`} className="text-base font-bold text-foreground hover:underline">{intern.name}</Link>
                            <span className="ml-2 text-xs text-muted-foreground">{intern.employee_code} · {intern.branch} · {intern.area_manager}</span>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">Avg Pulse: <span className="font-bold text-foreground">{avgP ?? "—"}</span></div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {DIM_KEYS.map((k) => {
                            const val = dims[k];
                            const pct = Math.min(100, (val / 10) * 100);
                            return (
                              <div key={k} className="flex items-center gap-2">
                                <span className="w-24 text-[11px] font-semibold text-muted-foreground">{DIM_SHORT[k]}</span>
                                <span className="w-6 text-xs font-bold">{val.toFixed(0)}</span>
                                <div className="h-2 flex-1 rounded-full bg-muted">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DIM_COLORS[k] }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {ps.length >= 2 && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Pulse Trend: {ps.map((p) => p.pulse).join(" → ")}
                          </p>
                        )}

                        {ftexts.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Their free-text responses</p>
                            <ul className="mt-1 space-y-1">
                              {ftexts.map((t, i) => (
                                <li key={i} className="text-sm italic text-foreground">W{t.week}: "{t.text}"</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Suggested talking points</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
                            {talkingPoints.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>

                        <div className="mt-4">
                          <Link to={`/ascent/actions?intern=${intern.id}&type=PPO+conversation`} className="inline-block rounded-md px-3 py-2 text-xs font-semibold text-white" style={{ background: ASCENT_TEAL }}>
                            Schedule PPO Conversation →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Correlation */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold text-foreground">Experience predicts PPO decisions</h2>
              <p className="text-xs text-muted-foreground">Interns with better weekly experience scores are more likely to accept PPOs.</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={corrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 5]} />
                    <RTooltip />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {corrData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* By branch */}
            {branchRows.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold text-foreground">PPO by Branch</h2>
                <div className="mt-4 space-y-3">
                  {branchRows.map((r) => {
                    const total = r.total;
                    return (
                      <div key={r.branch}>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-foreground">{r.branch}</span>
                          <span className="text-[11px] text-muted-foreground">{r.a + r.f + r.d} interns</span>
                        </div>
                        <div className="flex h-5 overflow-hidden rounded-md bg-muted">
                          {r.a > 0 && <div style={{ width: `${(r.a / total) * 100}%`, background: PPO_COLORS.ACCEPT }} title={`Accept ${r.a}`} />}
                          {r.f > 0 && <div style={{ width: `${(r.f / total) * 100}%`, background: PPO_COLORS.FENCE }} title={`Fence ${r.f}`} />}
                          {r.d > 0 && <div style={{ width: `${(r.d / total) * 100}%`, background: PPO_COLORS.DECLINE }} title={`Decline ${r.d}`} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AscentLayout>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SummaryCard({ color, title, emoji, count, pct, sub }: { color: string; title: string; emoji: string; count: number; pct: number; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{count}</p>
      <p className="text-xs text-muted-foreground">{pct}% of eligible</p>
      <p className="mt-3 text-xs font-semibold" style={{ color }}>{emoji} {sub}</p>
    </div>
  );
}

function RiskPill({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: RISK_COLORS[risk] }}>
      {risk}
    </span>
  );
}

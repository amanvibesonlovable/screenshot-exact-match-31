import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RISK_COLORS = {
  HIGH: "hsl(0 75% 55%)",
  MEDIUM: "hsl(35 90% 55%)",
  LOW: "hsl(150 55% 45%)",
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export function RiskDonut({
  data,
}: {
  data: { name: RiskLevel; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Risk distribution
        </h3>
        <span className="text-xs text-muted-foreground">{total} responded</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={3}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={RISK_COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RiskTrendChart({
  data,
}: {
  data: { date: string; HIGH: number; MEDIUM: number; LOW: number }[];
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur lg:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Risk trend (last 30 days)
        </h3>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Line type="monotone" dataKey="HIGH" stroke={RISK_COLORS.HIGH} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="MEDIUM" stroke={RISK_COLORS.MEDIUM} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="LOW" stroke={RISK_COLORS.LOW} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StageBreakdown({
  data,
}: {
  data: { stage: string; HIGH: number; MEDIUM: number; LOW: number }[];
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Responses by stage
        </h3>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="LOW" stackId="a" fill={RISK_COLORS.LOW} radius={[0, 0, 0, 0]} />
            <Bar dataKey="MEDIUM" stackId="a" fill={RISK_COLORS.MEDIUM} />
            <Bar dataKey="HIGH" stackId="a" fill={RISK_COLORS.HIGH} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BranchLeaderboard({
  rows,
}: {
  rows: { branch: string; total: number; high: number; med: number; low: number; avg: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Branches by risk
        </h3>
        <span className="text-xs text-muted-foreground">avg score · % high</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 6).map((r) => {
            const highPct = r.total ? Math.round((r.high / r.total) * 100) : 0;
            return (
              <li key={r.branch}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">{r.branch}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.avg.toFixed(1)} · {highPct}% high
                  </span>
                </div>
                <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    style={{ width: `${(r.low / max) * 100}%`, background: RISK_COLORS.LOW }}
                  />
                  <div
                    style={{ width: `${(r.med / max) * 100}%`, background: RISK_COLORS.MEDIUM }}
                  />
                  <div
                    style={{ width: `${(r.high / max) * 100}%`, background: RISK_COLORS.HIGH }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

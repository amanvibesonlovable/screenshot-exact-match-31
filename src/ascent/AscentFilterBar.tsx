import { ASCENT_WEEKS, AscentFilters, DEFAULT_FILTERS } from "./lib";
import { X } from "lucide-react";

const RISKS = ["all", "HIGH", "MEDIUM", "LOW"] as const;
const DATES: { value: AscentFilters["date"]; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

export function AscentFilterBar({
  filters,
  onChange,
  branches,
  batches,
}: {
  filters: AscentFilters;
  onChange: (f: AscentFilters) => void;
  branches: string[];
  batches: string[];
}) {
  const set = <K extends keyof AscentFilters>(k: K, v: AscentFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const Select = ({
    label,
    value,
    onChange: oc,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => oc(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const isDefault =
    filters.date === "all" &&
    filters.branch === "all" &&
    filters.week === "all" &&
    filters.risk === "all" &&
    filters.batch === "all";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Select
        label="Date"
        value={filters.date}
        onChange={(v) => set("date", v as AscentFilters["date"])}
        options={DATES.map((d) => ({ value: d.value, label: d.label }))}
      />
      {filters.date === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              From
            </span>
            <input
              type="date"
              value={filters.customFrom ?? ""}
              onChange={(e) => set("customFrom", e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              To
            </span>
            <input
              type="date"
              value={filters.customTo ?? ""}
              onChange={(e) => set("customTo", e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
        </>
      )}
      <Select
        label="Branch"
        value={filters.branch}
        onChange={(v) => set("branch", v)}
        options={[{ value: "all", label: "All" }, ...branches.map((b) => ({ value: b, label: b }))]}
      />
      <Select
        label="Week"
        value={String(filters.week)}
        onChange={(v) => set("week", v === "all" ? "all" : (Number(v) as AscentFilters["week"]))}
        options={[
          { value: "all", label: "All" },
          ...ASCENT_WEEKS.map((w) => ({ value: String(w), label: `W${w}` })),
        ]}
      />
      <Select
        label="Risk"
        value={filters.risk}
        onChange={(v) => set("risk", v as AscentFilters["risk"])}
        options={RISKS.map((r) => ({ value: r, label: r === "all" ? "All" : r.charAt(0) + r.slice(1).toLowerCase() }))}
      />
      <Select
        label="Batch"
        value={filters.batch}
        onChange={(v) => set("batch", v)}
        options={[{ value: "all", label: "All" }, ...batches.map((b) => ({ value: b, label: b }))]}
      />
      {!isDefault && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="ml-auto flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X size={12} /> Reset
        </button>
      )}
    </div>
  );
}

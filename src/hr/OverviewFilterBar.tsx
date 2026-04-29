import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRangeKey = "ALL" | "7" | "30" | "90" | "CUSTOM";

export type OverviewFilters = {
  dateRange: DateRangeKey;
  customFrom?: string;
  customTo?: string;
  branches: Set<string>;
  stages: Set<number>;
  risks: Set<"LOW" | "MEDIUM" | "HIGH">;
};

const DATE_LABELS: Record<DateRangeKey, string> = {
  ALL: "All time",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  CUSTOM: "Custom range",
};

const STAGES = [15, 30, 45, 60, 90, 180] as const;
const RISKS = ["HIGH", "MEDIUM", "LOW"] as const;

function MultiPopover<T extends string | number>({
  label, options, selected, onChange, format,
}: {
  label: string;
  options: readonly T[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  format?: (v: T) => string;
}) {
  const allSelected = selected.size === 0 || selected.size === options.length;
  const summary = allSelected
    ? `All ${label.toLowerCase()}`
    : selected.size === 1
      ? format ? format(Array.from(selected)[0]) : String(Array.from(selected)[0])
      : `${selected.size} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary">
          <span className="font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="font-bold text-foreground">{summary}</span>
          <span className="text-muted-foreground">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <button
          onClick={() => onChange(new Set())}
          className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-bold hover:bg-secondary"
        >
          All {label.toLowerCase()}
        </button>
        <div className="max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.has(opt);
            return (
              <label
                key={String(opt)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = new Set(selected);
                    if (checked) next.delete(opt);
                    else next.add(opt);
                    onChange(next);
                  }}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="text-foreground">{format ? format(opt) : String(opt)}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function OverviewFilterBar({
  filters, setFilters, branches,
}: {
  filters: OverviewFilters;
  setFilters: (f: OverviewFilters) => void;
  branches: string[];
}) {
  const [showCustom, setShowCustom] = useState(filters.dateRange === "CUSTOM");

  const reset = () =>
    setFilters({
      dateRange: "ALL",
      branches: new Set(),
      stages: new Set(),
      risks: new Set(),
    });

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.dateRange !== "ALL") {
    activeChips.push({
      key: "date",
      label: filters.dateRange === "CUSTOM"
        ? `Date: ${filters.customFrom ?? "?"} → ${filters.customTo ?? "?"}`
        : `Date: ${DATE_LABELS[filters.dateRange]}`,
      clear: () => setFilters({ ...filters, dateRange: "ALL", customFrom: undefined, customTo: undefined }),
    });
  }
  for (const b of filters.branches) {
    activeChips.push({
      key: `b:${b}`, label: `Branch: ${b}`,
      clear: () => { const n = new Set(filters.branches); n.delete(b); setFilters({ ...filters, branches: n }); },
    });
  }
  for (const s of filters.stages) {
    activeChips.push({
      key: `s:${s}`, label: `Stage: Day ${s}`,
      clear: () => { const n = new Set(filters.stages); n.delete(s); setFilters({ ...filters, stages: n }); },
    });
  }
  for (const r of filters.risks) {
    activeChips.push({
      key: `r:${r}`, label: `Risk: ${r}`,
      clear: () => { const n = new Set(filters.risks); n.delete(r); setFilters({ ...filters, risks: n }); },
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
          <span className="font-bold uppercase tracking-wide text-muted-foreground">Date</span>
          <select
            value={filters.dateRange}
            onChange={(e) => {
              const v = e.target.value as DateRangeKey;
              setShowCustom(v === "CUSTOM");
              setFilters({ ...filters, dateRange: v });
            }}
            className="bg-transparent text-foreground focus:outline-none"
          >
            {(Object.keys(DATE_LABELS) as DateRangeKey[]).map((k) => (
              <option key={k} value={k}>{DATE_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {showCustom && (
          <>
            <input type="date" value={filters.customFrom ?? ""}
              onChange={(e) => setFilters({ ...filters, customFrom: e.target.value })}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={filters.customTo ?? ""}
              onChange={(e) => setFilters({ ...filters, customTo: e.target.value })}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs" />
          </>
        )}

        <MultiPopover label="Branch" options={branches} selected={filters.branches}
          onChange={(n) => setFilters({ ...filters, branches: n })} />
        <MultiPopover label="Stage" options={STAGES} selected={filters.stages}
          onChange={(n) => setFilters({ ...filters, stages: n })}
          format={(s) => `Day ${s}`} />
        <MultiPopover label="Risk" options={RISKS} selected={filters.risks}
          onChange={(n) => setFilters({ ...filters, risks: n })} />

        <button onClick={reset} className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground">
          Reset filters
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {c.label}
              <button onClick={c.clear} className="ml-1 hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Apply filters to a survey response. Returns true if the response passes. */
export function responseMatchesFilters(
  r: { submitted_at: string; risk_level: "LOW" | "MEDIUM" | "HIGH"; stage: string | number },
  f: OverviewFilters,
): boolean {
  if (f.risks.size > 0 && !f.risks.has(r.risk_level)) return false;
  if (f.stages.size > 0 && !f.stages.has(Number(r.stage))) return false;
  if (f.dateRange !== "ALL") {
    const submitted = new Date(r.submitted_at).getTime();
    let from: number | null = null;
    let to: number | null = null;
    if (f.dateRange === "CUSTOM") {
      if (f.customFrom) from = new Date(f.customFrom).getTime();
      if (f.customTo) to = new Date(f.customTo).getTime() + 86400000;
    } else {
      const days = Number(f.dateRange);
      from = Date.now() - days * 86400000;
    }
    if (from !== null && submitted < from) return false;
    if (to !== null && submitted >= to) return false;
  }
  return true;
}

/** Apply branch filter to an employee. */
export function employeeMatchesBranch(branch: string, f: OverviewFilters): boolean {
  return f.branches.size === 0 || f.branches.has(branch);
}

/** Serialize filters to URL params */
export function filtersToParams(f: OverviewFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.dateRange !== "ALL") out.dr = f.dateRange;
  if (f.customFrom) out.dfrom = f.customFrom;
  if (f.customTo) out.dto = f.customTo;
  if (f.branches.size) out.b = Array.from(f.branches).join(",");
  if (f.stages.size) out.s = Array.from(f.stages).join(",");
  if (f.risks.size) out.r = Array.from(f.risks).join(",");
  return out;
}
export function filtersFromParams(p: URLSearchParams): OverviewFilters {
  return {
    dateRange: (p.get("dr") as DateRangeKey) ?? "ALL",
    customFrom: p.get("dfrom") ?? undefined,
    customTo: p.get("dto") ?? undefined,
    branches: new Set((p.get("b") ?? "").split(",").filter(Boolean)),
    stages: new Set((p.get("s") ?? "").split(",").filter(Boolean).map(Number)),
    risks: new Set((p.get("r") ?? "").split(",").filter(Boolean) as ("LOW" | "MEDIUM" | "HIGH")[]),
  };
}

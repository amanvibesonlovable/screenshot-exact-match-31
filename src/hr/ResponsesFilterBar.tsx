import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateRangeKey = "ALL" | "7" | "30" | "90" | "CUSTOM";

export type ResponsesFilters = {
  dateRange: DateRangeKey;
  customFrom?: string;
  customTo?: string;
  branches: Set<string>;
  stages: Set<number>;
  risks: Set<"LOW" | "MEDIUM" | "HIGH">;
  hasFreeText: boolean;
  hasCriticalFlag: boolean;
  gamingFlagged: boolean;
  search: string;
};

export const emptyResponsesFilters = (): ResponsesFilters => ({
  dateRange: "ALL",
  branches: new Set(),
  stages: new Set(),
  risks: new Set(),
  hasFreeText: false,
  hasCriticalFlag: false,
  gamingFlagged: false,
  search: "",
});

const DATE_LABELS: Record<DateRangeKey, string> = {
  ALL: "All time",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  CUSTOM: "Custom",
};

const STAGES = [15, 30, 45, 60, 90, 180] as const;
const RISKS = ["HIGH", "MEDIUM", "LOW"] as const;

function MultiPopover<T extends string | number>({
  label, options, selected, onChange, format,
}: {
  label: string; options: readonly T[] | T[]; selected: Set<T>;
  onChange: (next: Set<T>) => void; format?: (v: T) => string;
}) {
  const summary = selected.size === 0
    ? `All`
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
        <button onClick={() => onChange(new Set())} className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-bold hover:bg-secondary">
          All {label.toLowerCase()}
        </button>
        <div className="max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.has(opt);
            return (
              <label key={String(opt)} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-secondary">
                <input
                  type="checkbox" checked={checked}
                  onChange={() => {
                    const next = new Set(selected);
                    if (checked) next.delete(opt); else next.add(opt);
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

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ResponsesFilterBar({
  filters, setFilters, branches, showSpecialToggles = true, showSearch = true,
}: {
  filters: ResponsesFilters;
  setFilters: (f: ResponsesFilters) => void;
  branches: string[];
  showSpecialToggles?: boolean;
  showSearch?: boolean;
}) {
  const [showCustom, setShowCustom] = useState(filters.dateRange === "CUSTOM");
  const reset = () => setFilters(emptyResponsesFilters());
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
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
        <MultiPopover label="Stage" options={STAGES as unknown as number[]} selected={filters.stages}
          onChange={(n) => setFilters({ ...filters, stages: n })} format={(s) => `Day ${s}`} />
        <MultiPopover label="Risk" options={RISKS as unknown as ("LOW"|"MEDIUM"|"HIGH")[]}
          selected={filters.risks} onChange={(n) => setFilters({ ...filters, risks: n })} />

        {showSpecialToggles && (
          <>
            <Pill active={filters.hasFreeText} onClick={() => setFilters({ ...filters, hasFreeText: !filters.hasFreeText })}>
              Has free-text
            </Pill>
            <Pill active={filters.hasCriticalFlag} onClick={() => setFilters({ ...filters, hasCriticalFlag: !filters.hasCriticalFlag })}>
              Has critical flag
            </Pill>
            <Pill active={filters.gamingFlagged} onClick={() => setFilters({ ...filters, gamingFlagged: !filters.gamingFlagged })}>
              Gaming flagged ⚡
            </Pill>
          </>
        )}

        {showSearch && (
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by trainee name or ID…"
            className="min-w-[200px] flex-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}

        <button onClick={reset} className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground">
          Reset all
        </button>
      </div>
    </div>
  );
}

export function responseMatchesAll(
  r: { submitted_at: string; risk_level: "LOW"|"MEDIUM"|"HIGH"; stage: string|number; free_text_response: string|null; critical_flags: string[]|null; gaming_flag: boolean },
  emp: { name: string; employee_code: string; branch: string },
  f: ResponsesFilters,
): boolean {
  if (f.risks.size > 0 && !f.risks.has(r.risk_level)) return false;
  if (f.stages.size > 0 && !f.stages.has(Number(r.stage))) return false;
  if (f.branches.size > 0 && !f.branches.has(emp.branch)) return false;
  if (f.hasFreeText && !(r.free_text_response && r.free_text_response.trim().length > 0)) return false;
  if (f.hasCriticalFlag && !(Array.isArray(r.critical_flags) && r.critical_flags.length > 0)) return false;
  if (f.gamingFlagged && !r.gaming_flag) return false;
  if (f.dateRange !== "ALL") {
    const submitted = new Date(r.submitted_at).getTime();
    let from: number | null = null, to: number | null = null;
    if (f.dateRange === "CUSTOM") {
      if (f.customFrom) from = new Date(f.customFrom).getTime();
      if (f.customTo) to = new Date(f.customTo).getTime() + 86400000;
    } else {
      from = Date.now() - Number(f.dateRange) * 86400000;
    }
    if (from !== null && submitted < from) return false;
    if (to !== null && submitted >= to) return false;
  }
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    if (!emp.name.toLowerCase().includes(q) && !emp.employee_code.toLowerCase().includes(q)) return false;
  }
  return true;
}

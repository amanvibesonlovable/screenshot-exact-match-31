import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DIM_COLORS, DIM_LABELS } from "@/hr/DashboardCharts";

export type DrillTrainee = {
  id: string;
  name: string;
  employee_code: string;
  branch: string;
  area_manager: string;
  stage: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_score: number;
  critical_flags: string[];
  scores: Record<string, number | null>;
  responses: Array<{
    question_id: string;
    question_text: string;
    answer_text: string;
    points?: number;
    dimension?: string;
    isCritical?: boolean;
  }>;
  free_text_response: string | null;
  gaming_flag: boolean;
};

export type DrillKind = "HIGH" | "MEDIUM" | "CRITICAL";

const KIND_TITLE: Record<DrillKind, string> = {
  HIGH: "High Risk Trainees",
  MEDIUM: "Medium Risk Trainees",
  CRITICAL: "Trainees with Critical Flags",
};

function riskBadgeCls(r: "LOW" | "MEDIUM" | "HIGH") {
  if (r === "HIGH") return "bg-destructive/15 text-destructive border-destructive/30";
  if (r === "MEDIUM") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
}

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function RiskDrillSheet({
  open,
  onOpenChange,
  kind,
  trainees,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: DrillKind | null;
  trainees: DrillTrainee[];
}) {
  const navigate = useNavigate();
  const title = kind ? KIND_TITLE[kind] : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-extrabold">
            {trainees.length} {title}
          </SheetTitle>
        </SheetHeader>

        {trainees.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No trainees match this filter right now. 🎉
          </p>
        ) : (
          <Accordion type="single" collapsible className="mt-4">
            {trainees.map((t) => (
              <AccordionItem key={t.id} value={t.id} className="rounded-xl border border-border/60 bg-card/60 mb-2 px-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-2 pr-2 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {t.employee_code} · {t.branch} · {t.area_manager}
                      </p>
                      {t.critical_flags.length > 0 && (
                        <p className="mt-1 truncate text-[11px] font-bold text-destructive">
                          🚨 {t.critical_flags[0]}
                          {t.critical_flags.length > 1 && ` +${t.critical_flags.length - 1} more`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskBadgeCls(t.risk_level)}`}>
                        {t.risk_level}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        Day {t.stage} · {t.final_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Dimension breakdown */}
                  <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-border/40 bg-background/50 p-3 sm:grid-cols-2">
                    {Object.keys(DIM_LABELS).map((k) => {
                      const v = t.scores?.[k];
                      if (v === null || v === undefined) return null;
                      return (
                        <MiniBar
                          key={k}
                          value={Number(v)}
                          max={k === "transition_readiness" ? 15 : 10}
                          color={DIM_COLORS[k]}
                          label={DIM_LABELS[k]}
                        />
                      );
                    })}
                  </div>

                  {/* Per-question responses */}
                  {t.responses.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Latest survey answers
                      </p>
                      {t.responses.map((r, i) => (
                        <div key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                          <p className="text-[11px] text-muted-foreground">{r.question_text}</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5">{r.answer_text}</span>
                            {r.isCritical && <span className="ml-2 text-destructive">🚨</span>}
                          </p>
                          {(r.points !== undefined || r.dimension) && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {r.dimension && r.dimension !== "none" && (
                                <span className="font-bold" style={{ color: DIM_COLORS[r.dimension] }}>
                                  {DIM_LABELS[r.dimension] ?? r.dimension}
                                </span>
                              )}
                              {r.points !== undefined && (
                                <span className="ml-2 tabular-nums">+{r.points} pts</span>
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Free text */}
                  {t.free_text_response && (
                    <blockquote className="mb-3 rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm italic text-foreground">
                      “{t.free_text_response}”
                    </blockquote>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/dashboard/trainees/${t.id}`);
                      }}
                      className="rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-soft"
                    >
                      View full profile →
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </SheetContent>
    </Sheet>
  );
}

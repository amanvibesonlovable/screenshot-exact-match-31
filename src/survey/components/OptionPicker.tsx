import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { BaseQuestion } from "../survey-config";

interface Props {
  question: BaseQuestion;
  onSubmit: (selectedIndices: number[]) => void;
}

export function OptionPicker({ question, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[]>([]);

  if (question.type === "single") {
    return (
      <div className="flex flex-wrap justify-end gap-2 pl-11 bubble-in">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSubmit([i])}
            className="group rounded-full border-2 border-primary/30 bg-card px-4 py-2.5 text-left text-[14px] font-medium text-foreground shadow-bubble transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft hover:shadow-soft active:translate-y-0"
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // multi-select
  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  return (
    <div className="space-y-3 pl-11 bubble-in">
      <div className="flex flex-col items-end gap-2">
        {question.options.map((opt, i) => {
          const isOn = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                "flex w-fit items-center gap-2.5 rounded-2xl border-2 px-4 py-2.5 text-left text-[14px] font-medium transition-all",
                isOn
                  ? "border-primary bg-primary-soft text-foreground shadow-soft"
                  : "border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary-soft/40",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {isOn && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          disabled={selected.length === 0}
          onClick={() => onSubmit(selected)}
          className="rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Done →
        </button>
      </div>
    </div>
  );
}

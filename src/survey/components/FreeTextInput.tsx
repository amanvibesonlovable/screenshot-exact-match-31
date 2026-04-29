import { useState } from "react";

interface Props {
  prompt: string;
  onSubmit: (text: string | null) => void;
}

export function FreeTextInput({ prompt, onSubmit }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3 pl-11 bubble-in">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Type freely..."
        aria-label={prompt}
        className="w-full resize-none rounded-2xl border-2 border-primary/30 bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-bubble outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onSubmit(null)}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Skip
        </button>
        <button
          onClick={() => onSubmit(text.trim() || null)}
          className="rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

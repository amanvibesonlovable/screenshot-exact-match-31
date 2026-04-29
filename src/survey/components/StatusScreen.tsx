import { Link } from "react-router-dom";

interface Props {
  emoji: string;
  title: string;
  message: string;
  hint?: string;
  showHome?: boolean;
}

export function StatusScreen({ emoji, title, message, hint, showHome }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-warm px-6 py-12 text-center">
      <div className="flex max-w-sm flex-col items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand text-4xl shadow-soft">
          {emoji}
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{message}</p>
        {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
        {showHome && (
          <Link
            to="/"
            className="mt-2 rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary-soft"
          >
            Back to home
          </Link>
        )}
      </div>
    </div>
  );
}

export function CompletionScreen({ name, message }: { name: string; message: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="check-pop flex h-24 w-24 items-center justify-center rounded-full bg-gradient-brand shadow-soft">
        <svg viewBox="0 0 52 52" className="h-14 w-14" fill="none">
          <path
            className="check-path"
            d="M14 27 L23 36 L40 18"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-extrabold text-foreground">All done, {name}!</h2>
      <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">You can close this window now ✨</p>
    </div>
  );
}

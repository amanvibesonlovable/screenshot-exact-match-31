export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden bg-muted">
      <div
        className="h-full bg-gradient-brand transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";

export function BotAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-base font-bold text-primary-foreground shadow-soft",
        className,
      )}
      aria-hidden
    >
      ✦
    </div>
  );
}

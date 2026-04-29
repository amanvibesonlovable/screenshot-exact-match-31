import { cn } from "@/lib/utils";
import { BotAvatar } from "./BotAvatar";

export function BotBubble({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="flex items-end gap-2 bubble-in">
      <BotAvatar />
      <div className="max-w-[85%] space-y-1">
        {label && (
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
        <div className="rounded-3xl rounded-bl-md bg-bot px-5 py-3 text-[15px] leading-relaxed text-bot-foreground shadow-bubble">
          {children}
        </div>
      </div>
    </div>
  );
}

export function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end bubble-in">
      <div
        className={cn(
          "max-w-[85%] rounded-3xl rounded-br-md bg-user px-5 py-3 text-[15px] leading-relaxed text-user-foreground shadow-soft",
        )}
      >
        {children}
      </div>
    </div>
  );
}

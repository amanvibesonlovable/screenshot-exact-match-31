import { BotAvatar } from "./BotAvatar";

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 bubble-in">
      <BotAvatar />
      <div className="rounded-3xl rounded-bl-md bg-bot px-5 py-3 shadow-bubble">
        <div className="flex items-center gap-1">
          <span className="typing-dot block h-2 w-2 rounded-full bg-muted-foreground/70" />
          <span className="typing-dot block h-2 w-2 rounded-full bg-muted-foreground/70" />
          <span className="typing-dot block h-2 w-2 rounded-full bg-muted-foreground/70" />
        </div>
      </div>
    </div>
  );
}

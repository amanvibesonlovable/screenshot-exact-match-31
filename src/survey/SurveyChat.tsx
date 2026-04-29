import { useEffect, useMemo, useRef, useState } from "react";
import type { BaseQuestion, SurveyConfig } from "./survey-config";
import { scoreSurvey, type RawAnswer, type ScoredSurvey } from "./scoring";
import { BotBubble, UserBubble } from "./components/Bubbles";
import { TypingIndicator } from "./components/TypingIndicator";
import { OptionPicker } from "./components/OptionPicker";
import { FreeTextInput } from "./components/FreeTextInput";
import { ProgressBar } from "./components/ProgressBar";
import { CompletionScreen } from "./components/CompletionScreen";

type ChatItem =
  | { kind: "bot-text"; id: string; label?: string; text: string }
  | { kind: "user-text"; id: string; text: string }
  | { kind: "question"; id: string; question: BaseQuestion }
  | { kind: "free-text"; id: string; prompt: string }
  | { kind: "typing"; id: string };

interface Props {
  config: SurveyConfig;
  traineeName: string;
  onComplete?: (result: ScoredSurvey & { free_text_response: string | null; completion_time_seconds: number }) => void;
}

const TYPING_MS = 1100;

export function SurveyChat({ config, traineeName, onComplete }: Props) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [answers, setAnswers] = useState<RawAnswer[]>([]);
  const [done, setDone] = useState<ScoredSurvey | null>(null);

  // Build the static question queue + a slot for dynamic insertions
  const staticQuestions = useMemo(
    () => config.questions.filter((q) => q.kind === "static"),
    [config],
  );
  const totalSteps = staticQuestions.length + 1; // +1 for free-text

  const queueRef = useRef<BaseQuestion[]>([...staticQuestions]);
  const stepRef = useRef(0); // completed static questions count (for progress)
  const startTimeRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  // Format opening with name
  const opening = config.openingMessage.replace("[Name]", traineeName);

  // Auto-scroll on every change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items]);

  // Boot the conversation
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void runBoot();
    async function runBoot() {
      await pushTyping();
      pushItem({ kind: "bot-text", id: "opening", text: opening });
      await wait(500);
      await askNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushItem(item: ChatItem) {
    setItems((prev) => [...prev, item]);
  }

  function wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  async function pushTyping() {
    const id = `typing-${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { kind: "typing", id }]);
    await wait(TYPING_MS);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function askNext() {
    const next = queueRef.current.shift();
    if (!next) {
      // Free-text final
      await pushTyping();
      pushItem({
        kind: "bot-text",
        id: "free-prompt",
        label: "One last thing",
        text: config.freeTextPrompt,
      });
      pushItem({ kind: "free-text", id: "free-text", prompt: config.freeTextPrompt });
      return;
    }
    await pushTyping();
    pushItem({ kind: "bot-text", id: `${next.id}-prompt`, label: next.botLabel, text: next.prompt });
    pushItem({ kind: "question", id: next.id, question: next });

    // Start the timer when the FIRST question is shown
    if (startTimeRef.current === null) startTimeRef.current = Date.now();
  }

  async function handleAnswer(question: BaseQuestion, selected: number[]) {
    // Replace the question item with the user's answer bubble
    const labels = selected.map((i) => question.options[i]?.label).filter(Boolean);
    const userText = labels.join(" • ");

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.kind === "question" && x.id === question.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, { kind: "user-text", id: `${question.id}-ans`, text: userText });
      return next;
    });

    // Save answer
    setAnswers((a) => [...a, { question_id: question.id, selected }]);

    // Branching: if static + branch, queue dynamic follow-up at FRONT of queue
    if (question.kind === "static" && question.branch && question.type === "single") {
      const idx = selected[0] ?? 0;
      if (idx >= (question.branch.minIndex ?? 0)) {
        const dyn = config.questions.find((q) => q.id === question.branch!.showQuestionId);
        if (dyn) queueRef.current.unshift(dyn);
      }
    }

    if (question.kind === "static") stepRef.current += 1;

    await wait(450);
    await askNext();
  }

  async function handleFreeText(text: string | null) {
    // Replace input with user's bubble (or a soft "skipped" line)
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.kind === "free-text");
      if (idx === -1) return prev;
      const next = [...prev];
      if (text) {
        next.splice(idx, 1, { kind: "user-text", id: "free-ans", text });
      } else {
        next.splice(idx, 1, { kind: "user-text", id: "free-ans", text: "(skipped)" });
      }
      return next;
    });

    stepRef.current += 1;

    await pushTyping();
    pushItem({
      kind: "bot-text",
      id: "closing",
      text: config.closingMessage.replace("[Name]", traineeName),
    });

    const completionTimeSeconds = Math.max(
      1,
      Math.round(((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)),
    );
    const result = scoreSurvey(config, answers, completionTimeSeconds);
    await wait(900);
    setDone(result);
    onComplete?.({ ...result, free_text_response: text, completion_time_seconds: completionTimeSeconds });
  }

  // Progress: each completed static q + free-text contributes
  const progress = Math.min(100, Math.round((stepRef.current / totalSteps) * 100));

  if (done) {
    return (
      <div className="min-h-dvh bg-gradient-warm">
        <CompletionScreen name={traineeName} message={config.closingMessage.replace("[Name]", traineeName)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[440px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Confidential Check-in
            </h1>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {config.title}
          </span>
        </div>
        <ProgressBar value={progress} />
      </header>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <main className="mx-auto flex max-w-[440px] flex-col gap-3 px-4 py-5 pb-32">
          {items.map((item) => {
            switch (item.kind) {
              case "bot-text":
                return (
                  <BotBubble key={item.id} label={item.label}>
                    {item.text}
                  </BotBubble>
                );
              case "user-text":
                return <UserBubble key={item.id}>{item.text}</UserBubble>;
              case "typing":
                return <TypingIndicator key={item.id} />;
              case "question":
                return (
                  <OptionPicker
                    key={item.id}
                    question={item.question}
                    onSubmit={(sel) => handleAnswer(item.question, sel)}
                  />
                );
              case "free-text":
                return (
                  <FreeTextInput key={item.id} prompt={item.prompt} onSubmit={handleFreeText} />
                );
            }
          })}
        </main>
      </div>
    </div>
  );
}

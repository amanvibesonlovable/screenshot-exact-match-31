import { Link } from "react-router-dom";
import { MessageSquare, TrendingUp, ShieldCheck, Upload, MessagesSquare, BarChart3, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <main className="min-h-dvh bg-background">
      {/* Top nav */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              P
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Pulse</span>
          </Link>
          <Link
            to="/auth"
            className="rounded-md border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            HR Sign In
          </Link>
        </div>
      </nav>

      {/* Hero with subtle radial gradient bg */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #EDEDFF 0%, #F5F5FF 35%, hsl(var(--background)) 75%)",
        }}
      >
        {/* faint dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-8 text-center sm:pt-14 sm:pb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Early-warning system for Sales Trainees
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Hear your trainees before they leave.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Pulse runs friendly, confidential check-ins with every trainee at six milestones — then
            surfaces who's struggling so HR can step in early.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2.5">
            <Link
              to="/s/demo-token"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(244_75%_52%)]"
            >
              Try the trainee experience →
            </Link>
            <p className="text-xs text-muted-foreground">
              Demo:{" "}
              <Link to="/s/demo-token" className="font-medium text-primary underline-offset-2 hover:underline">
                Day 15 check-in
              </Link>{" "}
              ·{" "}
              <Link to="/auth" className="font-medium text-primary underline-offset-2 hover:underline">
                HR dashboard
              </Link>
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-2 gap-6 border-y border-border/60 py-5 sm:grid-cols-4">
            {[
              { n: "6", l: "Check-in milestones" },
              { n: "5", l: "Risk dimensions" },
              { n: "<2 min", l: "Per check-in" },
              { n: "100%", l: "Confidential" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-bold text-foreground sm:text-3xl">{s.n}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1 */}
          <div className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <MessageSquare size={18} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">Conversational</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Feels like chatting with a friend, not filling a form. Trainees respond with taps — no typing needed.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-2.5 py-1 text-[11px] text-foreground">
                How's training going?
              </div>
              <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-2.5 py-1 text-[11px] text-primary-foreground">
                Pretty good 👍
              </div>
              <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-secondary px-2.5 py-1 text-[11px] text-foreground">
                What's the hardest part?
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <TrendingUp size={18} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">Smart Scoring</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Every response is scored across 5 risk dimensions with dynamic follow-ups that dig deeper when it matters.
            </p>
            <div className="mt-4 space-y-1.5">
              {[
                { l: "Training", w: "75%", c: "bg-primary" },
                { l: "Attrition", w: "40%", c: "bg-[#F59E0B]" },
                { l: "Support", w: "60%", c: "bg-primary" },
                { l: "Wellbeing", w: "85%", c: "bg-success" },
                { l: "Readiness", w: "55%", c: "bg-primary" },
              ].map((b) => (
                <div key={b.l} className="flex items-center gap-2">
                  <span className="w-14 text-[10px] uppercase text-muted-foreground">{b.l}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full ${b.c}`} style={{ width: b.w }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
              <ShieldCheck size={18} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">Confidential</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              No login required. Managers never see individual answers. Trainees know their honesty is protected.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-[11px] font-medium text-foreground">Encrypted · Anonymous to managers</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            How it works
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-2">
            {[
              { icon: Upload, title: "Upload", body: "Upload your trainee roster as CSV." },
              { icon: MessagesSquare, title: "Trainees", body: "Get a friendly chat check-in at each milestone." },
              { icon: BarChart3, title: "HR Acts", body: "On risk-scored insights from the dashboard." },
            ].map((s, i) => (
              <div key={s.title} className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
                    <s.icon size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Step {i + 1}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                    <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </div>
                {i < 2 && (
                  <ArrowRight className="mx-auto mt-3 hidden h-4 w-4 shrink-0 text-muted-foreground sm:mt-4 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row">
          <span>Pulse — Built for HR teams that care about trainee success</span>
          <span>Confidential & Secure</span>
        </div>
      </footer>
    </main>
  );
};

export default Index;

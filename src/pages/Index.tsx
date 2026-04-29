import { Link } from "react-router-dom";
import { MessageSquare, Gauge, ShieldCheck } from "lucide-react";

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

      {/* Hero */}
      <section className="bg-card">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Early-warning system for Sales Trainees
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Hear your trainees before they leave.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Pulse runs friendly, confidential check-ins with every trainee at six milestones — then
            surfaces who's struggling so HR can step in early.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Link
              to="/s/demo-token"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(244_75%_52%)]"
            >
              Try the trainee experience →
            </Link>
            <p className="text-xs text-muted-foreground">
              Demo: <Link to="/s/demo-token" className="underline-offset-2 hover:underline">Day 15 check-in</Link> ·{" "}
              <Link to="/auth" className="underline-offset-2 hover:underline">HR dashboard</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: MessageSquare, title: "Conversational", body: "Feels like a chat, not a form." },
            { icon: Gauge, title: "Risk-scored", body: "Five dimensions, six milestones." },
            { icon: ShieldCheck, title: "Confidential", body: "Managers never see individual answers." },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-md border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon size={18} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;

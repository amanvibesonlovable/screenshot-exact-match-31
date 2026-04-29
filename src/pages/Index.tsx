import { Link } from "react-router-dom";

const Index = () => {
  return (
    <main className="min-h-dvh bg-gradient-warm">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-2xl font-extrabold text-primary-foreground shadow-soft">
            ✦
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">Pulse</span>
        </div>

        <header className="space-y-4">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Early warning &amp; training effectiveness for your sales trainees.
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Confidential, conversational check-ins at every milestone. So HR can support
            trainees before it's too late.
          </p>
        </header>

        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
          <Link
            to="/s/demo-token"
            className="rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5"
          >
            Preview the Day 15 check-in →
          </Link>
          <span className="text-xs text-muted-foreground">
            HR dashboard coming next
          </span>
        </div>

        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "Conversational", body: "Feels like chatting with a friend, not filling a form." },
            { title: "Smart scoring", body: "5 risk dimensions with branching follow-ups." },
            { title: "Confidential", body: "Trainees know managers can't see their answers." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-border/60 bg-card/70 p-5 text-left shadow-bubble backdrop-blur"
            >
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Index;

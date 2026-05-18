import { Link } from "react-router-dom";
import { Rocket, ArrowLeft } from "lucide-react";
import RequireAdmin from "@/hr/RequireAdmin";

export default function AscentPlaceholder({ title }: { title: string }) {
  return (
    <RequireAdmin>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Back to program chooser
          </Link>
          <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#CCFBF1", color: "#0F766E" }}
            >
              <Rocket size={26} />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Coming soon — this tab will be built in the next update.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} />
              Ascent 2026 — under construction
            </div>
          </div>
        </div>
      </main>
    </RequireAdmin>
  );
}

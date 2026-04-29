import { Navigate } from "react-router-dom";
import { useHrAuth } from "./useHrAuth";

export default function RequireHr({ children }: { children: React.ReactNode }) {
  const { loading, user } = useHrAuth();
  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-gradient-warm">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

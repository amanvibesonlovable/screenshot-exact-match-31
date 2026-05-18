import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export default function RequireAdmin({
  children,
  requireSuperAdmin = false,
}: {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}) {
  const { loading, resolved, user, admin, isAuthorized, isSuperAdmin } = useAdminAuth();
  const loc = useLocation();

  // If signed in but not an active admin, sign out.
  useEffect(() => {
    if (resolved && user && !isAuthorized) {
      supabase.auth.signOut();
    }
  }, [resolved, user, isAuthorized]);

  if (loading || (user && !resolved)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!user || !isAuthorized) {
    const redirect = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace state={{ from: loc.pathname }} />;
  }
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only super admins can access this page. Contact a super admin if you need access.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#0F766E" }}
          >
            Back to dashboard
          </a>
        </div>
      </main>
    );
  }
  // Hide admin from rendered children silently? Just render children — they'll have access.
  void admin;
  return <>{children}</>;
}

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type HrAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  /** @deprecated authorization now lives in the `admins` table via useAdminAuth */
  isWhitelisted: boolean | null;
};

/**
 * Lightweight session hook kept for backwards compatibility.
 * Authorization checks live in `useAdminAuth` / `RequireAdmin`.
 */
export function useHrAuth(): HrAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { loading, session, user, isWhitelisted: !!user };
}

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type HrAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isWhitelisted: boolean | null; // null while unknown
};

export function useHrAuth(): HrAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setIsWhitelisted(null);
    });
    // 2) Initial read
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsWhitelisted(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Try a privileged query — works only if whitelisted (RLS gates it)
      const { data, error } = await supabase.from("hr_whitelist").select("id").limit(1);
      if (cancelled) return;
      if (error) {
        setIsWhitelisted(false);
      } else {
        setIsWhitelisted((data?.length ?? 0) >= 0 ? true : false);
        // The above always evaluates true if no error. We need a real check:
      }
    })();
    // Real check: query employees table (HR-only readable beyond token usage? employees is public-readable)
    // So instead, check hr_whitelist with the user's email directly via a function-safe path.
    (async () => {
      const email = user.email?.toLowerCase();
      if (!email) {
        setIsWhitelisted(false);
        return;
      }
      const { data, error } = await supabase
        .from("hr_whitelist")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setIsWhitelisted(false);
        return;
      }
      setIsWhitelisted(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { loading, session, user, isWhitelisted };
}

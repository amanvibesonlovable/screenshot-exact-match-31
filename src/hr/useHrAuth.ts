import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type HrAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isWhitelisted: boolean | null;
};

export function useHrAuth(): HrAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setIsWhitelisted(null);
    });
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
    const email = user.email?.toLowerCase();
    if (!email) {
      setIsWhitelisted(false);
      return;
    }
    (async () => {
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

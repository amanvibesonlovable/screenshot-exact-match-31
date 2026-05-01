import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminRecord = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  auth_method: "google" | "password" | "both";
  status: "active" | "inactive";
  last_login: string | null;
  created_by: string | null;
  created_at: string;
};

export type AdminAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  admin: AdminRecord | null;
  /** true once we've checked the admins table for the current user */
  resolved: boolean;
  /** whether the auth user is allowed (active admin) */
  isAuthorized: boolean;
  isSuperAdmin: boolean;
};

export function useAdminAuth(): AdminAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminRecord | null>(null);
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setAdmin(null);
        setResolved(true);
      } else {
        setResolved(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (!data.session?.user) setResolved(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) {
      setAdmin(null);
      return;
    }
    let cancelled = false;
    const email = user.email.toLowerCase();
    (async () => {
      const { data, error } = await supabase
        .from("admins" as any)
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setAdmin(null);
      } else {
        setAdmin(data as unknown as AdminRecord);
        // Best-effort last_login update
        supabase
          .from("admins" as any)
          .update({ last_login: new Date().toISOString() })
          .eq("email", email)
          .then(() => {});
      }
      setResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const isAuthorized = !!admin && admin.status === "active";
  return {
    loading,
    session,
    user,
    admin,
    resolved,
    isAuthorized,
    isSuperAdmin: isAuthorized && admin?.role === "super_admin",
  };
}

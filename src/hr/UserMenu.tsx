import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "./useAdminAuth";
import { Shield, LogOut, ChevronDown } from "lucide-react";

export function UserMenu() {
  const { admin, user, isSuperAdmin } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const name = admin?.name || user?.email?.split("@")[0] || "User";
  const initial = (name[0] || "U").toUpperCase();
  const email = admin?.email || user?.email || "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold hover:bg-secondary"
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold text-white"
          style={{ background: "#0F766E" }}
        >
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{name}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-semibold text-foreground">{email}</p>
            {admin?.role === "super_admin" && (
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "#0F766E" }}
              >
                SUPER ADMIN
              </span>
            )}
          </div>
          {isSuperAdmin && (
            <Link
              to="/dashboard/admin-management"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary"
            >
              <Shield size={14} /> Admin Management
            </Link>
          )}
          <button
            onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2 text-sm text-destructive hover:bg-secondary"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

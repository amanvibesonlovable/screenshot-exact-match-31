import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  ListChecks,
  Upload,
  MapPin,
  FileText,
  Shield,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CandorLogo } from "@/components/CandorLogo";
import { useAdminAuth } from "@/hr/useAdminAuth";

type Item = {
  label: string;
  to: string;
  icon: React.ReactNode;
  match: (pathname: string, search: string) => boolean;
  superOnly?: boolean;
};

type Group = { label: string; items: Item[] };

const has = (p: string) => (path: string, _s: string) => path.startsWith(p);
const dashTab = (tab: string) => (path: string, search: string) => {
  if (path !== "/dashboard") return false;
  const t = new URLSearchParams(search).get("tab") || "overview";
  return t === tab;
};

const GROUPS: Group[] = [
  {
    label: "Monitor",
    items: [
      { label: "Overview", to: "/dashboard?tab=overview", icon: <LayoutDashboard size={15} />, match: dashTab("overview") },
      { label: "Trainees", to: "/dashboard?tab=trainees", icon: <Users size={15} />, match: dashTab("trainees") },
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "Analytics", to: "/dashboard/analytics", icon: <TrendingUp size={15} />, match: has("/dashboard/analytics") },
      { label: "Branches", to: "/dashboard/branches", icon: <MapPin size={15} />, match: has("/dashboard/branches") },
    ],
  },
  {
    label: "Act",
    items: [
      { label: "Responses", to: "/dashboard/responses", icon: <MessageSquare size={15} />, match: has("/dashboard/responses") },
      { label: "Actions", to: "/dashboard/actions", icon: <CheckCircle2 size={15} />, match: has("/dashboard/actions") },
      { label: "Reports", to: "/dashboard/reports", icon: <FileText size={15} />, match: has("/dashboard/reports") },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Scoring Framework", to: "/dashboard/scoring", icon: <ListChecks size={15} />, match: has("/dashboard/scoring") },
      { label: "Upload", to: "/dashboard?tab=upload", icon: <Upload size={15} />, match: dashTab("upload") },
      { label: "Admin Management", to: "/dashboard/admin-management", icon: <Shield size={15} />, match: has("/dashboard/admin-management"), superOnly: true },
    ],
  },
];

export function DashboardSidebar() {
  const loc = useLocation();
  const { isSuperAdmin } = useAdminAuth();
  return (
    <aside
      className="hidden shrink-0 self-start rounded-xl md:flex md:flex-col"
      style={{ width: 220, background: "#0C4A42", minHeight: "calc(100vh - 3rem)" }}
    >
      <nav className="sticky top-6 flex-1 space-y-1 px-3 py-4">
        {GROUPS.map((g, gi) => {
          const visibleItems = g.items.filter((it) => !it.superOnly || isSuperAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={g.label} className={gi > 0 ? "pt-4" : ""}>
              <p
                className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#9CA3AF" }}
              >
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = item.match(loc.pathname, loc.search);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                          active
                            ? "font-semibold text-white"
                            : "text-[#E2E8F0] hover:bg-white/10 hover:text-white"
                        }`}
                        style={active ? { background: "#14B8A6" } : undefined}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link
          to="/ascent"
          className="flex items-center gap-2 text-[12px] text-[#94A3B8] transition-colors hover:text-white"
        >
          <span>Switch to Ascent 2026 →</span>
        </Link>
      </div>
    </aside>
  );
}

export function MobileSectionNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const flat: Item[] = GROUPS.flatMap((g) => g.items).filter(
    (it) => !it.superOnly || isSuperAdmin,
  );
  const current = flat.find((it) => it.match(loc.pathname, loc.search)) ?? flat[0];

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
        aria-label="Dashboard section"
      >
        <Menu size={14} />
        <span className="max-w-[140px] truncate">{current?.label ?? "Section"}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          role="menu"
        >
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dashboard section
          </p>
          <ul className="max-h-[70vh] overflow-y-auto p-1">
            {GROUPS.map((g) => {
              const items = g.items.filter((it) => !it.superOnly || isSuperAdmin);
              if (!items.length) return null;
              return (
                <li key={g.label} className="py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {g.label}
                  </p>
                  <ul>
                    {items.map((it) => {
                      const active = it.match(loc.pathname, loc.search);
                      return (
                        <li key={it.to}>
                          <button
                            onClick={() => {
                              setOpen(false);
                              navigate(it.to);
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                              active
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            {it.icon}
                            <span>{it.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DashboardHeader({
  rightSlot,
}: {
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <CandorLogo size={32} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>Candor · HR</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">Early warning &amp; training effectiveness</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <MobileSectionNav />
          <div className="flex items-center gap-2">{rightSlot}</div>
        </div>
      </div>
    </header>
  );
}

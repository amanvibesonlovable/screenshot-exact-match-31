import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { PulseLogo } from "@/components/PulseLogo";

type Item = {
  label: string;
  to: string;
  icon: React.ReactNode;
  /** match function for active state */
  match: (pathname: string, search: string) => boolean;
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
    ],
  },
];

export function DashboardSidebar() {
  const loc = useLocation();
  return (
    <aside className="hidden w-52 shrink-0 md:block">
      <nav className="sticky top-6 space-y-4">
        {GROUPS.map((g, gi) => (
          <div key={g.label}>
            {gi > 0 && <div className="mb-3 h-px bg-border/60" />}
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.match(loc.pathname, loc.search);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function DashboardHeader({
  rightSlot,
}: {
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <PulseLogo size={32} />
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">Pulse · HR</p>
            <p className="text-[11px] text-muted-foreground">Early warning &amp; training effectiveness</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}

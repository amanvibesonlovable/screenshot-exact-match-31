import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MapPin,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  FileText,
  ListChecks,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { CandorLogo } from "@/components/CandorLogo";
import { UserMenu } from "@/hr/UserMenu";

type Item = { label: string; to: string; icon: React.ReactNode };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Monitor",
    items: [
      { label: "Overview", to: "/ascent", icon: <LayoutDashboard size={15} /> },
      { label: "Interns", to: "/ascent/interns", icon: <Users size={15} /> },
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "Analytics", to: "/ascent/analytics", icon: <TrendingUp size={15} /> },
      { label: "Branches", to: "/ascent/branches", icon: <MapPin size={15} /> },
    ],
  },
  {
    label: "Track",
    items: [
      { label: "PPO Tracker", to: "/ascent/ppo-tracker", icon: <Briefcase size={15} /> },
      { label: "Responses", to: "/ascent/responses", icon: <MessageSquare size={15} /> },
    ],
  },
  {
    label: "Act",
    items: [
      { label: "Actions", to: "/ascent/actions", icon: <CheckCircle2 size={15} /> },
      { label: "Reports", to: "/ascent/reports", icon: <FileText size={15} /> },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Scoring Framework", to: "/ascent/scoring", icon: <ListChecks size={15} /> },
      { label: "Upload", to: "/ascent/upload", icon: <Upload size={15} /> },
    ],
  },
];

export function AscentSidebar() {
  const loc = useLocation();
  const isActive = (to: string) =>
    to === "/ascent" ? loc.pathname === "/ascent" : loc.pathname === to || loc.pathname.startsWith(to + "/");

  return (
    <aside
      className="hidden shrink-0 self-start rounded-xl md:flex md:flex-col"
      style={{ width: 220, background: "#0C4A42", minHeight: "calc(100vh - 3rem)" }}
    >
      <div className="px-4 py-5">
        <Link to="/ascent" className="flex items-center gap-2">
          <CandorLogo size={28} />
          <span className="text-base font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
            Candor
          </span>
        </Link>
        <p
          className="mt-2 font-semibold uppercase"
          style={{ color: "#14B8A6", fontSize: 11, letterSpacing: "0.1em" }}
        >
          Ascent 2026
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-3">
        {GROUPS.map((g, gi) => (
          <div key={g.label} className={gi > 0 ? "pt-3" : ""}>
            <p
              className="mb-1.5 px-3 text-[11px] font-semibold uppercase"
              style={{ color: "#94A3B8", letterSpacing: "0.1em" }}
            >
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/ascent"}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                        active ? "font-semibold text-white" : "text-[#E2E8F0] hover:bg-white/10 hover:text-white"
                      }`}
                      style={active ? { background: "#14B8A6" } : undefined}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-[12px] text-[#94A3B8] transition-colors hover:text-white"
        >
          <ArrowLeft size={12} />
          Switch to STR Program
        </Link>
      </div>
    </aside>
  );
}

export function AscentHeader({ title, rightSlot }: { title: string; rightSlot?: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/ascent" className="flex items-center gap-2.5 md:hidden">
            <CandorLogo size={28} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
              {title}
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              <span className="font-semibold" style={{ color: "#0F766E" }}>Ascent 2026</span> · Intern program insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

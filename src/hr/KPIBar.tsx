import { ChevronRight } from "lucide-react";

type Metric = {
  key: string;
  label: string;
  value: string | number;
  valueColor?: string; // hex
  context?: string;
  subContext?: string; // optional second context line (cell 1)
  onClick?: () => void;
  hoverTint?: string; // bg hex on hover for clickable cells
  pulse?: boolean; // critical flags red dot
  flex?: number;
};

export function KPIBar({ metrics }: { metrics: Metric[] }) {
  return (
    <div
      className="flex w-full overflow-x-auto rounded-2xl border bg-white"
      style={{
        borderColor: "#F1F5F9",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      {metrics.map((m, i) => {
        const isClickable = !!m.onClick;
        const isLast = i === metrics.length - 1;
        return (
          <div
            key={m.key}
            onClick={m.onClick}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                m.onClick?.();
              }
            }}
            className={`group relative flex min-w-[180px] flex-col justify-center px-7 py-6 transition-colors duration-150 ${
              isClickable ? "cursor-pointer" : ""
            }`}
            style={{
              flex: m.flex ?? 1,
              borderRight: isLast ? undefined : "1px solid #F1F5F9",
            }}
            onMouseEnter={(e) => {
              if (isClickable && m.hoverTint) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = m.hoverTint;
              }
            }}
            onMouseLeave={(e) => {
              if (isClickable) (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
            }}
          >
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: "#94A3B8", letterSpacing: "0.08em" }}
            >
              {m.label}
            </p>
            <div className="mt-2 flex items-center">
              <span
                className="text-[32px] font-bold leading-[1.2]"
                style={{
                  color: m.valueColor ?? "#0F172A",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {m.value}
              </span>
              {m.pulse && (
                <span
                  className="ml-1.5 inline-block h-[5px] w-[5px] rounded-full align-middle"
                  style={{
                    background: "#DC2626",
                    animation: "subtle-kpi-pulse 2.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>
            {m.context && (
              <p className="mt-1 text-[13px]" style={{ color: "#94A3B8" }}>
                {m.context}
              </p>
            )}
            {m.subContext && (
              <p
                className="mt-0.5 truncate text-[12px]"
                style={{ color: "#CBD5E1" }}
                title={m.subContext}
              >
                {m.subContext}
              </p>
            )}
            {isClickable && (
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ color: "#94A3B8" }}
                aria-hidden
              >
                ›
              </span>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes subtle-kpi-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

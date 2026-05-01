type Props = {
  size?: number;
  /** Background fill of the rounded square */
  bg?: string;
  /** Stroke color of the C curve */
  fg?: string;
  /** Color of the small "spark" dot */
  accent?: string;
  /** Render without the rounded background (just the C + dot) */
  bare?: boolean;
  className?: string;
};

/**
 * Candor logo: a rounded teal square containing a stylized open quote / "C"
 * curve and a small amber "spark of candor" dot. Scales cleanly from favicon
 * to nav.
 */
export function CandorLogo({
  size = 32,
  bg = "#0F766E",
  fg = "#FFFFFF",
  accent = "#F59E0B",
  bare = false,
  className,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Candor logo"
      role="img"
    >
      {!bare && <rect x="0" y="0" width="40" height="40" rx="10" fill={bg} />}
      {/* C-curve / open quote */}
      <path
        d="M20 10 C12 10, 8 16, 8 22 C8 28, 12 32, 18 32"
        stroke={fg}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      {/* Spark of candor */}
      <circle cx="26" cy="12" r="3" fill={accent} />
    </svg>
  );
}

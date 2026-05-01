type Props = {
  size?: number;
  bg?: string;
  fg?: string;
  className?: string;
};

/**
 * Pulse logo: rounded indigo square with a white "P" and a subtle EKG/pulse
 * line running across the lower portion. Scales cleanly from favicon to nav.
 */
export function PulseLogo({
  size = 32,
  bg = "#4F46E5",
  fg = "#FFFFFF",
  className,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pulse logo"
      role="img"
    >
      <circle cx="20" cy="20" r="20" fill={bg} />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={700}
        fontSize={18}
        fill={fg}
      >
        P
      </text>
      <polyline
        points="6,30 12,30 14,25 16,33 18,28 20,30 34,30"
        fill="none"
        stroke={fg}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}

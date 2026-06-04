type Props = {
  size?: number;
  className?: string;
  /** "light" for white strokes (on colored bg), "dark" for primary strokes (on light bg) */
  tone?: "light" | "dark";
};

/**
 * SST Pro — custom monogram logo.
 * Hard hat silhouette over a shield, with subtle "pulse" line evoking safety + vitals.
 * Pure SVG, no external deps.
 */
export function BrandLogo({ size = 40, className, tone = "dark" }: Props) {
  const stroke = tone === "light" ? "white" : "currentColor";
  const fill = tone === "light" ? "rgba(255,255,255,0.12)" : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SST Pro"
    >
      {/* Shield */}
      <path
        d="M32 4 L56 12 V30 C56 45 45.5 55 32 60 C18.5 55 8 45 8 30 V12 Z"
        fill={fill}
        fillOpacity={tone === "light" ? 1 : 0.08}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Hard hat dome */}
      <path
        d="M20 34 C20 26 25 21 32 21 C39 21 44 26 44 34"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Hat brim */}
      <path
        d="M16 34 H48"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Hat ridge */}
      <path
        d="M32 21 V16"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Pulse line (safety + vitals) */}
      <path
        d="M18 44 H26 L29 40 L33 48 L37 42 L40 44 H46"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

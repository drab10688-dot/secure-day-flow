type Props = { size?: number; className?: string };

/**
 * Animated SST worker: hard hat + body, with a waving arm and a subtle
 * "pulse" safety vest highlight. Pure SVG + CSS keyframes (defined in styles.css).
 */
export function WorkerAnimation({ size = 220, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* ground shadow */}
      <ellipse cx="100" cy="225" rx="55" ry="6" fill="black" fillOpacity="0.15">
        <animate attributeName="rx" values="55;48;55" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.10;0.18" dur="2.4s" repeatCount="indefinite" />
      </ellipse>

      {/* body group with gentle bob */}
      <g className="worker-bob">
        {/* legs */}
        <rect x="82" y="170" width="14" height="48" rx="4" fill="#1f2937" />
        <rect x="104" y="170" width="14" height="48" rx="4" fill="#1f2937" />
        {/* boots */}
        <rect x="78" y="214" width="22" height="10" rx="3" fill="#0f172a" />
        <rect x="100" y="214" width="22" height="10" rx="3" fill="#0f172a" />

        {/* safety vest body */}
        <path
          d="M62 110 Q100 96 138 110 L134 178 Q100 188 66 178 Z"
          fill="#facc15"
          stroke="#1f2937"
          strokeWidth="2.5"
        />
        {/* reflective stripes */}
        <rect x="68" y="148" width="64" height="6" fill="white" fillOpacity="0.85" />
        <rect x="68" y="160" width="64" height="3" fill="#fff" fillOpacity="0.55">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* neck */}
        <rect x="92" y="86" width="16" height="14" fill="#f5d6b3" />

        {/* head */}
        <circle cx="100" cy="74" r="22" fill="#f5d6b3" stroke="#1f2937" strokeWidth="2" />
        {/* eyes */}
        <circle cx="93" cy="74" r="2" fill="#1f2937" />
        <circle cx="107" cy="74" r="2" fill="#1f2937" />
        {/* smile */}
        <path d="M93 82 Q100 87 107 82" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* hard hat */}
        <path
          d="M76 64 Q78 44 100 42 Q122 44 124 64 Z"
          fill="#ef4444"
          stroke="#1f2937"
          strokeWidth="2.5"
        />
        <rect x="74" y="62" width="52" height="6" rx="2" fill="#ef4444" stroke="#1f2937" strokeWidth="2.5" />
        <rect x="98" y="42" width="4" height="8" fill="#b91c1c" />

        {/* static left arm (down) */}
        <rect x="56" y="110" width="14" height="46" rx="5" fill="#facc15" stroke="#1f2937" strokeWidth="2" />
        <circle cx="63" cy="160" r="7" fill="#f5d6b3" stroke="#1f2937" strokeWidth="2" />

        {/* waving right arm — rotates around shoulder */}
        <g className="worker-wave" style={{ transformOrigin: "135px 116px" }}>
          <rect x="128" y="110" width="14" height="46" rx="5" fill="#facc15" stroke="#1f2937" strokeWidth="2" />
          <circle cx="135" cy="160" r="7" fill="#f5d6b3" stroke="#1f2937" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

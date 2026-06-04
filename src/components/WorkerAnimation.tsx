type Props = { size?: number; className?: string };

/**
 * Friendly SST worker: hard hat, safety vest, gloves, boots.
 * Raises right arm and waves the hand side-to-side. Body gently bobs.
 * All limbs anchored — never falls.
 */
export function WorkerAnimation({ size = 240, className }: Props) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 220 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* ground shadow */}
      <ellipse cx="110" cy="248" rx="58" ry="6" fill="black" fillOpacity="0.18">
        <animate attributeName="rx" values="58;50;58" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.22;0.12;0.22" dur="2.6s" repeatCount="indefinite" />
      </ellipse>

      {/* whole body — gentle bob */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -3; 0 0"
          dur="2.6s"
          repeatCount="indefinite"
        />

        {/* ===== Legs ===== */}
        {/* pants */}
        <rect x="86" y="178" width="16" height="58" rx="4" fill="#1e3a8a" />
        <rect x="118" y="178" width="16" height="58" rx="4" fill="#1e3a8a" />
        {/* knee highlight */}
        <rect x="86" y="206" width="16" height="2" fill="#1e40af" />
        <rect x="118" y="206" width="16" height="2" fill="#1e40af" />
        {/* boots */}
        <path d="M82 232 H106 V244 Q106 248 102 248 H82 Q78 248 78 244 Z" fill="#111827" />
        <path d="M114 232 H138 V244 Q138 248 134 248 H114 Q110 248 110 244 Z" fill="#111827" />
        {/* boot caps */}
        <rect x="78" y="240" width="28" height="4" rx="1" fill="#fbbf24" />
        <rect x="110" y="240" width="28" height="4" rx="1" fill="#fbbf24" />

        {/* ===== Torso / safety vest ===== */}
        {/* shirt underneath */}
        <path
          d="M76 118 Q110 108 144 118 L142 184 Q110 192 78 184 Z"
          fill="#1e3a8a"
        />
        {/* vest (yellow) */}
        <path
          d="M72 122 Q110 112 148 122 L146 188 Q110 196 74 188 Z"
          fill="#facc15"
          stroke="#1f2937"
          strokeWidth="2.5"
        />
        {/* vest opening */}
        <line x1="110" y1="112" x2="110" y2="192" stroke="#1f2937" strokeWidth="2" />
        {/* reflective stripes */}
        <rect x="76" y="156" width="68" height="6" fill="#f1f5f9" stroke="#1f2937" strokeWidth="1" />
        <rect x="76" y="170" width="68" height="4" fill="#f8fafc" opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* ===== Neck ===== */}
        <rect x="100" y="92" width="20" height="16" fill="#f5d0a9" />
        <rect x="100" y="106" width="20" height="3" fill="#e0b48a" />

        {/* ===== Head ===== */}
        <circle cx="110" cy="78" r="26" fill="#f5d0a9" stroke="#1f2937" strokeWidth="2.2" />
        {/* ears */}
        <ellipse cx="85" cy="80" rx="3" ry="5" fill="#e0b48a" />
        <ellipse cx="135" cy="80" rx="3" ry="5" fill="#e0b48a" />
        {/* eyebrows */}
        <rect x="96" y="72" width="8" height="2" rx="1" fill="#1f2937" />
        <rect x="116" y="72" width="8" height="2" rx="1" fill="#1f2937" />
        {/* eyes */}
        <circle cx="100" cy="80" r="2.2" fill="#1f2937" />
        <circle cx="120" cy="80" r="2.2" fill="#1f2937" />
        {/* smile */}
        <path d="M100 90 Q110 96 120 90" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* ===== Hard hat ===== */}
        {/* brim */}
        <ellipse cx="110" cy="62" rx="32" ry="5" fill="#ef4444" stroke="#1f2937" strokeWidth="2.2" />
        {/* dome */}
        <path
          d="M83 62 Q86 38 110 36 Q134 38 137 62 Z"
          fill="#ef4444"
          stroke="#1f2937"
          strokeWidth="2.2"
        />
        {/* ridge */}
        <path d="M110 36 V62" stroke="#b91c1c" strokeWidth="2" />
        {/* SST label on hat */}
        <rect x="98" y="48" width="24" height="9" rx="2" fill="white" />
        <text
          x="110"
          y="55.5"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="#10b981"
          fontFamily="Arial, sans-serif"
        >
          SST
        </text>

        {/* ===== Left arm (down at side) ===== */}
        <rect x="60" y="122" width="16" height="52" rx="6" fill="#facc15" stroke="#1f2937" strokeWidth="2" />
        <rect x="58" y="170" width="20" height="6" rx="2" fill="#1e3a8a" />
        {/* glove */}
        <circle cx="68" cy="182" r="9" fill="#1e3a8a" stroke="#1f2937" strokeWidth="2" />

        {/* ===== Right arm — RAISED & WAVING ===== */}
        {/* upper arm (fixed, going up from shoulder to elbow) */}
        <rect x="144" y="80" width="14" height="50" rx="6" fill="#facc15" stroke="#1f2937" strokeWidth="2" />
        {/* shoulder cap */}
        <circle cx="151" cy="124" r="9" fill="#facc15" stroke="#1f2937" strokeWidth="2" />

        {/* forearm + hand — pivots at elbow (151, 82) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-18 151 82; 18 151 82; -18 151 82"
            keyTimes="0;0.5;1"
            dur="1.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          />
          {/* forearm rect going UP from elbow */}
          <rect x="144" y="38" width="14" height="46" rx="6" fill="#facc15" stroke="#1f2937" strokeWidth="2" />
          {/* sleeve cuff */}
          <rect x="142" y="36" width="18" height="5" rx="2" fill="#1e3a8a" />
          {/* glove (hand) */}
          <circle cx="151" cy="28" r="10" fill="#1e3a8a" stroke="#1f2937" strokeWidth="2" />
          {/* finger lines */}
          <path d="M147 22 V20 M151 21 V19 M155 22 V20" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

type Props = { size?: number; className?: string };

/**
 * SST-themed animated illustration: a safety checklist (EPP inspection)
 * with items being checked off one by one, plus a pulsing safety shield.
 * No human figures — purely iconographic, on-brand, never looks "risky".
 */
export function WorkerAnimation({ size = 220, className }: Props) {
  const items = [0, 1, 2, 3];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* soft ground shadow */}
      <ellipse cx="110" cy="228" rx="70" ry="6" fill="black" fillOpacity="0.12" />

      {/* clipboard back */}
      <rect x="38" y="36" width="128" height="174" rx="10" fill="#1f2937" />
      {/* paper */}
      <rect x="46" y="46" width="112" height="156" rx="6" fill="#fafaf9" />
      {/* clip */}
      <rect x="86" y="28" width="32" height="18" rx="4" fill="#9ca3af" />
      <rect x="92" y="22" width="20" height="10" rx="3" fill="#d1d5db" />

      {/* header line on paper */}
      <rect x="56" y="58" width="60" height="6" rx="2" fill="#10b981" />
      <rect x="56" y="70" width="40" height="3" rx="1.5" fill="#cbd5e1" />

      {/* checklist items */}
      {items.map((i) => {
        const y = 92 + i * 26;
        const delay = i * 0.5;
        return (
          <g key={i}>
            {/* checkbox */}
            <rect
              x="56"
              y={y}
              width="14"
              height="14"
              rx="3"
              fill="white"
              stroke="#10b981"
              strokeWidth="2"
            />
            {/* check mark — drawn in */}
            <path
              d={`M${59} ${y + 7} L${62} ${y + 10} L${68} ${y + 4}`}
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="20"
              strokeDashoffset="20"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="20;20;0;0;20"
                keyTimes="0;0.2;0.4;0.9;1"
                dur="3.2s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </path>
            {/* label line */}
            <rect x="78" y={y + 3} width="64" height="4" rx="2" fill="#e5e7eb">
              <animate
                attributeName="fill"
                values="#e5e7eb;#e5e7eb;#a7f3d0;#a7f3d0;#e5e7eb"
                keyTimes="0;0.2;0.4;0.9;1"
                dur="3.2s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </rect>
            <rect x="78" y={y + 9} width="38" height="3" rx="1.5" fill="#f1f5f9" />
          </g>
        );
      })}

      {/* floating safety shield badge */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -6; 0 0"
          dur="3s"
          repeatCount="indefinite"
        />
        {/* pulse ring */}
        <circle cx="172" cy="62" r="26" fill="#10b981" fillOpacity="0.18">
          <animate attributeName="r" values="26;34;26" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.25;0;0.25" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="172" cy="62" r="22" fill="#10b981" />
        {/* shield */}
        <path
          d="M172 50 L184 54 V64 C184 72 178 78 172 80 C166 78 160 72 160 64 V54 Z"
          fill="white"
        />
        {/* check inside shield */}
        <path
          d="M166 64 L170 68 L178 60"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

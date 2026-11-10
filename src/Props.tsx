/** The knife: lying in the meadow to be picked up, and shown in the top bar while held. */
export function KnifeIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" role="img" aria-label="Knife">
      <g transform="rotate(-45 15 15)">
        {/* Blade */}
        <path d="M15 1 Q19.5 8 18.5 17 H11.5 Q10.5 8 15 1 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <path d="M15 3 V16" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Guard and handle */}
        <rect x="9" y="16.5" width="12" height="2.6" rx="1.3" fill="#475569" />
        <rect x="12.6" y="19" width="4.8" height="9.5" rx="2.2" fill="#92400e" stroke="#451a03" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** A small wooden signpost with an arrow, standing on the ground at `x`. */
export function Signpost({ x, label }: { x: number; label: string }) {
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x}px, 296px)` }}
      width="30"
      height="48"
      viewBox="0 0 30 48"
      role="img"
      aria-label={`Sign pointing ${label === '→' ? 'right' : 'left'}`}
    >
      <rect x="13" y="16" width="4" height="32" fill="#92400e" />
      <rect x="1" y="2" width="28" height="18" rx="3" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
      <text x="15" y="16" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#fffbeb">
        {label}
      </text>
    </svg>
  );
}

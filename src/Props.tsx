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

/** The fisher at the beach: stands on the sand at `x`, rod out over the water. */
export function Fisher({ x }: { x: number }) {
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x}px, 238px)` }}
      width="130"
      height="110"
      viewBox="0 0 130 110"
      overflow="visible"
      role="img"
      aria-label="Fisher"
    >
      {/* Fishing rod, line and float */}
      <path d="M58 68 L118 8" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M118 8 V96" stroke="#f1f5f9" strokeWidth="1" />
      <circle cx="118" cy="97" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
      {/* Boots and trousers */}
      <rect x="17" y="98" width="13" height="8" rx="3" fill="#1f2937" />
      <rect x="34" y="98" width="13" height="8" rx="3" fill="#1f2937" />
      <rect x="20" y="78" width="9" height="22" fill="#1e3a8a" />
      <rect x="35" y="78" width="9" height="22" fill="#1e3a8a" />
      {/* Raincoat */}
      <rect x="15" y="47" width="34" height="35" rx="9" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
      {/* Arm and hand holding the rod */}
      <path d="M42 58 L58 65" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
      <circle cx="59" cy="66" r="4" fill="#fcd9b6" stroke="#b45309" strokeWidth="0.8" />
      {/* Head, beard and eye */}
      <circle cx="32" cy="36" r="11" fill="#fcd9b6" stroke="#b45309" strokeWidth="0.8" />
      <path d="M21.5 38 Q32 58 42.5 38 Q32 46 21.5 38 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="37" cy="33.5" r="1.4" fill="#1f2937" />
      {/* Hat */}
      <path d="M20 29 Q32 10 44 29 Z" fill="#15803d" />
      <rect x="15" y="27" width="34" height="4.5" rx="2.2" fill="#166534" />
    </svg>
  );
}

/** The shark under the sea, 110×48, drawn facing left and mirrored when swimming right. */
export function Shark({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-dir})` }}
      width="110"
      height="48"
      viewBox="0 0 110 48"
      overflow="visible"
      role="img"
      aria-label="Shark"
    >
      {/* Tail */}
      <path d="M84 24 L108 4 Q101 24 108 44 Z" fill="#64748b" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Back fin */}
      <path d="M44 10 L58 -8 Q60 4 68 11 Z" fill="#64748b" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Body */}
      <path
        d="M2 26 Q18 6 52 8 Q78 10 92 24 Q78 40 50 42 Q20 44 2 26 Z"
        fill="#94a3b8"
        stroke="#334155"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Belly */}
      <path d="M6 28 Q26 40 52 40 Q74 38 88 26 Q70 34 48 34 Q24 34 6 28 Z" fill="#f1f5f9" />
      {/* Side fin */}
      <path d="M46 34 L54 48 Q58 40 62 35 Z" fill="#64748b" stroke="#334155" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Gills */}
      <g stroke="#475569" strokeWidth="1.2" strokeLinecap="round">
        <path d="M36 18 V28" />
        <path d="M40 18 V28" />
        <path d="M44 18 V28" />
      </g>
      {/* Eye and mouth with teeth */}
      <circle cx="18" cy="19" r="2.4" fill="#0f172a" />
      <path d="M6 29 Q16 34 28 31" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 30.5 l2 3 l2 -2.4 l2 3 l2 -2.6 l2 2.8 l2 -2.8" fill="#ffffff" stroke="#334155" strokeWidth="0.6" />
    </svg>
  );
}

/** The water bottle lying next to the fisher, 30×30. */
export function WaterBottle() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" role="img" aria-label="Water bottle">
      <rect x="11.5" y="1.5" width="7" height="4" rx="1.2" fill="#1e3a8a" />
      <rect x="12.5" y="5" width="5" height="3" fill="#93c5fd" stroke="#1e40af" strokeWidth="0.8" />
      <rect x="8" y="7.5" width="14" height="21" rx="4" fill="#38bdf8" stroke="#1e40af" strokeWidth="1.2" />
      <rect x="8.6" y="14" width="12.8" height="6" fill="#e0f2fe" />
      <path d="M11 10 V26" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
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

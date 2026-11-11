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
export function Shark({ x, y, dir, bite }: { x: number; y: number; dir: number; bite: number }) {
  // `bite` runs 0 → 1 → 0: the lower jaw swings down around the corner of the
  // mouth and the head tips up, then both swing back.
  const jawAngle = bite * 72;
  const snoutAngle = bite * 26;
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
      {/* Eye: wide, and wider still while biting */}
      <circle
        data-shark-eye
        cx="19"
        cy="18"
        r={4.2 + bite * 3.2}
        fill="#ffffff"
        stroke="#334155"
        strokeWidth="1"
      />
      <circle cx={18.4 - bite} cy="18.3" r={2.1 - bite * 0.6} fill="#0f172a" />
      {/* Mouth: closed it is a line with teeth; when biting, a wide open red gape */}
      {bite > 0.02 && (
        <g data-shark-bite>
          {/* Inside of the mouth, between the raised snout and the dropped jaw */}
          <path
            d={`M32 30 L${(32 - 30 * Math.cos(((snoutAngle + 4) * Math.PI) / 180)).toFixed(1)} ${(
              30 -
              30 * Math.sin(((snoutAngle + 4) * Math.PI) / 180)
            ).toFixed(1)} L${(32 - 30 * Math.cos((jawAngle * Math.PI) / 180)).toFixed(1)} ${(
              30 +
              30 * Math.sin((jawAngle * Math.PI) / 180)
            ).toFixed(1)} Z`}
            fill="#7f1d1d"
            stroke="#334155"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Upper teeth on the raised snout */}
          <path
            d="M6 27 l2.2 5 l2.2 -5 l2.2 5 l2.2 -5 l2.2 5 l2.2 -5 l2.2 5 l2.2 -5 Z"
            fill="#ffffff"
            stroke="#334155"
            strokeWidth="0.6"
            transform={`rotate(${snoutAngle} 32 30)`}
          />
          {/* Lower jaw with its teeth, swung open */}
          <g transform={`rotate(${-jawAngle} 32 30)`}>
            <path d="M32 30 L3 30 Q12 38 32 36 Z" fill="#f1f5f9" stroke="#334155" strokeWidth="1.2" strokeLinejoin="round" />
            <path
              d="M6 30 l2.2 -5 l2.2 5 l2.2 -5 l2.2 5 l2.2 -5 l2.2 5 l2.2 -5 l2.2 5 Z"
              fill="#ffffff"
              stroke="#334155"
              strokeWidth="0.6"
            />
          </g>
        </g>
      )}
      {bite <= 0.02 && (
        <>
          <path d="M6 29 Q16 34 28 31" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 30.5 l2 3 l2 -2.4 l2 3 l2 -2.6 l2 2.8 l2 -2.8" fill="#ffffff" stroke="#334155" strokeWidth="0.6" />
        </>
      )}
    </svg>
  );
}

/** A small harmless fish, 30×18, drawn facing left and mirrored when swimming right. */
export function SmallFish({
  x,
  y,
  dir,
  color,
  stripe,
}: {
  x: number;
  y: number;
  dir: number;
  color: string;
  stripe: string;
}) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-dir})` }}
      width="30"
      height="18"
      viewBox="0 0 30 18"
      overflow="visible"
      role="img"
      aria-label="Small fish"
    >
      {/* Tail and fins */}
      <path d="M20 9 L30 2 Q27 9 30 16 Z" fill={stripe} stroke="#1e293b" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M10 3 Q14 -2 18 3 Z" fill={stripe} stroke="#1e293b" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Body with two stripes */}
      <ellipse cx="12" cy="9" rx="11" ry="6.5" fill={color} stroke="#1e293b" strokeWidth="0.9" />
      <path d="M11 3 Q9 9 11 15 M16 3.6 Q14 9 16 14.4" fill="none" stroke={stripe} strokeWidth="2" strokeLinecap="round" />
      {/* Eye and mouth */}
      <circle cx="5.5" cy="7.5" r="1.9" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
      <circle cx="5.2" cy="7.6" r="0.9" fill="#0f172a" />
      <path d="M2 11 Q3.5 12 5 11" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/** A trampoline whose mat is `width` wide, with its top edge at (x, y). */
export function Trampoline({ x, y, width }: { x: number; y: number; width: number }) {
  const w = width + 12; // The frame sticks out a little on each side
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x - 6}px, ${y}px)` }}
      width={w}
      height="32"
      viewBox={`0 0 ${w} 32`}
      role="img"
      aria-label="Trampoline"
    >
      {/* Legs */}
      <g stroke="#475569" strokeWidth="3" strokeLinecap="round">
        <path d="M12 10 L6 30" />
        <path d={`M${w - 12} 10 L${w - 6} 30`} />
        <path d={`M${w / 2} 10 V30`} />
      </g>
      {/* Springs */}
      <path
        d={`M10 8 l3 4 l3 -4 l3 4 M${w - 19} 12 l3 -4 l3 4 l3 -4`}
        stroke="#94a3b8"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Frame and mat */}
      <rect x="3" y="3" width={w - 6} height="9" rx="4.5" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.5" />
      <rect x="12" y="4.5" width={w - 24} height="4" rx="2" fill="#0f172a" />
    </svg>
  );
}

/** A fluffy cloud to stand on. The player's feet rest at `y`, between x and x + width. */
export function CloudPlatform({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x - 30}px, ${y - 22}px)` }}
      width={width + 60}
      height="100"
      // Drawn 400 wide and stretched sideways to the width asked for
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      role="img"
      aria-label="Cloud to stand on"
    >
      <g fill="#ffffff" stroke="#bae6fd" strokeWidth="2">
        <path d="M40 78 Q4 78 6 54 Q8 34 34 34 Q40 16 70 22 Q88 10 112 22 L290 22 Q318 8 344 24 Q372 22 378 42 Q398 46 394 62 Q390 78 360 78 Z" />
      </g>
      <g fill="#e0f2fe">
        <ellipse cx="110" cy="62" rx="46" ry="9" />
        <ellipse cx="270" cy="66" rx="60" ry="8" />
      </g>
    </svg>
  );
}

/**
 * The rooster on the high cloud, 64×64, standing with its feet at (x + 32, y + 62).
 * Drawn facing left; `facing` 1 turns it to face right.
 */
export function Rooster({ x, y, facing }: { x: number; y: number; facing: number }) {
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-facing})` }}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      overflow="visible"
      role="img"
      aria-label="Rooster"
    >
      {/* Tail: long curved feathers in green, blue and orange */}
      <g fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M44 40 Q62 34 60 12" stroke="#166534" />
        <path d="M45 42 Q66 42 64 24" stroke="#1d4ed8" />
        <path d="M45 44 Q64 50 66 36" stroke="#ea580c" />
        <path d="M43 38 Q54 28 50 10" stroke="#15803d" />
      </g>
      {/* Legs and feet */}
      <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M28 50 V62 M22 62 H31" />
        <path d="M37 50 V62 M31 62 H40" />
      </g>
      {/* Body, neck and head */}
      <path
        d="M48 42 Q48 28 36 28 Q28 28 26 22 Q25 10 17 10 Q9 10 9 19 Q9 26 14 30 Q12 52 32 52 Q48 52 48 42 Z"
        fill="#c2410c"
        stroke="#7c2d12"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Golden neck feathers */}
      <path d="M14 28 Q20 34 27 27 Q26 40 18 42 Q13 36 14 28 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
      {/* Wing */}
      <path d="M24 38 Q34 30 44 38 Q38 48 24 43 Z" fill="#7c2d12" stroke="#431407" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Big comb */}
      <g fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8">
        <circle cx="12" cy="8" r="4" />
        <circle cx="18" cy="5" r="4.6" />
        <circle cx="24" cy="8" r="4" />
      </g>
      {/* Wattle, beak and eye */}
      <ellipse cx="11" cy="27" rx="2.8" ry="5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />
      <path d="M10 15 L1 19 L10 22 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
      <circle cx="15" cy="17" r="2" fill="#111827" />
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

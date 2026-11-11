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

/**
 * The fisher at the beach: stands with his feet at (x + 32, y + 106), rod out
 * in front of him. Drawn facing right; `facing` -1 turns him round.
 *
 * When he has been refused the boat he takes his hat off (`hatOff`), the rod
 * turns into a sword (`sword`, 0 → 1) and he swings it (`swing`, 0 = raised
 * ready, 1 = brought down).
 */
export function Fisher({
  x,
  y = 238,
  facing = 1,
  hatOff = false,
  sword = 0,
  swing = 0,
  withLine = true,
}: {
  x: number;
  y?: number;
  facing?: number;
  hatOff?: boolean;
  sword?: number;
  swing?: number;
  withLine?: boolean;
}) {
  // The arm, and whatever is in the hand, turn around the shoulder. With the
  // rod it rests at 0°; with the sword it is raised back and then swung down.
  const armAngle = sword > 0 ? -55 * Math.min(1, sword * 1.5) + swing * 105 : 0;
  return (
    <svg
      className="absolute"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${facing})`, transformOrigin: '32px 53px' }}
      width="130"
      height="110"
      viewBox="0 0 130 110"
      overflow="visible"
      role="img"
      aria-label="Fisher"
    >
      {/* The fishing line and float stay in the water (while there is still a rod) */}
      {withLine && sword === 0 && (
        <>
          <path d="M118 8 V96" stroke="#f1f5f9" strokeWidth="1" />
          <circle cx="118" cy="97" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
        </>
      )}
      <g transform={`rotate(${armAngle} 42 58)`}>
        {/* Fishing rod, fading away as it turns into... */}
        <path
          d={`M58 68 L${118 - sword * 22} ${8 + sword * 22}`}
          stroke="#78350f"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={1 - sword}
        />
        {/* ...a sword: blade, guard and grip along the same line */}
        {sword > 0 && (
          <g data-sword opacity={sword} transform="rotate(-45 59 66)">
            <path d="M62 62.5 H104 L112 66 L104 69.5 H62 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M64 66 H104" stroke="#94a3b8" strokeWidth="1" />
            <rect x="59" y="58" width="4" height="16" rx="1.5" fill="#ca8a04" stroke="#713f12" strokeWidth="0.8" />
            <rect x="50" y="63.5" width="10" height="5" rx="2" fill="#78350f" />
          </g>
        )}
      </g>
      {/* Boots and trousers */}
      <rect x="17" y="98" width="13" height="8" rx="3" fill="#1f2937" />
      <rect x="34" y="98" width="13" height="8" rx="3" fill="#1f2937" />
      <rect x="20" y="78" width="9" height="22" fill="#1e3a8a" />
      <rect x="35" y="78" width="9" height="22" fill="#1e3a8a" />
      {/* Raincoat */}
      <rect x="15" y="47" width="34" height="35" rx="9" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
      {/* Arm and hand holding the rod or the sword */}
      <g transform={`rotate(${armAngle} 42 58)`}>
        <path d="M42 58 L58 65" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
        <circle cx="59" cy="66" r="4" fill="#fcd9b6" stroke="#b45309" strokeWidth="0.8" />
      </g>
      {/* Head, beard and eye (with an angry brow once the hat is off) */}
      <circle cx="32" cy="36" r="11" fill="#fcd9b6" stroke="#b45309" strokeWidth="0.8" />
      <path d="M21.5 38 Q32 58 42.5 38 Q32 46 21.5 38 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="37" cy="33.5" r="1.4" fill="#1f2937" />
      {hatOff ? (
        <>
          <path d="M33 29.5 L41 32" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
          {/* A few hairs on the bare head */}
          <path d="M27 26 q1 -5 3 0 M32 25 q1 -5 3 0" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
          {/* The hat, taken off and held in the other hand */}
          <g data-hat-off transform="translate(-14 48) rotate(-20 32 28)">
            <path d="M20 29 Q32 10 44 29 Z" fill="#15803d" />
            <rect x="15" y="27" width="34" height="4.5" rx="2.2" fill="#166534" />
          </g>
          <path d="M22 58 L12 70" stroke="#facc15" strokeWidth="7" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Hat */}
          <path d="M20 29 Q32 10 44 29 Z" fill="#15803d" />
          <rect x="15" y="27" width="34" height="4.5" rx="2.2" fill="#166534" />
        </>
      )}
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

/** A branching coral growing up from (x, y), in the given colour and size. */
export function Coral({
  x,
  y,
  color,
  size = 1,
  kind = 'branch',
}: {
  x: number;
  y: number;
  color: string;
  size?: number;
  kind?: 'branch' | 'fan' | 'brain';
}) {
  return (
    <g data-coral transform={`translate(${x} ${y}) scale(${size})`}>
      {kind === 'branch' && (
        <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 2 V-30" />
          <path d="M0 -10 L-12 -24 V-38" />
          <path d="M0 -18 L11 -30 V-46" />
          <path d="M-12 -28 L-20 -36" />
          <path d="M11 -36 L20 -42" />
          <path d="M0 -30 L-3 -44" />
        </g>
      )}
      {kind === 'fan' && (
        <g>
          <path d="M0 2 V-10" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <path d="M0 -10 Q-34 -22 -22 -48 Q0 -64 22 -48 Q34 -22 0 -10 Z" fill={color} opacity="0.85" />
          <g fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.6">
            <path d="M0 -12 V-54 M0 -12 L-16 -46 M0 -12 L16 -46 M0 -12 L-24 -32 M0 -12 L24 -32" />
          </g>
        </g>
      )}
      {kind === 'brain' && (
        <g>
          <path d="M-22 2 Q-24 -24 0 -24 Q24 -24 22 2 Z" fill={color} />
          <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.65">
            <path d="M-15 -4 q4 -6 8 0 t8 0 t8 0" />
            <path d="M-13 -12 q4 -6 8 0 t8 0 t8 0" />
            <path d="M-6 -19 q3 -4 6 0 t6 0" />
          </g>
        </g>
      )}
    </g>
  );
}

/** A sea turtle, 72×46, drawn facing left and mirrored when swimming right. `flap` moves its flippers. */
export function Turtle({ x, y, dir, flap }: { x: number; y: number; dir: number; flap: number }) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-dir})` }}
      width="72"
      height="46"
      viewBox="0 0 72 46"
      overflow="visible"
      role="img"
      aria-label="Turtle"
    >
      {/* Tail and back flipper */}
      <path d="M60 26 L71 30 L61 31 Z" fill="#65a30d" stroke="#365314" strokeWidth="1" />
      <path
        d="M50 30 Q60 36 62 44 Q52 42 46 33 Z"
        fill="#65a30d"
        stroke="#365314"
        strokeWidth="1"
        transform={`rotate(${-flap * 0.6} 50 30)`}
      />
      {/* Front flipper, flapping */}
      <path
        d="M24 30 Q14 40 6 44 Q14 30 22 24 Z"
        fill="#65a30d"
        stroke="#365314"
        strokeWidth="1"
        transform={`rotate(${flap} 24 28)`}
      />
      {/* Head and neck */}
      <path d="M20 24 Q10 22 6 16 Q2 10 8 7 Q16 4 20 12 Q23 18 26 20 Z" fill="#84cc16" stroke="#365314" strokeWidth="1.2" />
      <circle cx="9" cy="11" r="1.6" fill="#0f172a" />
      <path d="M4 15 Q7 16.5 10 15.5" fill="none" stroke="#365314" strokeWidth="0.9" strokeLinecap="round" />
      {/* Shell with its pattern */}
      <path d="M16 28 Q18 6 40 6 Q62 6 64 28 Q40 36 16 28 Z" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
      <g fill="none" stroke="#86efac" strokeWidth="1.3" opacity="0.8">
        <path d="M40 8 V30" />
        <path d="M27 11 L31 30 M53 11 L49 30" />
        <path d="M19 21 Q40 26 61 21" />
      </g>
      {/* Belly rim */}
      <path d="M16 28 Q40 36 64 28 Q40 33 16 28 Z" fill="#fef3c7" stroke="#14532d" strokeWidth="1" />
    </svg>
  );
}

/** A frog, 34×30, drawn facing left. `kick` (0–1) stretches its hind legs out when it swims. */
export function Frog({ x, y, dir, kick }: { x: number; y: number; dir: number; kick: number }) {
  const leg = 6 + kick * 9; // How far back the hind feet reach
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-dir})` }}
      width="34"
      height="30"
      viewBox="0 0 34 30"
      overflow="visible"
      role="img"
      aria-label="Frog"
    >
      {/* Hind legs */}
      <g fill="none" stroke="#15803d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M24 20 L${22 + leg * 0.4} ${27 - kick * 6} L${24 + leg} ${27 - kick * 3}`} />
        <path d={`M24 14 L${23 + leg * 0.4} ${8 + kick * 4} L${25 + leg} ${6 + kick * 6}`} />
      </g>
      {/* Front legs */}
      <g fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round">
        <path d="M11 22 L7 28 M7 28 L3 28" />
      </g>
      {/* Body and head */}
      <ellipse cx="16" cy="18" rx="12" ry="9" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
      <ellipse cx="17" cy="21" rx="8" ry="4.5" fill="#bbf7d0" />
      {/* Big eyes on top of the head */}
      <circle cx="8" cy="9" r="4.2" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
      <circle cx="7.5" cy="9" r="2.6" fill="#ffffff" />
      <circle cx="7" cy="9.2" r="1.3" fill="#0f172a" />
      {/* Mouth */}
      <path d="M4 17 Q10 21 17 18" fill="none" stroke="#14532d" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** A herring: a slender silver fish, 48×16, drawn facing left and mirrored when swimming right. */
export function Herring({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px) scaleX(${-dir})` }}
      width="48"
      height="16"
      viewBox="0 0 48 16"
      overflow="visible"
      role="img"
      aria-label="Herring"
    >
      {/* Forked tail and fins */}
      <path d="M38 8 L48 1 L44 8 L48 15 Z" fill="#64748b" stroke="#334155" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M20 3 L26 -1 L28 3.4 Z" fill="#64748b" stroke="#334155" strokeWidth="0.7" />
      <path d="M22 12.6 L26 16 L28 12.4 Z" fill="#94a3b8" stroke="#334155" strokeWidth="0.7" />
      {/* Body: blue-grey back, silver belly */}
      <path d="M1 8 Q10 1 26 2.5 Q36 4 40 8 Q36 12 26 13.5 Q10 15 1 8 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1" />
      <path d="M1 8 Q10 1 26 2.5 Q36 4 40 8 Q24 6 1 8 Z" fill="#475569" />
      {/* Shine along the side, gill and eye */}
      <path d="M10 9.5 H34" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M11 4.5 Q13 8 11 11.5" fill="none" stroke="#334155" strokeWidth="0.8" />
      <circle cx="6" cy="7" r="1.8" fill="#fef9c3" stroke="#334155" strokeWidth="0.6" />
      <circle cx="5.8" cy="7" r="0.9" fill="#0f172a" />
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

/** The magic bottle in the second sea, 30×34: purple, pink and blue, with a glow and sparkles. */
export function MagicBottle() {
  return (
    <svg width="30" height="34" viewBox="0 0 30 34" overflow="visible" role="img" aria-label="Magic bottle">
      <defs>
        <linearGradient id="magicBottle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id="magicGlow">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="15" cy="19" r="24" fill="url(#magicGlow)" />
      {/* Cork, neck and round body */}
      <rect x="12" y="1" width="6" height="5" rx="1.5" fill="#92400e" stroke="#451a03" strokeWidth="0.8" />
      <rect x="12.5" y="5.5" width="5" height="6" fill="#e9d5ff" stroke="#6b21a8" strokeWidth="0.9" />
      <path
        d="M12.5 11 Q4 14 4 22 Q4 32 15 32 Q26 32 26 22 Q26 14 17.5 11 Z"
        fill="url(#magicBottle)"
        stroke="#6b21a8"
        strokeWidth="1.2"
      />
      {/* Shine and sparkles */}
      <path d="M9 18 Q8 24 11 28" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <g fill="#ffffff">
        <path d="M27 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 Z" />
        <path d="M2 10 l0.8 2 l2 0.8 l-2 0.8 l-0.8 2 l-0.8 -2 l-2 -0.8 l2 -0.8 Z" />
      </g>
    </svg>
  );
}

/**
 * The angel, 84×70: a glowing figure with a halo and big wings, seen from the
 * side and flying level, so that the player can sit on its back. `flap` (-1 to 1)
 * moves the wings.
 */
export function Angel({ x, y, flap }: { x: number; y: number; flap: number }) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      width="84"
      height="70"
      viewBox="0 0 84 70"
      overflow="visible"
      role="img"
      aria-label="Angel"
    >
      <defs>
        <radialGradient id="angelGlow">
          <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="42" cy="36" rx="70" ry="52" fill="url(#angelGlow)" />
      {/* Far wing */}
      <path
        d="M40 30 Q30 4 6 0 Q12 14 10 22 Q20 22 40 34 Z"
        fill="#e0f2fe"
        stroke="#93c5fd"
        strokeWidth="1.2"
        transform={`rotate(${flap * 16} 40 30)`}
      />
      {/* Robe: the body lies level, trailing off to the left */}
      <path
        d="M62 30 Q44 22 22 30 Q8 34 0 46 Q14 42 24 44 Q44 48 62 42 Z"
        fill="#ffffff"
        stroke="#bae6fd"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 42 Q22 36 40 40" fill="none" stroke="#bae6fd" strokeWidth="1.2" />
      {/* Arm reaching forward, head with hair, and halo */}
      <path d="M58 38 Q68 42 76 40" fill="none" stroke="#fcd9b6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="68" cy="27" r="9" fill="#fcd9b6" stroke="#d6a77a" strokeWidth="1" />
      <path d="M59 26 Q60 15 70 17 Q78 18 77 27 Q72 20 66 22 Q62 22 59 26 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="0.8" />
      <circle cx="71.5" cy="27" r="1.2" fill="#1f2937" />
      <path d="M69 31.5 Q72 33.5 75 31.5" fill="none" stroke="#b45309" strokeWidth="0.9" strokeLinecap="round" />
      <ellipse cx="68" cy="12" rx="9" ry="2.6" fill="none" stroke="#facc15" strokeWidth="2.2" />
      {/* Near wing */}
      <path
        d="M38 32 Q24 2 -4 2 Q4 16 2 26 Q14 24 38 38 Z"
        fill="#ffffff"
        stroke="#93c5fd"
        strokeWidth="1.2"
        transform={`rotate(${-flap * 20} 38 32)`}
      />
    </svg>
  );
}

/** The boat, 130 wide: a wooden hull with a mast and a sail. (x, y) is the top-left of the hull's deck. */
export function Boat({ x, y }: { x: number; y: number }) {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      width="130"
      height="44"
      viewBox="0 0 130 44"
      overflow="visible"
      role="img"
      aria-label="Boat"
    >
      {/* Mast, sail and flag */}
      <rect x="86" y="-78" width="4" height="80" fill="#78350f" />
      <path d="M92 -74 L126 -22 H92 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M92 -52 H112 M92 -36 H121" stroke="#f59e0b" strokeWidth="1.2" />
      <path d="M86 -78 L70 -72 L86 -66 Z" fill="#ef4444" />
      {/* Hull */}
      <path
        d="M0 0 H130 L116 34 Q110 42 98 42 H30 Q18 42 12 34 Z"
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M0 0 H130 L127 8 H3 Z" fill="#92400e" />
      <path d="M8 18 H122 M14 30 H116" stroke="#78350f" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The big cat in the background of the long fall: a face that fills much of
 * the 800×400 picture, with very large eyes and a very happy mouth.
 */
export function BigCat() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 800 400"
      preserveAspectRatio="none"
      role="img"
      aria-label="Big cat"
    >
      {/* Ears */}
      <g fill="#fb923c" stroke="#9a3412" strokeWidth="4" strokeLinejoin="round">
        <path d="M232 150 L212 18 L340 82 Z" />
        <path d="M568 150 L588 18 L460 82 Z" />
      </g>
      <path d="M248 118 L234 48 L306 86 Z" fill="#fda4af" />
      <path d="M552 118 L566 48 L494 86 Z" fill="#fda4af" />
      {/* Head */}
      <ellipse cx="400" cy="226" rx="212" ry="170" fill="#fb923c" stroke="#9a3412" strokeWidth="4" />
      {/* Tabby stripes on the forehead and cheeks */}
      <g fill="none" stroke="#c2410c" strokeWidth="9" strokeLinecap="round">
        <path d="M400 66 V104 M368 72 L376 106 M432 72 L424 106" />
        <path d="M200 216 H232 M204 248 H238 M600 216 H568 M596 248 H562" />
      </g>
      {/* Pale muzzle */}
      <ellipse cx="400" cy="296" rx="112" ry="78" fill="#ffedd5" />
      {/* Very large eyes */}
      <g>
        <ellipse cx="314" cy="198" rx="64" ry="70" fill="#ffffff" stroke="#1f2937" strokeWidth="4" />
        <ellipse cx="486" cy="198" rx="64" ry="70" fill="#ffffff" stroke="#1f2937" strokeWidth="4" />
        <ellipse cx="320" cy="204" rx="40" ry="50" fill="#16a34a" />
        <ellipse cx="480" cy="204" rx="40" ry="50" fill="#16a34a" />
        <ellipse cx="322" cy="206" rx="24" ry="40" fill="#0f172a" />
        <ellipse cx="478" cy="206" rx="24" ry="40" fill="#0f172a" />
        <circle cx="336" cy="182" r="13" fill="#ffffff" />
        <circle cx="492" cy="182" r="13" fill="#ffffff" />
        <circle cx="312" cy="226" r="6" fill="#ffffff" />
        <circle cx="468" cy="226" r="6" fill="#ffffff" />
      </g>
      {/* Nose */}
      <path d="M382 270 H418 L400 290 Z" fill="#f472b6" stroke="#9d174d" strokeWidth="3" strokeLinejoin="round" />
      {/* A very happy, wide open mouth */}
      <path
        d="M400 290 V304 M300 300 Q400 318 500 300 Q486 384 400 384 Q314 384 300 300 Z"
        fill="#7f1d1d"
        stroke="#1f2937"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M344 350 Q400 326 456 350 Q440 380 400 380 Q360 380 344 350 Z" fill="#fb7185" />
      <path d="M326 306 L338 326 L350 309 Z M474 306 L462 326 L450 309 Z" fill="#ffffff" />
      {/* Whiskers */}
      <g stroke="#1f2937" strokeWidth="3" strokeLinecap="round">
        <path d="M286 290 L168 268 M286 304 L164 306 M288 318 L172 344" />
        <path d="M514 290 L632 268 M514 304 L636 306 M512 318 L628 344" />
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

import chickImage from './assets/chick.png';
import { ItemId, SaveData, SHOP_ITEMS } from './shopData';

type WearableId = Exclude<ItemId, 'follower'>;

/** One accessory drawn around the point where it attaches to the figure. */
function Accessory({ id }: { id: WearableId }) {
  switch (id) {
    case 'bow':
      // Bow tie, centred on the knot
      return (
        <g stroke="#991b1b" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M0 0 L-7.5 -4.5 V4.5 Z" fill="#ef4444" />
          <path d="M0 0 L7.5 -4.5 V4.5 Z" fill="#ef4444" />
          <circle r="2.2" fill="#b91c1c" />
        </g>
      );
    case 'earring':
      // Gold ring with a blue gem, hanging down from the attachment point
      return (
        <g>
          <circle cy="2.6" r="2.4" fill="none" stroke="#f59e0b" strokeWidth="1.4" />
          <circle cy="6.2" r="1.7" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.6" />
        </g>
      );
    case 'hat':
      // Top hat, standing on the attachment point
      return (
        <g>
          <rect x="-9.5" y="-2.6" width="19" height="2.8" rx="1.3" fill="#1f2937" />
          <rect x="-6" y="-12.5" width="12" height="10.5" rx="1.2" fill="#1f2937" />
          <rect x="-6" y="-6" width="12" height="2.6" fill="#ef4444" />
        </g>
      );
    case 'necklace':
      // A string of pearls hanging from the neck, with a pendant
      return (
        <g>
          <path d="M-8 0 Q0 8 8 0" fill="none" stroke="#fde68a" strokeWidth="1" />
          <g fill="#fffbeb" stroke="#ca8a04" strokeWidth="0.5">
            <circle cx="-6.6" cy="1.6" r="1.4" />
            <circle cx="-3.6" cy="3.3" r="1.4" />
            <circle cx="3.6" cy="3.3" r="1.4" />
            <circle cx="6.6" cy="1.6" r="1.4" />
          </g>
          <path d="M0 3.4 L2.2 6.6 L0 9.6 L-2.2 6.6 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.6" />
        </g>
      );
    case 'dress':
      // A pink dress over the body, flaring out to a frilled hem
      return (
        <g stroke="#be185d" strokeWidth="0.9" strokeLinejoin="round">
          <path d="M-8 -7 Q0 -4 8 -7 L15 9 Q7.5 13 0 9.5 Q-7.5 13 -15 9 Z" fill="#f472b6" />
          <path d="M-8 -7 Q0 -4 8 -7 L8.6 -3 Q0 0 -8.6 -3 Z" fill="#db2777" />
          <g fill="#fdf2f8" stroke="none">
            <circle cx="-6" cy="4" r="1.1" />
            <circle cx="0" cy="2" r="1.1" />
            <circle cx="6" cy="4" r="1.1" />
          </g>
        </g>
      );
    case 'bracelet':
      // A gold bangle with a red bead
      return (
        <g>
          <ellipse rx="3.6" ry="2" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
          <circle cy="2" r="1.3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.4" />
        </g>
      );
    case 'sunglasses':
      // Two dark lenses, 16 apart, joined by a bridge
      return (
        <g>
          <path d="M-13 -1.4 H13" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M-12.6 -2 H-3.6 Q-3.2 4.4 -8.1 4.4 Q-13 4.4 -12.6 -2 Z" fill="#111827" />
          <path d="M3.6 -2 H12.6 Q13 4.4 8.1 4.4 Q3.2 4.4 3.6 -2 Z" fill="#111827" />
          <path d="M-11 -0.4 H-8.4 M5.2 -0.4 H7.8" stroke="#e5e7eb" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    case 'cape':
      // A red cape, fastened at the attachment point and streaming out behind (to the left)
      return (
        <g stroke="#7f1d1d" strokeWidth="0.9" strokeLinejoin="round">
          <path d="M2 -1 Q-12 0 -20 16 Q-13 13 -9 18 Q-5 13 -1 18 Q3 8 2 -1 Z" fill="#dc2626" />
          <path d="M1 0 Q-8 4 -12 14" fill="none" stroke="#991b1b" strokeWidth="0.7" />
          <circle cx="2" cy="-0.6" r="1.6" fill="#facc15" stroke="#a16207" strokeWidth="0.5" />
        </g>
      );
    case 'tshirt':
      // A white T-shirt with short sleeves
      return (
        <g stroke="#94a3b8" strokeWidth="0.9" strokeLinejoin="round">
          <path
            d="M-9 -7 L-4.5 -8.5 Q0 -5 4.5 -8.5 L9 -7 L14 -1.5 L10 1.5 L9 0.5 V9 H-9 V0.5 L-10 1.5 L-14 -1.5 Z"
            fill="#ffffff"
          />
          <path d="M-4.5 -8.5 Q0 -4 4.5 -8.5" fill="none" />
        </g>
      );
    case 'gloves':
      // One red boxing glove with a white cuff (the figure wears a pair)
      return (
        <g stroke="#7f1d1d" strokeWidth="0.8" strokeLinejoin="round">
          <rect x="-2.6" y="2.2" width="5.2" height="3" rx="1" fill="#ffffff" stroke="#94a3b8" />
          <path d="M-4.4 -1 Q-4.6 -5.4 0 -5.4 Q4.6 -5.4 4.4 -1 Q4.4 2.6 0 2.6 Q-4.4 2.6 -4.4 -1 Z" fill="#dc2626" />
          <path d="M3.6 -3.4 Q6.4 -3 6 -0.4 Q5.6 1.6 3.8 1" fill="#dc2626" />
        </g>
      );
    case 'globe':
      // The Earth, worn in place of the head: blue seas, green land, radius 10
      return (
        <g>
          <circle r="10" fill="#38bdf8" stroke="#075985" strokeWidth="1" />
          <g fill="#22c55e" stroke="#166534" strokeWidth="0.5" strokeLinejoin="round">
            <path d="M-7 -4 Q-5 -8 -1 -7.5 Q1 -5 -1 -3 Q-0.5 0 -3 1.5 Q-6 0.5 -7 -4 Z" />
            <path d="M2 -2 Q5 -4.5 8 -2 Q9 1 6.5 3 Q4 2.5 3.5 5 Q1 4 2 -2 Z" />
            <path d="M-4 4.5 Q-1 3.5 0 6 Q-1 8.5 -3.5 8 Z" />
          </g>
          <ellipse cx="-3.5" cy="-5.5" rx="3" ry="1.6" fill="#ffffff" opacity="0.35" />
        </g>
      );
  }
}

interface Anchor {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
}

// Where each accessory sits inside the 40×40 player box when the figure
// faces right. The whole layer is mirrored when the figure faces left. A list
// of places means one copy at each (a glove on each wing).
const ANCHORS: Record<'chick' | 'hen', Record<WearableId, Anchor | Anchor[]>> = {
  chick: {
    cape: { x: 13, y: 20 },
    dress: { x: 21, y: 27.5 },
    tshirt: { x: 21, y: 28, scale: 0.95 },
    necklace: { x: 22, y: 19.5, scale: 0.9 },
    bow: { x: 22, y: 21.5 },
    bracelet: { x: 33.5, y: 28, rotate: -25 },
    gloves: [
      { x: 5.5, y: 29, rotate: 20 },
      { x: 35.5, y: 29, rotate: -20 },
    ],
    earring: { x: 7.5, y: 15 },
    globe: { x: 21.5, y: 6.5, scale: 1.55 },
    sunglasses: { x: 22.4, y: 10, rotate: 13, scale: 1 },
    hat: { x: 22, y: -4.5, rotate: 6 },
  },
  hen: {
    cape: { x: 27, y: 13, scale: 1.05 },
    dress: { x: 18.5, y: 25, scale: 1.05 },
    tshirt: { x: 18.5, y: 24, scale: 1.05 },
    necklace: { x: 30.5, y: 15, scale: 0.6 },
    bow: { x: 33, y: 19 },
    bracelet: { x: 21, y: 39, scale: 0.8 },
    gloves: [
      { x: 8, y: 26, rotate: 20 },
      { x: 27.5, y: 28, rotate: -20 },
    ],
    earring: { x: 28, y: 10.5 },
    globe: { x: 32, y: 7.5, scale: 0.92 },
    sunglasses: { x: 31.5, y: 6.5, scale: 0.5 },
    hat: { x: 32, y: -6, rotate: 8 },
  },
};

// Drawn in this order, so that what lies on top is drawn last.
const WEARABLES: WearableId[] = [
  'cape',
  'dress',
  'tshirt',
  'necklace',
  'bow',
  'bracelet',
  'gloves',
  'earring',
  'globe',
  'sunglasses',
  'hat',
];

/** The accessories the player is wearing, drawn on top of the figure. */
export function Wearables({
  wearing,
  isHen,
  facing,
}: {
  wearing: ItemId[];
  isHen: boolean;
  facing: number;
}) {
  const anchors = ANCHORS[isHen ? 'hen' : 'chick'];
  const worn = WEARABLES.filter(id => wearing.includes(id));
  if (worn.length === 0) return null;
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: 0, top: 0, transform: `scaleX(${facing})` }}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      overflow="visible"
      aria-hidden="true"
    >
      {worn.flatMap(id =>
        [anchors[id]].flat().map((a, i) => (
          <g
            key={`${id}-${i}`}
            data-wearing={id}
            transform={`translate(${a.x} ${a.y}) rotate(${a.rotate ?? 0}) scale(${a.scale ?? 1})`}
          >
            <Accessory id={id} />
          </g>
        ))
      )}
    </svg>
  );
}

/** A krone coin, 30×30. */
export function Coin({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" role="img" aria-label="Coin">
      <circle cx="15" cy="15" r="13" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <circle cx="15" cy="15" r="9.5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="15" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">
        kr
      </text>
    </svg>
  );
}

// How each accessory is placed in its 24×24 shop picture.
const ICON_TRANSFORMS: Partial<Record<WearableId, string>> = {
  hat: 'translate(0 7)',
  earring: 'translate(0 -5) scale(1.6)',
  necklace: 'translate(0 -5) scale(1.3)',
  bracelet: 'scale(2.4)',
  cape: 'translate(9 -8) scale(1.05)',
  dress: 'translate(0 -2) scale(0.78)',
  tshirt: 'scale(0.8)',
  gloves: 'scale(1.9)',
  sunglasses: 'scale(0.85)',
};

function ItemIcon({ id }: { id: ItemId }) {
  if (id === 'follower') {
    return <img src={chickImage} alt="" className="h-9 w-auto" draggable={false} />;
  }
  return (
    <svg width="36" height="36" viewBox="-12 -12 24 24" aria-hidden="true">
      <g transform={ICON_TRANSFORMS[id] ?? ''}>
        <Accessory id={id} />
      </g>
    </svg>
  );
}

/** The shop shown from the Game Over screen: a list to scroll through. */
export function Shop({
  save,
  onBuy,
  onToggleWear,
  onBack,
}: {
  save: SaveData;
  onBuy: (id: ItemId) => void;
  onToggleWear: (id: ItemId) => void;
  onBack: () => void;
}) {
  return (
    <div className="bg-white px-6 py-4 rounded-lg w-[600px] max-h-[376px] flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-2xl font-bold">Shop</h2>
        <p className="text-xs text-gray-500">Scroll down for more</p>
        <div className="flex items-center gap-1 font-bold text-amber-700" aria-label={`You have ${save.coins} kr`}>
          <Coin size={22} />
          <span>{save.coins} kr</span>
        </div>
      </div>

      {/* The list scrolls; the heading and the Back button stay in view */}
      <ul className="space-y-2 overflow-y-auto pr-2 min-h-0 flex-1" aria-label="Things for sale">
        {SHOP_ITEMS.map(item => {
          const owned = save.owned.includes(item.id);
          const wearing = save.wearing.includes(item.id);
          const canAfford = save.coins >= item.price;
          return (
            <li key={item.id} className="flex items-center gap-3 bg-sky-50 rounded-lg px-3 py-1.5">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <ItemIcon id={item.id} />
              </div>
              <div className="flex-1 text-left leading-tight">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-600">{owned ? 'Yours' : `${item.price} kr`}</p>
              </div>
              {owned ? (
                <button
                  onClick={() => onToggleWear(item.id)}
                  className={`w-24 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    wearing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {wearing ? 'Take off' : 'Put on'}
                </button>
              ) : (
                <button
                  onClick={() => onBuy(item.id)}
                  disabled={!canAfford}
                  className="w-24 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors bg-amber-400 text-white hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Buy
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={onBack}
        className="mt-3 self-center shrink-0 bg-gray-200 text-gray-700 px-6 py-1.5 rounded-full hover:bg-gray-300 transition-colors"
      >
        Back
      </button>
    </div>
  );
}

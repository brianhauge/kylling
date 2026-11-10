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
  }
}

// Where each accessory sits inside the 40×40 player box when the figure
// faces right. The whole layer is mirrored when the figure faces left.
const ANCHORS: Record<'chick' | 'hen', Record<WearableId, { x: number; y: number; rotate?: number }>> = {
  chick: {
    hat: { x: 22, y: -4.5, rotate: 6 },
    bow: { x: 22, y: 21.5 },
    earring: { x: 7.5, y: 15 },
  },
  hen: {
    hat: { x: 32, y: -6, rotate: 8 },
    bow: { x: 33, y: 19 },
    earring: { x: 28, y: 10.5 },
  },
};

const WEARABLES: WearableId[] = ['earring', 'bow', 'hat'];

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
      {worn.map(id => {
        const a = anchors[id];
        return (
          <g key={id} data-wearing={id} transform={`translate(${a.x} ${a.y}) rotate(${a.rotate ?? 0})`}>
            <Accessory id={id} />
          </g>
        );
      })}
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

function ItemIcon({ id }: { id: ItemId }) {
  if (id === 'follower') {
    return <img src={chickImage} alt="" className="h-9 w-auto" draggable={false} />;
  }
  return (
    <svg width="36" height="36" viewBox="-12 -12 24 24" aria-hidden="true">
      <g transform={id === 'hat' ? 'translate(0 7)' : id === 'earring' ? 'translate(0 -4) scale(1.6)' : ''}>
        <Accessory id={id} />
      </g>
    </svg>
  );
}

/** The shop shown from the Game Over screen. */
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
    <div className="bg-white px-6 py-4 rounded-lg w-[430px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Shop</h2>
        <div className="flex items-center gap-1 font-bold text-amber-700" aria-label={`You have ${save.coins} kr`}>
          <Coin size={22} />
          <span>{save.coins} kr</span>
        </div>
      </div>

      <ul className="space-y-2">
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
        className="mt-3 bg-gray-200 text-gray-700 px-6 py-1.5 rounded-full hover:bg-gray-300 transition-colors"
      >
        Back
      </button>
    </div>
  );
}

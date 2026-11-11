import { useState, useEffect, useRef } from 'react';
import { Egg, Heart } from 'lucide-react';
import chickImage from './assets/chick.png';
import { Coin, Shop, Wearables } from './Shop';
import {
  Angel,
  BigCat,
  Boat,
  CloudPlatform,
  Coral,
  Fisher,
  Frog,
  Herring,
  Turtle,
  KnifeIcon,
  MagicBottle,
  Rooster,
  Shark,
  Signpost,
  SmallFish,
  Trampoline,
  WaterBottle,
} from './Props';
import {
  FAR_HILL_GRASS,
  FAR_HILL_TUFTS,
  GROUND_GRASS,
  GROUND_TUFTS,
  NEAR_HILL_GRASS,
  NEAR_HILL_TUFTS,
  farHillY,
} from './grass';
import { GrassBlades } from './GrassBlades';
import { ItemId, SHOP_ITEMS, SaveData, loadSave, storeSave } from './shopData';
import bunnyImage from './assets/bunny.png';

interface Position {
  x: number;
  y: number;
}

interface GameObject extends Position {
  width: number;
  height: number;
}

type Platform = GameObject;

const GROUND_LEVEL = 300;
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 400;
const PLAYER_SIZE = 40;

// How much the 800×400 game is enlarged: as big as fits, leaving a small margin.
const SCREEN_FILL = 0.94;
const fitScale = () =>
  Math.max(
    0.4,
    Math.min(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT) * SCREEN_FILL
  );

// Vertical movement
const GRAVITY = 0.6;
// Peak height ≈ JUMP_FORCE² / (2 × GRAVITY) ≈ 120px. A double jump from the
// top of the first reaches about twice that.
const JUMP_FORCE = -12;
const JUMP_CUT_SPEED = -5; // Releasing Space early caps the upward speed → shorter hop

// Horizontal movement (px per frame)
const MAX_SPEED = 5;
const GROUND_ACCEL = 0.8;
const AIR_ACCEL = 0.45; // Less control in the air than on the ground
const GROUND_FRICTION = 0.75;
const AIR_FRICTION = 0.97; // Momentum is mostly kept while airborne

// Bunny patrol
const BUNNY_SPEED = 2;
const BUNNY_MIN_X = 100;
const BUNNY_MAX_X = 700;

const PLATFORMS: Platform[] = [
  { x: 150, y: 250, width: 100, height: 20 },
  { x: 350, y: 200, width: 100, height: 20 },
  { x: 550, y: 250, width: 100, height: 20 },
];

interface EggItem extends Position {
  gold?: boolean;
  red?: boolean;
}

const EGGS_PER_COIN = 6; // Every sixth egg collected makes a coin appear
const COIN_VALUE = 1; // Kroner per coin
const FOLLOW_DELAY_FRAMES = 22; // How far behind in time the follower chick walks
const FOLLOW_GAP = 26; // ...and how many px behind the player it stops

const RED_EGG_INTERVAL = 15; // Every 15th egg is red and gives a lost heart back

const POINTS_PER_LEVEL = 20;
const HEN_LEVEL = 3; // From this level on the chick has grown into a hen

const GOLD_EGG_INTERVAL = 4; // Every fourth egg is golden
const GOLD_EGG_POINTS = 3;

const initialEggs = (): EggItem[] => [
  { x: 200, y: 300 },
  { x: 400, y: 150 },
  { x: 600, y: 200 },
];

// Every place an egg can appear. All of them are reachable: on the ground,
// within jumping height, or above a platform.
const EGG_SPOTS: Position[] = [
  // On the ground
  { x: 120, y: 300 },
  { x: 200, y: 300 },
  { x: 300, y: 300 },
  { x: 460, y: 300 },
  { x: 680, y: 300 },
  { x: 750, y: 300 },
  // In the air, reachable with a jump from the ground
  { x: 60, y: 190 },
  { x: 290, y: 190 },
  { x: 485, y: 180 },
  { x: 710, y: 200 },
  // Above the platforms
  { x: 185, y: 200 },
  { x: 400, y: 150 },
  { x: 600, y: 200 },
  { x: 385, y: 70 },
];

const EGGS_PER_BATCH = 3;

// Picks a new batch of eggs, avoiding the spots used by the previous batch
// and any spot the player is touching right now.
const nextEggs = (previous: Position[], playerBox: GameObject): Position[] => {
  const candidates = EGG_SPOTS.filter(
    spot => !previous.some(p => p.x === spot.x && p.y === spot.y) && !overlaps(playerBox, spot)
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, EGGS_PER_BATCH);
};

const initialBody = () => ({
  x: 50,
  y: GROUND_LEVEL,
  vx: 0,
  vy: 0,
  onGround: true,
  platform: null as number | null, // Index of the platform being stood on
  floating: false, // Rising from a trampoline up to the sky
  floatSpeed: 0, // How fast (px per frame, negative = up)
  facing: 1, // 1 = right, -1 = left
  doubleJumped: false, // The mid-air jump has been used since last standing
  flip: 0, // Degrees of the somersault turned so far (0 = not turning)
  flipDir: 1,
});

// The three places. The meadow is the main one; walking out of its right side
// leads to the trampoline place, and the trampoline carries the player up to
// the sky, from where stepping off the cloud drops back down.
const MEADOW = 0;
const TRAMPOLINE_PLACE = 1;
const SKY = 2;
const BEACH = 3; // Further on past the trampoline place
const UNDERWATER = 4; // Down in the sea off the beach
const HIGH_SKY = 5; // Higher up still, reached from the trampoline on the sky cloud
const HIGH_SKY_WEST = 6; // The next place along the big cloud, out of the left side
const DEEP_SEA = 7; // More sea, out of the right side of the first one
const CAT_FALL = 10; // The long fall from the far cloud, past the big cat, down to the meadow
const CAT_FALL_SPEED = 3; // px per frame: slow enough to get a good look at the cat
// The coins and eggs in the fall past the cat: seven rows of eight across the
// whole picture, coins and eggs in turn, every other row shifted sideways.
const CAT_LOOT: { x: number; y: number; coin: boolean }[] = Array.from({ length: 56 }, (_, i) => {
  const row = Math.floor(i / 8);
  const col = i % 8;
  return { x: 30 + col * 94 + (row % 2) * 47, y: 18 + row * 52, coin: (row + col) % 2 === 0 };
});
const DARK = 8; // The dark place below the hole in the seabed
const SEA_TOP = 9; // The open sea seen from above the water, with the boat
type Room =
  | typeof CAT_FALL
  | typeof DARK
  | typeof SEA_TOP
  | typeof DEEP_SEA
  | typeof HIGH_SKY
  | typeof HIGH_SKY_WEST
  | typeof MEADOW
  | typeof TRAMPOLINE_PLACE
  | typeof SKY
  | typeof BEACH
  | typeof UNDERWATER;

// The backdrop of a place: where the sun is, the mountain range, its snow
// caps, and any trees on the far hills.
interface Scenery {
  sun: Position;
  mountains: string;
  snowCaps: string[];
  trees: { x: number; size: number }[];
}

/**
 * A mountain range from its corner points (valleys and peaks in turn), and a
 * snow cap for each peak listed, following the slopes down `depth` px.
 */
const mountainRange = (points: [number, number][], snowyPeaks: number[], depth: number) => {
  const mountains = `M0 330 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')} L800 330 Z`;
  const snowCaps = snowyPeaks.map(i => {
    const [px, py] = points[i];
    // How far along each slope the cap reaches
    const along = ([x, y]: [number, number]) => {
      const t = depth / (y - py);
      return [px + (x - px) * t, py + depth];
    };
    const [lx, ly] = along(points[i - 1]);
    const [rx, ry] = along(points[i + 1]);
    const at = (t: number, lift: number) =>
      `L${(lx + (rx - lx) * t).toFixed(1)} ${(ly + (ry - ly) * t - lift).toFixed(1)}`;
    // A jagged lower edge between the two slopes
    return `M${px} ${py} L${lx.toFixed(1)} ${ly.toFixed(1)} ${at(0.28, 5)} ${at(0.5, -4)} ${at(0.72, 6)} L${rx.toFixed(1)} ${ry.toFixed(1)} Z`;
  });
  return { mountains, snowCaps };
};

const MEADOW_SCENERY: Scenery = {
  sun: { x: 540, y: 70 },
  mountains:
    'M0 330 L0 250 L90 170 L170 240 L260 150 L370 250 L450 200 L540 260 L640 160 L740 245 L800 205 L800 330 Z',
  snowCaps: [
    'M260 150 L237 176 L252 172 L262 180 L272 171 L286 174 Z',
    'M640 160 L619 182 L633 178 L642 186 L652 177 L664 180 Z',
  ],
  trees: [],
};

// At the trampoline place the sun is in the left corner (just below the score
// boxes), the mountains are much taller, and a few trees stand on the hills.
const TRAMPOLINE_SCENERY: Scenery = {
  sun: { x: 62, y: 112 },
  ...mountainRange(
    [
      // The first peak is kept low, so that it does not stand in front of the sun.
      [0, 215],
      [118, 152],
      [165, 205],
      [245, 38],
      [345, 215],
      [425, 105],
      [505, 225],
      [610, 28],
      [705, 200],
      [765, 118],
      [800, 165],
    ],
    [1, 3, 5, 7, 9],
    30
  ),
  trees: [
    { x: 135, size: 1 },
    { x: 470, size: 0.85 },
    { x: 690, size: 1.1 },
  ],
};

// Swimming under water
const SWIM_ACCEL = 0.5;
const SWIM_DRAG = 0.88; // Top speed works out at about 3.7 px per frame
const SWIM_SPEED_ON_DIVE = 3;
const SEABED_Y = 330; // The player box cannot go below this
const SHARK = { y: 170, width: 110, height: 48 };
const SHARK_SPEED = 2.2;
const SEA_COINS: Position[] = [
  { x: 70, y: 335 },
  { x: 230, y: 95 },
  { x: 390, y: 340 },
  { x: 560, y: 260 },
  { x: 710, y: 335 },
];
// The little fish: where each starts along its to-and-fro route, its depth,
// its speed (px per frame) and its colours.
// In the second sea the sand covers the left half of the bottom; to the right
// of this x a hole goes on down.
const SEA_HOLE_X = WORLD_WIDTH / 2;
const SEA_HOLE_BOTTOM_Y = WORLD_HEIGHT - PLAYER_SIZE; // As far down as the picture goes
// The other fish out there: like SEA_FISH, in other colours.
const DEEP_SEA_FISH = [
  { start: 300, y: 95, speed: 0.9, color: '#38bdf8', stripe: '#fef08a' },
  { start: 1100, y: 165, speed: 1.3, color: '#fde047', stripe: '#f97316' },
  { start: 620, y: 235, speed: 0.75, color: '#fb7185', stripe: '#ffffff' },
  { start: 40, y: 300, speed: 1.15, color: '#c084fc', stripe: '#22d3ee' },
];
const SEA_FISH = [
  { start: 60, y: 70, speed: 1.1, color: '#fb923c', stripe: '#ffffff' },
  { start: 900, y: 120, speed: 0.8, color: '#facc15', stripe: '#1d4ed8' },
  { start: 420, y: 245, speed: 1.4, color: '#f472b6', stripe: '#7e22ce' },
  { start: 1250, y: 290, speed: 0.7, color: '#4ade80', stripe: '#166534' },
  { start: 250, y: 320, speed: 1.0, color: '#a78bfa', stripe: '#fde047' },
  { start: 700, y: 45, speed: 1.6, color: '#f87171', stripe: '#fef3c7' },
];
const SEA_COIN_RESPAWN_MS = 30_000; // A taken coin is back after half a minute
// Each row lists places lying side by side, left to right.
const ROOM_ROWS: Room[][] = [
  [MEADOW, TRAMPOLINE_PLACE, BEACH],
  [HIGH_SKY_WEST, HIGH_SKY],
];

const BEACH_WATER_X = WORLD_WIDTH / 2; // Sand to the left of this, water to the right
const WADING_SPEED = 2.5; // Top speed in the water (half the normal speed)
const RAINBOW_MS = 20_000; // Rainbow-coloured, and safe from the bunny, for 20 seconds
const BREATH_FRAMES = 300; // Under water the head is fully blue after 5 seconds...
const BREATH_BACK_FRAMES = 90; // ...and normal again 1.5 seconds after coming up
// The trip with the angel and the boat.
const ANGEL_BACK_Y = 250; // Where the player's feet land on the waiting angel
const ANGEL_SEAT_X = 22; // The player sits this far in from the angel picture's left edge...
const ANGEL_SEAT_Y = 26; // ...and this far down from its top
const ANGEL_SPEED = 3; // px per frame while it carries the player
const ANGEL_DROP_Y = 60; // How high above the sea it lets go
const BOAT_WIDTH = 130;
const BOAT_SEAT_X = 44; // Where the player stands in the boat
const BOAT_DECK_Y = 304; // The player's feet in the boat (it bobs a little around this)
const BOAT_ACCEL = 0.35;
const BOAT_DRAG = 0.93; // Top speed works out at about 4.6 px per frame
const BEACH_SUN: Position = { x: 610, y: 318 }; // The setting sun, on the horizon over the sea
// The boat run ashore at the beach, and the fisher's question about it.
const SHORE_BOAT_X = WORLD_WIDTH / 2 + 6; // Where the boat stops against the sand
const FISHER_BOARD_FRAMES = 50; // Said yes: how long he takes to climb into the boat...
const FISHER_SAIL_FRAMES = 330; // ...and to sail off into the sun
const SWORD_START_FRAME = 25; // Said no: when the rod starts turning into a sword...
const SWORD_READY_FRAME = 145; // ...when it is a sword...
const SWORD_HIT_FRAME = 162; // ...and when the swing lands
const startOfShore = () => ({
  boat: 'none' as 'none' | 'landed' | 'leaving' | 'gone',
  answer: null as 'yes' | 'no' | null,
  frames: 0, // Since the answer
  fisher: 'here' as 'here' | 'gone',
});
const startOfRide = () => ({
  phase: 'falling' as 'falling' | 'riding' | 'dropped' | 'boat' | 'ashore',
  pause: 0,
  angelX: 0,
  angelY: ANGEL_BACK_Y - ANGEL_SEAT_Y,
  boatX: 500,
  boatV: 0,
  clock: 0,
});
const MAGIC_BOTTLE: Position ={ x: 236, y: 250 }; // In the second sea, above the corals
const SUNBURN_OPACITY = 0.75; // How strong the red tint is when fully red
const SUNBURN_FRAMES = 300; // The head takes 5 seconds to turn fully red at the beach
const FISHER_X = 290; // The fisher stands on the sand at the water's edge
const WATER_BOTTLE: Position = { x: 240, y: 312 }; // Next to the fisher
const FLIP_DEGREES_PER_FRAME = 15; // The somersault takes 24 frames

// `y` is where the feet of the 40px player box come to rest.
const TRAMPOLINE = { x: 360, y: 314, width: 80 };
const SKY_CLOUD = { x: 230, y: 250, width: 340 };
const FLOAT_SPEED = -4; // px per frame while floating upwards
// The second trampoline stands on the left end of the sky cloud and shoots the
// player up to a big cloud, half the picture wide, where the rooster lives.
const SKY_TRAMPOLINE = { x: 246, y: 226, width: 70 };
const FAST_FLOAT_SPEED = -16;
// It covers the left half of the picture, right out to the edge, and carries
// on in the next place to the west, where it covers the right half.
const HIGH_CLOUD = { x: 0, y: 270, width: 400 };
const HIGH_WEST_CLOUD = { x: 400, y: 270, width: 400 };
// The cloud to stand on in each of the places up in the sky.
const SKY_CLOUDS: { [room: number]: { x: number; y: number; width: number } } = {
  [SKY]: SKY_CLOUD,
  [HIGH_SKY]: HIGH_CLOUD,
  [HIGH_SKY_WEST]: HIGH_WEST_CLOUD,
};
type SkyHeartState = 'floating' | 'carried' | 'given';
const SKY_HEART: Position = { x: 290, y: 175 }; // In the air, a jump out from the cloud's end
const HIGH_SKY_FLOAT_TOP = 150;
const HIGH_SKY_ARRIVAL_X = 230; // Where the fast trampoline delivers the player
const ROOSTER_X = 50; // Where the rooster stands on the big cloud
const BUNNY_STEP_SPEED = 0.16; // Foot swing (radians) per px the bunny walks
const SHARK_BITE_FRAMES = 36; // How long the shark's mouth takes to snap open and shut
const SKY_FLOAT_TOP = 150; // The float ends this high in the sky, above the cloud
const BLUE_EGG: Position = { x: 480, y: 215 }; // On the sky cloud
const BLUE_EGG_MULTIPLIER = 2; // Coins are worth this much more for the rest of the level
// For testing later levels: while developing, opening the game with e.g.
// "?score=85" in the address starts the first game at that score.
const DEV_START_SCORE = import.meta.env.DEV
  ? Math.max(0, Number(new URLSearchParams(window.location.search).get('score')) || 0)
  : 0;
// Likewise "?start=boat" (or west, sea, deepsea) starts the first game in that
// place instead of in the meadow.
const DEV_STARTS: {
  [name: string]: {
    room: Room;
    body?: { x: number; y: number };
    ride?: { phase: 'boat'; boatX: number };
  };
} = {
  boat: { room: BEACH, ride: { phase: 'boat', boatX: 640 } },
  west: { room: HIGH_SKY_WEST, body: { x: 600, y: HIGH_WEST_CLOUD.y - PLAYER_SIZE } },
  sea: { room: UNDERWATER, body: { x: 400, y: 80 } },
  deepsea: { room: DEEP_SEA, body: { x: 100, y: 80 } },
};
const DEV_START = import.meta.env.DEV
  ? DEV_STARTS[new URLSearchParams(window.location.search).get('start') ?? ''] ?? null
  : null;

const KNIFE_LEVEL = 5; // From this level a knife lies in the meadow
const WALK_CYCLE_SPEED = 0.22; // Leg swing (radians) per px walked
const LEG_SWING_DEGREES = 28;

const MAX_LIVES = 3;
const REVIVE_PRICE = 10; // Kroner to carry on after Game Over
const HIT_GRACE_FRAMES = 120; // Invulnerable (and crying) for 2 seconds after a hit

// From this level on the platforms bob up and down.
const MOVING_PLATFORMS_LEVEL = 4;
const PLATFORM_TRAVEL = 30; // px above and below the resting height
const PLATFORM_PERIOD_FRAMES = 200;

// From this level on it is night: the sun sets, the moon rises, the sky
// turns dark, the background clouds fade away and the stars come out.
const NIGHT_LEVEL = 4;
const NIGHT_TRANSITION = 'opacity 3s ease-in-out, transform 3s ease-in-out';
const STARS = Array.from({ length: 45 }, (_, i) => ({
  x: (i * 173.3 + 40) % 800,
  y: (i * 97.7 + 15) % 230,
  r: 0.8 + (i % 3) * 0.5,
}));

// From this level on storm clouds keep falling through the screen.
const CLOUD_LEVEL = 2;
const CLOUD_END_LEVEL = 5; // ...and stop again from this level
const CLOUD_WIDTH = 70;
const CLOUD_HEIGHT = 32;
const CLOUD_SPEED = 2.5; // px per frame downwards
const CLOUD_START_Y = -70; // Starts fully above the visible area
const CLOUD_PAUSE_FRAMES = 90; // Wait between one cloud leaving and the next

type StormCloud = GameObject;

const restingPlatformYs =() => PLATFORMS.map(p => p.y);
const levelForScore = (score: number) => Math.floor(score / POINTS_PER_LEVEL) + 1;
const initialBunny = (): GameObject => ({ x: 700, y: GROUND_LEVEL, width: 40, height: 40 });

const overlaps = (a: GameObject, b: Position & Partial<GameObject>) => {
  const bWidth = b.width || 30;
  const bHeight = b.height || 30;
  return a.x < b.x + bWidth && a.x + a.width > b.x && a.y < b.y + bHeight && a.y + a.height > b.y;
};

function App() {
  // The simulation lives in refs so the game loop always sees current values;
  // the state below is only what gets drawn.
  const body = useRef({ ...initialBody(), ...DEV_START?.body });
  const keys = useRef({ left: false, right: false, down: false, jump: false, jumpPressed: false });
  const eggsRef = useRef<EggItem[]>(initialEggs());
  const lastBatch = useRef<Position[]>(eggsRef.current);
  const eggsLaid = useRef(eggsRef.current.length);
  const bunnyRef = useRef<GameObject>(initialBunny());
  const bunnyDir = useRef(-1); // -1 = walking left, 1 = walking right
  const [bunnyFacing, setBunnyFacing] = useState(-1);

  const scoreRef = useRef(DEV_START_SCORE);
  const livesRef = useRef(MAX_LIVES);
  const graceFrames = useRef(0);
  const platformYsRef = useRef<number[]>(restingPlatformYs());
  const platformClock = useRef(0);
  const cloudRef = useRef<StormCloud | null>(null);
  const cloudDelay = useRef(CLOUD_PAUSE_FRAMES);
  const [cloud, setCloud] = useState<StormCloud | null>(null);

  // Money: every sixth egg collected makes a coin appear somewhere.
  const eggsCollected = useRef(0);
  const coinsOwed = useRef(0);
  const coinRef = useRef<Position | null>(null);
  const [coin, setCoin] = useState<Position | null>(null);

  // The little chick that follows the player walks where the player was a moment ago.
  const trail = useRef<{ x: number; y: number; facing: number }[]>([]);
  const [follower, setFollower] = useState({ x: 50, y: GROUND_LEVEL, facing: 1 });

  // Wallet and wardrobe, kept between games and visits.
  const [save, setSave] = useState<SaveData>(loadSave);
  const [shopOpen, setShopOpen] = useState(false);
  useEffect(() => storeSave(save), [save]);

  const buyItem = (id: ItemId) =>
    setSave(s => {
      const item = SHOP_ITEMS.find(i => i.id === id);
      if (!item || s.owned.includes(id) || s.coins < item.price) return s;
      // A newly bought item is put on straight away.
      return { coins: s.coins - item.price, owned: [...s.owned, id], wearing: [...s.wearing, id] };
    });
  const toggleWear = (id: ItemId) =>
    setSave(s => {
      if (!s.owned.includes(id)) return s;
      const wearing = s.wearing.includes(id) ? s.wearing.filter(w => w !== id) : [...s.wearing, id];
      return { ...s, wearing };
    });

  const [player, setPlayer] = useState({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, crying: false, step: 0, vy: 0, swimming: false, flip: 0, heat: 0, blue: 0 });

  // Which place the player is in, the walking cycle, and the level in which
  // the blue egg was last taken (its bonus lasts for the rest of that level).
  const roomRef = useRef<Room>(DEV_START?.room ?? MEADOW);
  const [room, setRoom] = useState<Room>(DEV_START?.room ?? MEADOW);
  const stepRef = useRef(0);
  const bonusLevelRef = useRef(0);
  const [bonusLevel, setBonusLevel] = useState(0);

  // The knife: appears from level 5, is used up on the bunny, and the bunny
  // then stays away until the next game.
  const knifeRef = useRef<Position | null>(null);
  const [knife, setKnife] = useState<Position | null>(null);
  const hasKnifeRef = useRef(false);
  const [hasKnife, setHasKnife] = useState(false);
  const bunnyAliveRef = useRef(true);
  const [bunnyAlive, setBunnyAlive] = useState(true);

  // The beach: the head slowly turns red in the sun, until the water bottle
  // by the fisher is picked up, which turns the figure rainbow-coloured.
  const heatRef = useRef(0); // 0 = normal, 1 = fully red
  // Out of breath under water: 0 = normal, 1 = fully blue. Cured by the magic bottle.
  const blueRef = useRef(0);
  const curedRef = useRef(false);
  const [cured, setCured] = useState(false);
  // Under the sea: the shark, and for each coin the clock time at which it is
  // back (0 = it is lying there now).
  const sharkRef = useRef({ x: 500, dir: -1, bite: 0, clock: 0 });
  const sharkBiteFrames = useRef(0);
  // The heart in the sky beyond the far cloud: it floats there, is carried in
  // the hand once picked up, and ends up given to the rooster.
  // The trip with the angel and the boat (see the game loop).
  // The boat ashore at the beach and the fisher's question about it.
  const shoreRef = useRef(startOfShore());
  const [shore, setShore] = useState(shoreRef.current);
  const fisherAnswer = useRef<'yes' | 'no' | null>(null); // Set by the buttons and the Y/J/N keys
  const rideRef = useRef({ ...startOfRide(), ...DEV_START?.ride });
  const [ride, setRide] = useState(rideRef.current);
  // Which of the coins and eggs in the fall past the cat have been grabbed this time down.
  const catLootTaken = useRef<boolean[]>(CAT_LOOT.map(() => false));
  const [catLoot, setCatLoot] = useState<boolean[]>(catLootTaken.current);
  const skyHeartRef = useRef<SkyHeartState>('floating');
  const [skyHeart, setSkyHeart] = useState<SkyHeartState>('floating');
  const [shark, setShark] = useState(sharkRef.current);
  const seaCoinBackAt = useRef<number[]>(SEA_COINS.map(() => 0));
  const [seaCoinsThere, setSeaCoinsThere] = useState<boolean[]>(SEA_COINS.map(() => true));

  const rainbowEndsAt = useRef(0); // Clock time (ms) at which the rainbow wears off
  const [rainbowSeconds, setRainbowSeconds] = useState(0);
  const rainbow = rainbowSeconds > 0;
  const [lives, setLives] = useState(MAX_LIVES);
  const [platformYs, setPlatformYs] = useState<number[]>(platformYsRef.current);
  const [eggs, setEggs] = useState<EggItem[]>(eggsRef.current);
  const [bunny, setBunny] = useState<GameObject>(bunnyRef.current);
  const [score, setScore] = useState<number>(DEV_START_SCORE);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  // The level follows directly from the score: one level per 20 points.
  const level = levelForScore(score);
  const isHen = level >= HEN_LEVEL;
  const isNight = level >= NIGHT_LEVEL;
  const doubleCoins = bonusLevel === level;
  // The meadow and the trampoline place share the hills and the grass.
  const hasMeadowLand = room === MEADOW || room === TRAMPOLINE_PLACE;
  // The grass blades stick up above the shapes that the night tint covers,
  // so they are darkened on their own.
  const grassFilter = isNight ? 'brightness(0.55)' : 'brightness(1)';
  // Swimming poses under water: sideways the body swings out behind the head
  // and the wings flap; upwards the wings flap; downwards the legs are gone.
  const swimSideways = player.swimming && Math.abs(player.vx) > 0.6;
  const swimUp = player.swimming && player.vy < -0.6;
  const swimDown = player.swimming && player.vy > 0.6;
  const wingFlap = swimSideways || swimUp ? Math.sin(player.step * 1.7) * 38 : 0;
  // The head's colour: blue when out of breath under water, otherwise red from the sun.
  const headTint =
    player.blue > 0
      ? { color: '#2563eb', amount: player.blue, blue: true }
      : { color: '#ef4444', amount: player.heat, blue: false };
  // The trampoline place has its own backdrop; everywhere else uses the meadow's.
  const scenery = room === TRAMPOLINE_PLACE ? TRAMPOLINE_SCENERY : MEADOW_SCENERY;
  const legAngle = Math.sin(player.step) * LEG_SWING_DEGREES;

  // Scale the game to fill most of the window, keeping its 2:1 shape.
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Briefly announce each new level.
  useEffect(() => {
    if (level === 1) {
      setLevelUp(null);
      return;
    }
    setLevelUp(level);
    const timer = setTimeout(() => setLevelUp(null), 2500);
    return () => clearTimeout(timer);
  }, [level]);
  const [gameOver, setGameOver] = useState<boolean>(false);

  useEffect(() => {
    const setKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        keys.current.jump = down;
        // A fresh press (not a key held down) is what triggers the double jump.
        if (down && !e.repeat) keys.current.jumpPressed = true;
        // Letting go of Space on the way up cuts the jump short.
        if (!down && body.current.vy < JUMP_CUT_SPEED) body.current.vy = JUMP_CUT_SPEED;
      } else if (e.key === 'ArrowLeft') {
        keys.current.left = down;
      } else if (e.key === 'ArrowRight') {
        keys.current.right = down;
      } else if (e.key === 'ArrowDown') {
        keys.current.down = down;
      } else if (down && (e.key === 'y' || e.key === 'Y' || e.key === 'j' || e.key === 'J')) {
        fisherAnswer.current = 'yes'; // Y, or J for "ja"
      } else if (down && (e.key === 'n' || e.key === 'N')) {
        fisherAnswer.current = 'no';
      } else {
        return;
      }
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => setKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => setKey(e, false);
    const releaseAll = () => {
      keys.current = { left: false, right: false, down: false, jump: false, jumpPressed: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      const b = body.current;
      const k = keys.current;

      // Platforms: from level 4 they bob up and down, neighbours in opposite
      // directions. The clock starts at zero so the motion begins smoothly.
      const prevYs = platformYsRef.current;
      if (levelForScore(scoreRef.current) >= MOVING_PLATFORMS_LEVEL) {
        platformClock.current += 1;
        const wave = Math.sin((platformClock.current / PLATFORM_PERIOD_FRAMES) * 2 * Math.PI);
        platformYsRef.current = PLATFORMS.map(
          (p, i) => p.y + PLATFORM_TRAVEL * wave * (i % 2 === 0 ? 1 : -1)
        );
        setPlatformYs(platformYsRef.current);
      }
      const newYs = platformYsRef.current;
      // A player standing on a platform rides along with it.
      if (b.platform !== null) b.y = newYs[b.platform] - PLAYER_SIZE;

      // Horizontal: accelerate towards the held direction, otherwise slow down.
      // (No steering while floating up from the trampoline.)
      // `room` is where the player is while this frame is worked out. Walking
      // out of the side of a place changes it straight away, so that the rest
      // of the frame (what there is to land on) already uses the new place.
      const startRoom = roomRef.current;
      let room: Room = startRoom;
      let nextRoom = room;
      const dir = b.floating ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (room === DARK || room === SEA_TOP || (room === BEACH && rideRef.current.phase === 'boat')) {
        // The trip with the angel: falling through the dark onto its back,
        // riding it up out of the sea, being dropped onto the boat, and then
        // sailing the boat. The player only steers once in the boat.
        const ride = rideRef.current;
        ride.clock += 1;
        b.vx = 0;
        b.platform = null;
        b.floating = false;
        b.flip = 0;
        k.jumpPressed = false;
        if (ride.phase === 'falling') {
          b.vy = Math.min(b.vy + GRAVITY, 8);
          b.y += b.vy;
          b.onGround = false;
          if (b.y + PLAYER_SIZE >= ANGEL_BACK_Y) {
            b.y = ANGEL_BACK_Y - PLAYER_SIZE;
            b.vy = 0;
            ride.phase = 'riding';
            ride.pause = 40; // A moment on the angel's back before it takes off
          }
        } else if (ride.phase === 'riding') {
          b.onGround = true;
          if (ride.pause > 0) {
            ride.pause -= 1;
          } else if (room === DARK) {
            b.y -= ANGEL_SPEED;
            if (b.y < -PLAYER_SIZE - 50) {
              // Up out of the dark and out of the sea, into the open air above it.
              nextRoom = SEA_TOP;
              room = nextRoom;
              b.y = WORLD_HEIGHT;
            }
          } else {
            // Above the sea: up to dropping height, and sideways to above the boat.
            const targetX = ride.boatX + BOAT_SEAT_X;
            b.y = Math.max(ANGEL_DROP_Y, b.y - ANGEL_SPEED);
            b.x += Math.max(-ANGEL_SPEED, Math.min(ANGEL_SPEED, targetX - b.x));
            if (b.y === ANGEL_DROP_Y && Math.abs(targetX - b.x) < 1) {
              ride.phase = 'dropped';
              b.onGround = false;
            }
          }
          ride.angelX = b.x - ANGEL_SEAT_X;
          ride.angelY = b.y + PLAYER_SIZE - ANGEL_SEAT_Y;
        } else {
          // The angel has let go: it flies off upwards.
          ride.angelY -= ANGEL_SPEED * 1.5;
          const bob = Math.sin(ride.clock * 0.05) * 3;
          if (ride.phase === 'dropped') {
            b.vy += GRAVITY;
            b.y += b.vy;
            if (b.y + PLAYER_SIZE >= BOAT_DECK_Y + bob) {
              ride.phase = 'boat';
              b.vy = 0;
            }
          }
          if (ride.phase === 'boat') {
            // In the boat the arrow keys sail it to and fro.
            ride.boatV = (ride.boatV + dir * BOAT_ACCEL) * BOAT_DRAG;
            ride.boatX += ride.boatV;
            if (dir !== 0) b.facing = dir;
            if (room === SEA_TOP && ride.boatX < 0 && dir < 0) {
              // Sailing out of the left side of the open sea brings the boat
              // in towards the beach, coming in from its right side.
              nextRoom = BEACH;
              room = nextRoom;
              ride.boatX = WORLD_WIDTH - BOAT_SEAT_X - PLAYER_SIZE;
            } else if (room === BEACH && ride.boatX > WORLD_WIDTH - BOAT_SEAT_X - PLAYER_SIZE && dir > 0) {
              // ...and sailing back out to the right leads out to the open sea again.
              nextRoom = SEA_TOP;
              room = nextRoom;
              ride.boatX = 0;
            } else if (room === BEACH && ride.boatX <= SHORE_BOAT_X) {
              // The boat has run onto the sand: it stays there, and the player
              // is free to climb out. The fisher will want to know about it.
              ride.boatX = SHORE_BOAT_X;
              ride.boatV = 0;
              ride.phase = 'ashore';
              if (shoreRef.current.fisher === 'here' && shoreRef.current.answer === null) {
                shoreRef.current.boat = 'landed';
              }
            } else if (room === SEA_TOP) {
              ride.boatX = Math.max(0, Math.min(WORLD_WIDTH - BOAT_WIDTH, ride.boatX));
              if (ride.boatX === WORLD_WIDTH - BOAT_WIDTH) ride.boatV = 0;
            }
            b.x = Math.min(WORLD_WIDTH - PLAYER_SIZE, ride.boatX + BOAT_SEAT_X);
            b.y = BOAT_DECK_Y + bob - PLAYER_SIZE;
            b.onGround = true;
          }
        }
        if (ride.phase === 'falling') ride.angelY = ANGEL_BACK_Y - ANGEL_SEAT_Y;
        setRide({ ...ride });
      } else if (room === UNDERWATER || room === DEEP_SEA) {
        // Swimming: the arrow keys push in all four directions, the water
        // slows the player down again, and there is no gravity.
        const vertical = (k.down ? 1 : 0) - (k.jump ? 1 : 0);
        b.vx = (b.vx + dir * SWIM_ACCEL) * SWIM_DRAG;
        b.vy = (b.vy + vertical * SWIM_ACCEL) * SWIM_DRAG;
        if (dir !== 0) b.facing = dir;
        const yBeforeSwim = b.y;
        b.x += b.vx;
        b.y += b.vy;
        b.onGround = false;
        b.platform = null;
        b.flip = 0;
        const maxSwimX = WORLD_WIDTH - PLAYER_SIZE;
        // Swimming all the way out of the right side of the first sea leads
        // to more sea, and back out of that one's left side leads back.
        if (room === UNDERWATER && b.x > maxSwimX && b.vx > 0) {
          nextRoom = DEEP_SEA;
          room = nextRoom;
          b.x = 0;
        } else if (room === DEEP_SEA && b.x < 0 && b.vx < 0) {
          nextRoom = UNDERWATER;
          room = nextRoom;
          b.x = maxSwimX;
        }
        b.x = Math.max(0, Math.min(maxSwimX, b.x));
        if (room === DEEP_SEA) {
          // Here the sand only covers the left half; to the right of it a
          // hole goes further down. The sand is solid from the side as well.
          if (b.x < SEA_HOLE_X) {
            if (yBeforeSwim <= SEABED_Y + 0.01) {
              // Coming down onto the sand from above: it is the floor.
              if (b.y > SEABED_Y) {
                b.y = SEABED_Y;
                b.vy = 0;
              }
            } else {
              b.x = SEA_HOLE_X; // Down in the hole: the wall of sand stops the player
            }
          }
          if (b.y > SEA_HOLE_BOTTOM_Y) {
            // Going down to the bottom of the hole means falling through
            // into the dark place below, where the angel waits.
            nextRoom = DARK;
            room = nextRoom;
            b.y = -PLAYER_SIZE;
            b.vx = 0;
            b.vy = 2;
            rideRef.current = { ...startOfRide(), angelX: b.x - ANGEL_SEAT_X };
          }
        } else if (b.y > SEABED_Y) {
          b.y = SEABED_Y;
          b.vy = 0;
        }
        if (b.y < -PLAYER_SIZE / 2 && b.vy < 0) {
          // Swimming up through the surface leads back to the sea at the beach.
          nextRoom = BEACH;
          b.x = Math.max(b.x, BEACH_WATER_X + PLAYER_SIZE / 2);
          b.y = GROUND_LEVEL;
          b.vy = 0;
          b.onGround = true;
        }
        k.jumpPressed = false;
      } else {
      if (b.floating) {
        b.vx = 0;
      } else if (dir !== 0) {
        const accel = b.onGround ? GROUND_ACCEL : AIR_ACCEL;
        b.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, b.vx + dir * accel));
      } else {
        b.vx *= b.onGround ? GROUND_FRICTION : AIR_FRICTION;
        if (Math.abs(b.vx) < 0.05) b.vx = 0;
      }
      if (dir !== 0) b.facing = dir;
      // Wading through the water at the beach is slow going.
      if (room === BEACH && b.x + PLAYER_SIZE / 2 > BEACH_WATER_X) {
        b.vx = Math.max(-WADING_SPEED, Math.min(WADING_SPEED, b.vx));
      }
      b.x += b.vx;
      const maxX = WORLD_WIDTH - PLAYER_SIZE;
      // Places that lie side by side form a row (on the ground: meadow –
      // trampoline place – beach; high in the sky: the two cloud places).
      // Walking all the way out of one side leads to the neighbour on that side.
      const row = ROOM_ROWS.find(r => r.includes(room)) ?? [];
      const rowIndex = row.indexOf(room);
      if (rowIndex >= 0 && b.x > maxX && b.vx > 0 && rowIndex < row.length - 1) {
        nextRoom = row[rowIndex + 1];
        room = nextRoom;
        b.x = 0;
      } else if (rowIndex > 0 && b.x < 0 && b.vx < 0) {
        nextRoom = row[rowIndex - 1];
        room = nextRoom;
        b.x = maxX;
      } else if (b.x < 0 || b.x > maxX) {
        b.x = Math.max(0, Math.min(maxX, b.x));
        b.vx = 0;
      }

      // Vertical: float, or jump and gravity, then land on something.
      const wasOnGround = b.onGround;
      let nextY: number;
      b.onGround = false;
      b.platform = null;
      if (b.floating) {
        // Floating up from the trampoline: a steady rise without gravity, out
        // of the top of the trampoline place and up past the cloud in the sky.
        // The trampoline on the sky cloud does the same, only much faster, up
        // to the big cloud higher still.
        const fast = b.floatSpeed === FAST_FLOAT_SPEED;
        b.vy = b.floatSpeed;
        nextY = b.y + b.vy;
        if (room === TRAMPOLINE_PLACE && nextY < -PLAYER_SIZE) {
          nextRoom = SKY;
          nextY = WORLD_HEIGHT;
        } else if (room === SKY && fast && nextY < -PLAYER_SIZE) {
          nextRoom = HIGH_SKY;
          nextY = WORLD_HEIGHT;
          b.x = HIGH_SKY_ARRIVAL_X;
        } else if (
          (room === SKY && !fast && nextY <= SKY_FLOAT_TOP) ||
          (room === HIGH_SKY && nextY <= HIGH_SKY_FLOAT_TOP)
        ) {
          b.floating = false;
          b.vy = 0;
        }
      } else {
        if (wasOnGround) b.doubleJumped = false;
        if (k.jump && wasOnGround) {
          b.vy = JUMP_FORCE;
        } else if (!wasOnGround && k.jumpPressed && !b.doubleJumped) {
          // Double jump: one more jump in mid-air on a fresh press, with a somersault.
          b.vy = JUMP_FORCE;
          b.doubleJumped = true;
          b.flip = FLIP_DEGREES_PER_FRAME;
          b.flipDir = b.facing;
        }
        b.vy += GRAVITY;
        if (room === CAT_FALL) b.vy = Math.min(b.vy, CAT_FALL_SPEED);
        nextY = b.y + b.vy;
        if (b.vy > 0) {
          const feetBefore = b.y + PLAYER_SIZE;
          const feetAfter = nextY + PLAYER_SIZE;
          const isOver = (s: { x: number; width: number }) =>
            b.x < s.x + s.width && b.x + PLAYER_SIZE > s.x;
          if (room === MEADOW) {
            for (let i = 0; i < PLATFORMS.length; i++) {
              // The feet were above the platform (where it was or is now) and
              // would end up at or below its current top.
              const wasAbove = feetBefore <= Math.max(prevYs[i], newYs[i]) + 0.01;
              if (isOver(PLATFORMS[i]) && wasAbove && feetAfter >= newYs[i]) {
                nextY = newYs[i] - PLAYER_SIZE;
                b.vy = 0;
                b.onGround = true;
                b.platform = i;
                break;
              }
            }
          } else if (room === TRAMPOLINE_PLACE) {
            // Coming down onto the trampoline sends the player floating upwards.
            if (isOver(TRAMPOLINE) && feetBefore <= TRAMPOLINE.y + 0.01 && feetAfter >= TRAMPOLINE.y) {
              nextY = TRAMPOLINE.y - PLAYER_SIZE;
              b.floating = true;
              b.floatSpeed = FLOAT_SPEED;
            }
          } else if (room in SKY_CLOUDS) {
            const cloud = SKY_CLOUDS[room];
            if (
              room === SKY &&
              isOver(SKY_TRAMPOLINE) &&
              feetBefore <= SKY_TRAMPOLINE.y + 0.01 &&
              feetAfter >= SKY_TRAMPOLINE.y
            ) {
              // The trampoline on the cloud shoots the player up at full speed.
              nextY = SKY_TRAMPOLINE.y - PLAYER_SIZE;
              b.floating = true;
              b.floatSpeed = FAST_FLOAT_SPEED;
            } else if (isOver(cloud) && feetBefore <= cloud.y + 0.01 && feetAfter >= cloud.y) {
              nextY = cloud.y - PLAYER_SIZE;
              b.vy = 0;
              b.onGround = true;
            }
          }
        }
        if (room in SKY_CLOUDS) {
          // There is no ground in the sky: stepping off a cloud means falling
          // out of the bottom, down to the place below (the lower cloud's
          // sky, or the trampoline place).
          if (nextY > WORLD_HEIGHT) {
            // (From the far cloud, the one with the heart, the way down goes
            // past the big cat instead.)
            nextRoom =
              room === SKY ? TRAMPOLINE_PLACE : room === HIGH_SKY_WEST ? CAT_FALL : SKY;
            nextY = -PLAYER_SIZE;
          }
        } else if (room === CAT_FALL) {
          // The long fall past the cat: slow enough to see it, with nothing to
          // land on, and at the bottom of it lies the meadow where it all began.
          if (nextY > WORLD_HEIGHT) {
            nextRoom = MEADOW;
            nextY = -PLAYER_SIZE;
          }
        } else if (!b.floating && nextY >= GROUND_LEVEL) {
          nextY = GROUND_LEVEL;
          b.vy = 0;
          b.onGround = true;
        }
      }
      b.y = nextY;
      k.jumpPressed = false;

      // Somersault: one full turn, cut short by landing or by the trampoline.
      if (b.flip > 0) {
        b.flip += FLIP_DEGREES_PER_FRAME;
        if (b.flip >= 360 || b.onGround || b.floating) b.flip = 0;
      }

      // Out in the sea at the beach, the down arrow dives under the water.
      if (room === BEACH && k.down && b.onGround && b.x + PLAYER_SIZE / 2 > BEACH_WATER_X) {
        nextRoom = UNDERWATER;
        b.y = 0;
        b.vx = 0;
        b.vy = SWIM_SPEED_ON_DIVE;
        b.onGround = false;
      }
      }

      if (nextRoom !== startRoom) {
        roomRef.current = nextRoom;
        setRoom(nextRoom);
        trail.current = []; // The follower chick comes along instead of walking the old route
        // Every fall past the cat starts with all its coins and eggs in place.
        if (nextRoom === CAT_FALL) {
          catLootTaken.current = CAT_LOOT.map(() => false);
          setCatLoot(catLootTaken.current);
        }
      }

      // Walking: the legs swing with the distance covered, and rest otherwise.
      // Under water the legs kick whenever the player is swimming along.
      const inSea = roomRef.current === UNDERWATER || roomRef.current === DEEP_SEA;
      const swimSpeed = inSea ? Math.hypot(b.vx, b.vy) : 0;
      if (b.onGround && Math.abs(b.vx) > 0.3) stepRef.current += Math.abs(b.vx) * WALK_CYCLE_SPEED;
      else if (swimSpeed > 0.3) stepRef.current += swimSpeed * WALK_CYCLE_SPEED;
      else stepRef.current = 0;

      // Beach: the head goes red over five seconds in the sun and cools off
      // again elsewhere. Picking up the water bottle makes the figure
      // rainbow-coloured for 20 seconds instead; after that the bottle is back.
      const atBeach = roomRef.current === BEACH;
      // (Timed by the clock rather than in frames, so that it lasts exactly 20 seconds.)
      const now = performance.now();
      if (
        now >= rainbowEndsAt.current &&
        atBeach &&
        overlaps({ x: b.x, y: b.y, width: PLAYER_SIZE, height: PLAYER_SIZE }, WATER_BOTTLE)
      ) {
        rainbowEndsAt.current = now + RAINBOW_MS;
      }
      const isRainbow = now < rainbowEndsAt.current;
      // Whole seconds left, shown in the top bar (0 = not rainbow-coloured).
      setRainbowSeconds(isRainbow ? Math.ceil((rainbowEndsAt.current - now) / 1000) : 0);
      const heating = atBeach && !isRainbow;
      heatRef.current = isRainbow
        ? 0
        : Math.max(0, Math.min(1, heatRef.current + (heating ? 1 : -1) / SUNBURN_FRAMES));

      // Under water the player cannot hold its breath for long: the head
      // turns blue (it costs no hearts) and clears again above water. The
      // magic bottle in the second sea is the cure, for the rest of the game.
      if (
        roomRef.current === DEEP_SEA &&
        !curedRef.current &&
        overlaps({ x: b.x, y: b.y, width: PLAYER_SIZE, height: PLAYER_SIZE }, MAGIC_BOTTLE)
      ) {
        curedRef.current = true;
        setCured(true);
      }
      blueRef.current = curedRef.current
        ? 0
        : Math.max(
            0,
            Math.min(1, blueRef.current + (inSea ? 1 / BREATH_FRAMES : -1 / BREATH_BACK_FRAMES))
          );

      if (graceFrames.current > 0) graceFrames.current -= 1;
      const crying = graceFrames.current > 0;
      setPlayer(p => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        facing: dir !== 0 ? dir : p.facing,
        crying,
        step: stepRef.current,
        vy: b.vy,
        swimming: inSea,
        flip: b.flip * b.flipDir,
        heat: heatRef.current,
        blue: blueRef.current,
      }));

      const hitbox: GameObject = { x: b.x, y: b.y, width: PLAYER_SIZE, height: PLAYER_SIZE };

      // Follower chick: stands where the player was FOLLOW_DELAY_FRAMES ago.
      trail.current.push({ x: b.x, y: b.y, facing: dir !== 0 ? dir : trail.current[trail.current.length - 1]?.facing ?? 1 });
      if (trail.current.length > FOLLOW_DELAY_FRAMES) setFollower(trail.current.shift()!);
      else if (trail.current.length === 1) setFollower(trail.current[0]);

      // The blue egg on the sky cloud doubles the value of coins until the next level.
      const levelNow = levelForScore(scoreRef.current);
      if (
        roomRef.current === SKY &&
        bonusLevelRef.current !== levelNow &&
        overlaps(hitbox, BLUE_EGG)
      ) {
        bonusLevelRef.current = levelNow;
        setBonusLevel(levelNow);
      }

      // Falling past the cat there are a great many coins and eggs to grab on
      // the way down: a coin is money, an egg is a point.
      if (roomRef.current === CAT_FALL) {
        let kroner = 0;
        let points = 0;
        CAT_LOOT.forEach((item, i) => {
          if (!catLootTaken.current[i] && overlaps(hitbox, item)) {
            catLootTaken.current[i] = true;
            if (item.coin) {
              kroner += COIN_VALUE * (bonusLevelRef.current === levelNow ? BLUE_EGG_MULTIPLIER : 1);
            } else {
              points += 1;
            }
          }
        });
        if (kroner > 0 || points > 0) {
          setCatLoot([...catLootTaken.current]);
          if (kroner > 0) setSave(sv => ({ ...sv, coins: sv.coins + kroner }));
          if (points > 0) {
            scoreRef.current += points;
            setScore(scoreRef.current);
          }
        }
      }

      // The heart floating in the air beyond the end of the far cloud: jumping
      // out to it picks it up to carry. It is not a life; it is a present for
      // the rooster. Handing it over makes a heart appear above the two.
      if (
        roomRef.current === HIGH_SKY_WEST &&
        skyHeartRef.current === 'floating' &&
        overlaps(hitbox, SKY_HEART)
      ) {
        skyHeartRef.current = 'carried';
        setSkyHeart('carried');
      } else if (
        roomRef.current === HIGH_SKY &&
        skyHeartRef.current === 'carried' &&
        overlaps(hitbox, { x: ROOSTER_X, y: HIGH_CLOUD.y - 58, width: 64, height: 58 })
      ) {
        skyHeartRef.current = 'given';
        setSkyHeart('given');
      }

      // Losing a heart: the last one ends the game, otherwise the player is
      // safe for a moment (and cries).
      const hurt = () => {
        if (graceFrames.current > 0) return;
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) setGameOver(true);
        else graceFrames.current = HIT_GRACE_FRAMES;
      };

      // The boat on the sand at the beach, and the fisher who wants it. Once
      // he has been answered, what follows plays out frame by frame:
      // yes – he climbs in and sails off towards the sun, growing smaller;
      // no – he takes his hat off, his rod turns into a sword, and he swings
      //      it, which costs a heart.
      const shore = shoreRef.current;
      if (
        fisherAnswer.current &&
        shore.boat === 'landed' &&
        shore.answer === null &&
        roomRef.current === BEACH
      ) {
        shore.answer = fisherAnswer.current;
        shore.frames = 0;
      }
      fisherAnswer.current = null;
      if (shore.answer !== null) {
        shore.frames += 1;
        if (shore.answer === 'yes') {
          if (shore.frames === FISHER_BOARD_FRAMES) shore.boat = 'leaving';
          if (shore.frames >= FISHER_BOARD_FRAMES + FISHER_SAIL_FRAMES) {
            shore.boat = 'gone';
            shore.fisher = 'gone';
          }
        } else if (shore.frames === SWORD_HIT_FRAME && roomRef.current === BEACH) {
          hurt();
        }
      }
      if (roomRef.current === BEACH) setShore({ ...shore });

      // Further out in the sea nothing is dangerous; only the clock runs, which
      // moves the animals there.
      if (roomRef.current === DEEP_SEA) {
        sharkRef.current = { ...sharkRef.current, clock: sharkRef.current.clock + 1 };
        setShark(sharkRef.current);
      }

      // Under the sea: a shark swims back and forth, and there is money lying
      // about. A coin that has been taken comes back after a while.
      if (roomRef.current === UNDERWATER) {
        const s = sharkRef.current;
        let sharkX = s.x + s.dir * SHARK_SPEED;
        let sharkDir = s.dir;
        if (sharkX <= 0) sharkDir = 1;
        if (sharkX >= WORLD_WIDTH - SHARK.width) sharkDir = -1;
        sharkX = Math.max(0, Math.min(WORLD_WIDTH - SHARK.width, sharkX));
        if (overlaps(hitbox, { x: sharkX + 8, y: SHARK.y + 6, width: SHARK.width - 16, height: SHARK.height - 12 })) {
          const heartsBefore = livesRef.current;
          hurt();
          // Each heart the shark takes makes its mouth snap wide open and shut again.
          if (livesRef.current < heartsBefore) sharkBiteFrames.current = SHARK_BITE_FRAMES;
        }
        if (sharkBiteFrames.current > 0) sharkBiteFrames.current -= 1;
        // 0 → 1 → 0 over the bite: how far open the mouth is.
        const bite = Math.sin((sharkBiteFrames.current / SHARK_BITE_FRAMES) * Math.PI);
        // The clock drives the little fish, which swim to and fro on their own.
        sharkRef.current = { x: sharkX, dir: sharkDir, bite, clock: s.clock + 1 };
        setShark(sharkRef.current);

        let changed = false;
        SEA_COINS.forEach((spot, i) => {
          const backAt = seaCoinBackAt.current[i];
          if (backAt === 0 && overlaps(hitbox, spot)) {
            seaCoinBackAt.current[i] = now + SEA_COIN_RESPAWN_MS;
            const value = COIN_VALUE * (bonusLevelRef.current === levelNow ? BLUE_EGG_MULTIPLIER : 1);
            setSave(sv => ({ ...sv, coins: sv.coins + value }));
            changed = true;
          } else if (backAt !== 0 && now >= backAt) {
            seaCoinBackAt.current[i] = 0;
            changed = true;
          }
        });
        if (changed) setSeaCoinsThere(seaCoinBackAt.current.map(t => t === 0));
      }

      // Everything below belongs to the meadow, which stands still while the
      // player is somewhere else.
      if (roomRef.current !== MEADOW) return;

      // Move bunny
      if (bunnyAliveRef.current) {
        const bn = bunnyRef.current;
        // Patrol back and forth, turning around at each end of the range.
        const bunnyX = Math.max(BUNNY_MIN_X, Math.min(BUNNY_MAX_X, bn.x + bunnyDir.current * BUNNY_SPEED));
        if (bunnyX <= BUNNY_MIN_X) bunnyDir.current = 1;
        if (bunnyX >= BUNNY_MAX_X) bunnyDir.current = -1;
        bunnyRef.current = { ...bn, x: bunnyX };
        setBunnyFacing(bunnyDir.current);
        setBunny(bunnyRef.current);
      }

      // Check egg collisions
      const remaining = eggsRef.current.filter(egg => !overlaps(hitbox, egg));
      if (remaining.length < eggsRef.current.length) {
        const taken = eggsRef.current.filter(egg => !remaining.includes(egg));
        // Every sixth egg collected earns a coin to pick up.
        for (let i = 0; i < taken.length; i++) {
          eggsCollected.current += 1;
          if (eggsCollected.current % EGGS_PER_COIN === 0) coinsOwed.current += 1;
        }
        const points = taken.reduce((sum, egg) => sum + (egg.gold ? GOLD_EGG_POINTS : 1), 0);
        // A red egg heals one lost heart (it does nothing extra at full health).
        if (taken.some(egg => egg.red) && livesRef.current < MAX_LIVES) {
          livesRef.current += 1;
          setLives(livesRef.current);
        }
        eggsRef.current = remaining;
        // All eggs collected: lay a fresh batch somewhere else and keep playing.
        if (remaining.length === 0) {
          const spots = nextEggs(lastBatch.current, hitbox);
          lastBatch.current = spots;
          // Counting every egg laid since the start of the game: each 15th is
          // red, and each fourth is golden (red wins when both apply).
          eggsRef.current = spots.map(spot => {
            const number = ++eggsLaid.current;
            const red = number % RED_EGG_INTERVAL === 0;
            return { ...spot, red, gold: !red && number % GOLD_EGG_INTERVAL === 0 };
          });
        }
        setEggs(eggsRef.current);
        scoreRef.current += points;
        setScore(scoreRef.current);
      }

      // Coin: pick it up for money, or drop a new one if one is owed.
      if (coinRef.current && overlaps(hitbox, coinRef.current)) {
        coinRef.current = null;
        setCoin(null);
        const value = COIN_VALUE * (bonusLevelRef.current === levelNow ? BLUE_EGG_MULTIPLIER : 1);
        setSave(s => ({ ...s, coins: s.coins + value }));
      }
      if (!coinRef.current && coinsOwed.current > 0) {
        const free = EGG_SPOTS.filter(
          spot =>
            !eggsRef.current.some(egg => egg.x === spot.x && egg.y === spot.y) &&
            !overlaps(hitbox, spot)
        );
        coinRef.current = free[Math.floor(Math.random() * free.length)];
        coinsOwed.current -= 1;
        setCoin(coinRef.current);
      }

      // Knife: from level 5 one lies somewhere in the meadow while the bunny
      // is still around; walking into it picks it up.
      if (
        levelNow >= KNIFE_LEVEL &&
        bunnyAliveRef.current &&
        !hasKnifeRef.current &&
        !knifeRef.current
      ) {
        const free = EGG_SPOTS.filter(
          spot =>
            !eggsRef.current.some(egg => egg.x === spot.x && egg.y === spot.y) &&
            !(coinRef.current && coinRef.current.x === spot.x && coinRef.current.y === spot.y) &&
            !overlaps(hitbox, spot)
        );
        knifeRef.current = free[Math.floor(Math.random() * free.length)];
        setKnife(knifeRef.current);
      } else if (knifeRef.current && overlaps(hitbox, knifeRef.current)) {
        knifeRef.current = null;
        setKnife(null);
        hasKnifeRef.current = true;
        setHasKnife(true);
      }

      // Storm cloud: from level 2 one appears above the screen at a random
      // place and travels straight down, all the way through the picture.
      // From level 5 the storm clouds are gone again.
      const cloudLevel = levelForScore(scoreRef.current);
      if (cloudLevel >= CLOUD_END_LEVEL) {
        if (cloudRef.current) {
          cloudRef.current = null;
          setCloud(null);
        }
      } else if (cloudLevel >= CLOUD_LEVEL) {
        const cloud = cloudRef.current;
        if (!cloud) {
          cloudDelay.current -= 1;
          if (cloudDelay.current <= 0) {
            cloudRef.current = {
              x: Math.random() * (WORLD_WIDTH - CLOUD_WIDTH),
              y: CLOUD_START_Y,
              width: CLOUD_WIDTH,
              height: CLOUD_HEIGHT,
            };
          }
        } else {
          const y = cloud.y + CLOUD_SPEED;
          const gone = y > WORLD_HEIGHT;
          cloudRef.current = gone ? null : { ...cloud, y };
          if (gone) cloudDelay.current = CLOUD_PAUSE_FRAMES;
        }
        setCloud(cloudRef.current);
      }

      // Check bunny and cloud collisions: each hit costs a heart, the last one ends the game.
      let touchingBunny = bunnyAliveRef.current && overlaps(hitbox, bunnyRef.current);
      if (touchingBunny && hasKnifeRef.current) {
        // The knife is used up on the bunny, which is gone until the next game.
        bunnyAliveRef.current = false;
        setBunnyAlive(false);
        hasKnifeRef.current = false;
        setHasKnife(false);
        touchingBunny = false;
      }
      // While rainbow-coloured the bunny cannot hurt the player.
      if (isRainbow) touchingBunny = false;
      const touchingEnemy =
        touchingBunny || (cloudRef.current !== null && overlaps(hitbox, cloudRef.current));
      if (touchingEnemy) hurt();
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameOver]);

  const restartGame = () => {
    body.current = initialBody();
    eggsRef.current = initialEggs();
    lastBatch.current = eggsRef.current;
    eggsLaid.current = eggsRef.current.length;
    bunnyRef.current = initialBunny();
    bunnyDir.current = -1;
    setBunnyFacing(-1);
    keys.current = { left: false, right: false, down: false, jump: false, jumpPressed: false };
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    graceFrames.current = 0;
    platformClock.current = 0;
    platformYsRef.current = restingPlatformYs();
    cloudRef.current = null;
    cloudDelay.current = CLOUD_PAUSE_FRAMES;
    setCloud(null);
    eggsCollected.current = 0;
    coinsOwed.current = 0;
    coinRef.current = null;
    setCoin(null);
    trail.current = [];
    setFollower({ x: 50, y: GROUND_LEVEL, facing: 1 });
    setShopOpen(false);
    roomRef.current = MEADOW;
    setRoom(MEADOW);
    stepRef.current = 0;
    bonusLevelRef.current = 0;
    setBonusLevel(0);
    knifeRef.current = null;
    setKnife(null);
    hasKnifeRef.current = false;
    setHasKnife(false);
    heatRef.current = 0;
    blueRef.current = 0;
    curedRef.current = false;
    setCured(false);
    rainbowEndsAt.current = 0;
    setRainbowSeconds(0);
    sharkBiteFrames.current = 0;
    skyHeartRef.current = 'floating';
    setSkyHeart('floating');
    rideRef.current = startOfRide();
    setRide(rideRef.current);
    shoreRef.current = startOfShore();
    setShore(shoreRef.current);
    fisherAnswer.current = null;
    sharkRef.current = { x: 500, dir: -1, bite: 0, clock: 0 };
    setShark(sharkRef.current);
    seaCoinBackAt.current = SEA_COINS.map(() => 0);
    setSeaCoinsThere(SEA_COINS.map(() => true));
    bunnyAliveRef.current = true;
    setBunnyAlive(true);
    setPlayer({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, crying: false, step: 0, vy: 0, swimming: false, flip: 0, heat: 0, blue: 0 });
    setLives(MAX_LIVES);
    setPlatformYs(platformYsRef.current);
    setEggs(eggsRef.current);
    setBunny(bunnyRef.current);
    setScore(0);
    setGameOver(false);
  };

  // Revive: pay to carry on where the game ended, with all hearts back and
  // the score, level and place kept.
  const revive = () => {
    if (!gameOver || save.coins < REVIVE_PRICE) return;
    setSave(s => ({ ...s, coins: s.coins - REVIVE_PRICE }));
    livesRef.current = MAX_LIVES;
    setLives(MAX_LIVES);
    graceFrames.current = HIT_GRACE_FRAMES; // A moment to get away from whatever ended the game
    keys.current = { left: false, right: false, down: false, jump: false, jumpPressed: false };
    setShopOpen(false);
    setGameOver(false);
  };

  // Enter restarts the game from the Game Over screen; Escape leaves the shop.
  useEffect(() => {
    if (!gameOver) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !shopOpen) {
        e.preventDefault();
        restartGame();
      } else if (e.key === 'Escape' && shopOpen) {
        setShopOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver, shopOpen]);

  return (
    <div className="h-screen bg-gradient-to-b from-sky-300 to-sky-100 flex items-center justify-center overflow-hidden">
      {/* The game is always simulated at 800×400 and scaled up to fit the window */}
      <div style={{ width: WORLD_WIDTH * scale, height: WORLD_HEIGHT * scale }}>
      <div
        className="relative w-[800px] h-[400px] bg-gradient-to-b from-sky-400 to-sky-100 rounded-lg shadow-2xl overflow-hidden"
        data-room={room}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {/* Background scenery: sun, clouds, distant mountains and rolling hills */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 400"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="moonGlow">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>

          {/* Night sky: fades in over the daytime sky from level 4 */}
          <rect
            width="800"
            height="400"
            fill="url(#nightSky)"
            style={{ opacity: isNight ? 1 : 0, transition: NIGHT_TRANSITION }}
          />

          {/* Stars */}
          <g fill="#ffffff" style={{ opacity: isNight ? 1 : 0, transition: NIGHT_TRANSITION }}>
            {STARS.map((star, i) => (
              <circle key={i} cx={star.x} cy={star.y} r={star.r}>
                {/* Every third star twinkles */}
                {i % 3 === 0 && (
                  <animate
                    attributeName="opacity"
                    values="1;0.25;1"
                    dur={`${2 + (i % 5) * 0.6}s`}
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            ))}
          </g>

          {/* Sun: sinks behind the mountains when night falls */}
          <g
            style={{
              transform: isNight ? 'translateY(300px)' : 'translateY(0px)',
              // Faded out as well, since nothing hides it below the horizon up in the sky
              opacity: isNight ? 0 : 1,
              transition: NIGHT_TRANSITION,
            }}
          >
            {/* Drawn around (540, 70) and moved to where this place has its sun */}
            <g transform={`translate(${scenery.sun.x - 540} ${scenery.sun.y - 70})`}>
            <circle cx="540" cy="70" r="75" fill="url(#sunGlow)" />
            <circle cx="540" cy="70" r="30" fill="#fde047" />
            {/* Sunglasses and a smile */}
            <g aria-label="Sunglasses">
              <path d="M511 62 H569" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M517 60 H537 Q538 60 538 62 Q538 76 527 76 Q516 76 516 62 Q516 60 517 60 Z" fill="#111827" />
              <path d="M543 60 H563 Q564 60 564 62 Q564 76 553 76 Q542 76 542 62 Q542 60 543 60 Z" fill="#111827" />
              {/* Glints on the lenses */}
              <path d="M520 64 L525 64 M546 64 L551 64" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <path d="M529 84 Q540 93 551 84" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>

          {/* Moon: rises from behind the mountains when night falls */}
          <g
            style={{
              transform: isNight ? 'translateY(0px)' : 'translateY(300px)',
              opacity: isNight ? 1 : 0,
              transition: NIGHT_TRANSITION,
            }}
          >
            <circle cx="410" cy="85" r="60" fill="url(#moonGlow)" />
            <circle cx="410" cy="85" r="26" fill="#fef9c3" />
            <g fill="#e7e5a8">
              <circle cx="401" cy="77" r="5" />
              <circle cx="419" cy="92" r="6.5" />
              <circle cx="406" cy="98" r="3" />
            </g>
          </g>

          {/* Clouds: fade away at night */}
          {/* Each cloud drifts from off-screen left to off-screen right and
              starts over; the negative start time spreads them out at load. */}
          <g fill="#ffffff" style={{ opacity: isNight ? 0 : 0.85, transition: NIGHT_TRANSITION }}>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-70 0"
                to="860 0"
                dur="70s"
                begin="-24s"
                repeatCount="indefinite"
              />
              <ellipse cx="0" cy="70" rx="38" ry="13" />
              <ellipse cx="25" cy="60" rx="24" ry="13" />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-70 0"
                to="860 0"
                dur="95s"
                begin="-50s"
                repeatCount="indefinite"
              />
              <ellipse cx="0" cy="115" rx="30" ry="10" />
              <ellipse cx="18" cy="107" rx="18" ry="10" />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-70 0"
                to="860 0"
                dur="120s"
                begin="-98s"
                repeatCount="indefinite"
              />
              <ellipse cx="0" cy="140" rx="34" ry="11" />
            </g>
          </g>

          {/* The landscape is not visible from up in the sky */}
          {hasMeadowLand && (
          <g>
          {/* Distant mountains (taller ones at the trampoline place) */}
          <path d={scenery.mountains} fill="#93c5fd" opacity="0.7" />
          {/* Snow caps */}
          {scenery.snowCaps.map(cap => (
            <path key={cap} d={cap} fill="#ffffff" opacity="0.8" />
          ))}

          {/* Far hills, with blades of grass along the top and tufts on the slope */}
          <g style={{ filter: grassFilter, transition: 'filter 3s ease-in-out' }}>
            {/* Each blade bends back and forth in the wind */}
            <GrassBlades grass={FAR_HILL_GRASS[0]} fill="#4ade80" seconds={4.6} />
            <GrassBlades grass={FAR_HILL_GRASS[1]} fill="#bbf7d0" seconds={4.6} />
          </g>
          <path
            d="M0 330 L0 270 Q100 215 220 265 T440 260 T660 250 T800 265 L800 330 Z"
            fill="#86efac"
          />
          <path d={FAR_HILL_TUFTS} fill="#4ade80" />
          {/* A few trees standing on the far hills (only at the trampoline place) */}
          <g style={{ filter: grassFilter, transition: 'filter 3s ease-in-out' }}>
            {scenery.trees.map(tree => (
              <g
                key={tree.x}
                data-tree
                transform={`translate(${tree.x} ${farHillY(tree.x) + 5}) scale(${tree.size})`}
              >
                <path d="M-3.5 0 L-2.5 -26 H2.5 L3.5 0 Z" fill="#78350f" />
                <circle cx="-10" cy="-30" r="12" fill="#15803d" />
                <circle cx="10" cy="-31" r="12" fill="#166534" />
                <circle cx="0" cy="-42" r="14" fill="#16a34a" />
                <circle cx="-4" cy="-45" r="6" fill="#22c55e" />
              </g>
            ))}
          </g>
          {/* Near hills, the same but with taller grass in three greens */}
          <g style={{ filter: grassFilter, transition: 'filter 3s ease-in-out' }}>
            <GrassBlades grass={NEAR_HILL_GRASS[0]} fill="#16a34a" seconds={3.8} />
            <GrassBlades grass={NEAR_HILL_GRASS[1]} fill="#22c55e" seconds={3.8} />
            <GrassBlades grass={NEAR_HILL_GRASS[2]} fill="#86efac" seconds={3.8} />
          </g>
          <path
            d="M0 330 L0 300 Q80 265 180 295 T380 290 T580 295 T800 285 L800 330 Z"
            fill="#4ade80"
          />
          <path d={NEAR_HILL_TUFTS} fill="#16a34a" />
          {/* Night tint over the mountains and hills */}
          <rect
            width="800"
            height="400"
            fill="#0f172a"
            style={{ opacity: isNight ? 0.5 : 0, transition: NIGHT_TRANSITION }}
            mask="url(#landMask)"
          />
          <mask id="landMask">
            <path d={scenery.mountains} fill="#ffffff" />
            <path d="M0 330 L0 270 Q100 215 220 265 T440 260 T660 250 T800 265 L800 330 Z" fill="#ffffff" />
            <path d="M0 330 L0 300 Q80 265 180 295 T380 290 T580 295 T800 285 L800 330 Z" fill="#ffffff" />
          </mask>
          </g>
          )}
        </svg>

        {/* The beach: a sunset over the sea, with sand on the left half and water on the right */}
        {room === BEACH && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 400"
            preserveAspectRatio="none"
            role="img"
            aria-label="Beach at sunset"
          >
            <defs>
              <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#312e81" />
                <stop offset="35%" stopColor="#9d174d" />
                <stop offset="65%" stopColor="#f97316" />
                <stop offset="82%" stopColor="#fde68a" />
              </linearGradient>
              <radialGradient id="sunsetGlow">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="beachSand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="beachSea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            {/* Sky */}
            <rect width="800" height="400" fill="url(#sunsetSky)" />
            {/* Sun going down into the sea */}
            <circle cx="610" cy="318" r="130" fill="url(#sunsetGlow)" />
            <circle cx="610" cy="318" r="48" fill="#fde047" />
            {/* Evening clouds */}
            <g fill="#831843" opacity="0.55">
              <ellipse cx="170" cy="120" rx="90" ry="10" />
              <ellipse cx="230" cy="134" rx="60" ry="7" />
              <ellipse cx="520" cy="90" rx="110" ry="9" />
              <ellipse cx="700" cy="170" rx="70" ry="7" />
            </g>
            {/* Seagulls */}
            <g stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M300 180 q8 -8 16 0 q8 -8 16 0" />
              <path d="M360 150 q6 -6 12 0 q6 -6 12 0" />
            </g>

            {/* Sea: the right half of the ground, out to the horizon */}
            <rect x={BEACH_WATER_X} y="320" width={800 - BEACH_WATER_X} height="80" fill="url(#beachSea)" />
            {/* The sun's reflection */}
            <g fill="#fde047" opacity="0.55">
              <rect x="572" y="326" width="76" height="4" rx="2" />
              <rect x="584" y="338" width="52" height="4" rx="2" />
              <rect x="592" y="351" width="36" height="4" rx="2" />
              <rect x="600" y="365" width="20" height="4" rx="2" />
            </g>

            {/* Sand: the left half of the ground, sloping into the water */}
            <path
              d={`M0 320 H${BEACH_WATER_X} Q${BEACH_WATER_X + 16} 352 ${BEACH_WATER_X + 34} 400 H0 Z`}
              fill="url(#beachSand)"
            />
            {/* Shells and a starfish */}
            <g fill="#fff7ed" stroke="#c2410c" strokeWidth="1">
              <path d="M250 372 q7 -12 14 0 Z" />
              <path d="M130 384 q5 -9 10 0 Z" />
            </g>
            <path
              d="M330 368 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 Z"
              fill="#fb7185"
              stroke="#be123c"
              strokeWidth="1"
            />

            {/* Palm tree */}
            <path d="M92 322 Q84 250 104 196 L112 198 Q98 252 104 322 Z" fill="#78350f" />
            <g fill="#14532d">
              <path d="M108 198 Q70 170 34 190 Q66 180 104 204 Z" />
              <path d="M108 198 Q84 150 48 146 Q80 160 102 202 Z" />
              <path d="M108 198 Q118 148 156 136 Q128 158 114 202 Z" />
              <path d="M108 198 Q150 172 186 190 Q152 182 112 204 Z" />
              <path d="M108 198 Q140 196 166 222 Q138 208 110 206 Z" />
            </g>
          </svg>
        )}

        {/* Under the sea: deep blue water, light from above, bubbles and a sandy bottom */}
        {(room === UNDERWATER || room === DEEP_SEA) && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 400"
            preserveAspectRatio="none"
            role="img"
            aria-label="Under the sea"
          >
            <defs>
              <linearGradient id="deepSea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="45%" stopColor="#0369a1" />
                <stop offset="100%" stopColor="#082f49" />
              </linearGradient>
            </defs>
            <rect width="800" height="400" fill="url(#deepSea)" />
            {/* Light rays from the surface */}
            <g fill="#e0f2fe" opacity="0.12">
              <path d="M120 0 L200 0 L120 400 L20 400 Z" />
              <path d="M380 0 L440 0 L420 400 L330 400 Z" />
              <path d="M600 0 L690 0 L780 400 L660 400 Z" />
            </g>
            {/* Bubbles drifting up */}
            <g fill="none" stroke="#e0f2fe" strokeWidth="1.5" opacity="0.7">
              {[
                { x: 150, r: 5, dur: 7, begin: 0 },
                { x: 165, r: 3, dur: 6, begin: -2 },
                { x: 470, r: 4, dur: 8, begin: -5 },
                { x: 640, r: 6, dur: 9, begin: -3 },
                { x: 655, r: 3, dur: 6.5, begin: -1 },
              ].map(bubble => (
                <circle key={`${bubble.x}-${bubble.r}`} cx={bubble.x} cy="380" r={bubble.r}>
                  <animate
                    attributeName="cy"
                    from="380"
                    to="-10"
                    dur={`${bubble.dur}s`}
                    begin={`${bubble.begin}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
            {room === UNDERWATER ? (
              <>
                {/* Sandy bottom, rocks and seaweed */}
                <path d="M0 400 V376 Q120 364 260 378 T520 374 T800 372 V400 Z" fill="#d6b46a" />
                <g fill="#475569">
                  <ellipse cx="310" cy="380" rx="26" ry="12" />
                  <ellipse cx="620" cy="378" rx="34" ry="14" />
                </g>
                <g fill="none" stroke="#15803d" strokeWidth="6" strokeLinecap="round">
                  <path d="M160 380 Q148 350 162 322 Q172 300 158 276" />
                  <path d="M178 380 Q190 356 178 334" />
                  <path d="M500 378 Q512 348 498 320 Q488 300 502 282" />
                  <path d="M760 376 Q748 350 762 326" />
                </g>
              </>
            ) : (
              <>
                {/* The hole: the right half of the bottom drops away into the dark */}
                <defs>
                  <linearGradient id="seaHole" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#082f49" stopOpacity="0" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                </defs>
                <rect x={SEA_HOLE_X} y="300" width={800 - SEA_HOLE_X} height="100" fill="url(#seaHole)" />
                {/* The sand covers the left half and ends in a steep edge */}
                <path
                  d={`M0 400 V374 Q110 362 240 376 T${SEA_HOLE_X - 14} 370 Q${SEA_HOLE_X + 2} 372 ${SEA_HOLE_X} 400 Z`}
                  fill="#d6b46a"
                />
                <path
                  d={`M${SEA_HOLE_X - 14} 370 Q${SEA_HOLE_X + 2} 372 ${SEA_HOLE_X} 400`}
                  fill="none"
                  stroke="#a16207"
                  strokeWidth="3"
                />
                {/* Rocks and seaweed */}
                <g fill="#475569">
                  <ellipse cx="205" cy="380" rx="22" ry="10" />
                </g>
                <g fill="none" stroke="#15803d" strokeWidth="6" strokeLinecap="round">
                  <path d="M20 378 Q8 350 22 324 Q32 304 18 282" />
                  <path d="M258 380 Q270 356 258 334" />
                </g>
                {/* Corals of several kinds and colours on the sand */}
                <Coral x={62} y={374} color="#f472b6" />
                <Coral x={112} y={372} color="#fb923c" kind="fan" size={0.9} />
                <Coral x={160} y={376} color="#a78bfa" kind="brain" />
                <Coral x={232} y={372} color="#f87171" size={1.15} />
                <Coral x={296} y={376} color="#fde047" kind="brain" size={0.8} />
                <Coral x={332} y={374} color="#2dd4bf" kind="fan" size={1.1} />
                <Coral x={374} y={372} color="#e879f9" size={0.8} />
              </>
            )}
          </svg>
        )}

        {/* The long fall from the far cloud: a huge, happy cat fills the background */}
        {room === CAT_FALL && <BigCat />}
        {/* ...with a great many coins and eggs to grab on the way down */}
        {room === CAT_FALL &&
          CAT_LOOT.map(
            (item, i) =>
              !catLoot[i] && (
                <div
                  key={i}
                  className="absolute"
                  data-cat-loot={item.coin ? 'coin' : 'egg'}
                  style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
                >
                  {item.coin ? <Coin /> : <Egg className="w-8 h-8 text-white fill-white/40" />}
                </div>
              )
          )}

        {/* The dark place below the hole in the seabed: nothing but black (and the angel) */}
        {room === DARK && <div className="absolute inset-0 bg-black" role="img" aria-label="Dark place" />}

        {/* Score */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="bg-white px-4 py-2 rounded-full shadow-md">
            <p className="text-lg font-bold text-green-600">Score: {score}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-full shadow-md">
            <p className="text-lg font-bold text-amber-600">Level {level}</p>
          </div>
          {/* Lives */}
          <div
            className="bg-white px-3 py-2 rounded-full shadow-md flex items-center gap-1"
            role="img"
            aria-label={`Lives: ${lives} of ${MAX_LIVES}`}
          >
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <Heart
                key={i}
                className={
                  i < lives ? 'w-7 h-7 text-red-500 fill-red-500' : 'w-7 h-7 text-gray-300'
                }
              />
            ))}
          </div>
          {/* Money */}
          <div
            className="bg-white px-3 py-2 rounded-full shadow-md flex items-center gap-1"
            role="img"
            aria-label={`Money: ${save.coins} kr`}
          >
            <Coin size={24} />
            <span className="font-bold text-amber-700">{save.coins} kr</span>
            {/* Blue egg bonus: coins count double for the rest of this level */}
            {doubleCoins && (
              <span
                className="text-xs font-bold text-white bg-blue-500 rounded-full px-1.5 py-0.5"
                aria-label="Coins are worth double"
              >
                ×{BLUE_EGG_MULTIPLIER}
              </span>
            )}
          </div>
          {/* Rainbow time left: safe from the bunny for as long as it lasts */}
          {rainbow && (
            <div
              className="px-3 py-2 rounded-full shadow-md font-bold text-white"
              style={{ background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7)' }}
              role="img"
              aria-label={`Rainbow: ${rainbowSeconds} seconds left`}
            >
              {rainbowSeconds}s
            </div>
          )}
          {/* Knife in hand */}
          {hasKnife && (
            <div className="bg-white px-2 py-1.5 rounded-full shadow-md" role="img" aria-label="Holding the knife">
              <KnifeIcon size={26} />
            </div>
          )}
        </div>

        {/* Level-up banner */}
        {levelUp !== null && !gameOver && (
          <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none z-10">
            <div className="bg-amber-400 text-white font-bold text-xl px-6 py-2 rounded-full shadow-lg animate-bounce">
              Level {levelUp}!{levelUp === HEN_LEVEL && ' You are a hen now!'}
            </div>
          </div>
        )}

        {/* Ground (there is none in the sky) */}
        {hasMeadowLand && (
          <div className="absolute bottom-0 w-full h-20 bg-gradient-to-b from-green-500 to-green-600">
            {/* Night tint */}
            <div
              className="absolute inset-0 bg-slate-900"
              style={{ opacity: isNight ? 0.5 : 0, transition: NIGHT_TRANSITION }}
            />
          </div>
        )}

        {/* Grass on the ground: blades standing up along its top edge and tufts on its face */}
        {hasMeadowLand && (
          <svg
            className="absolute pointer-events-none"
            style={{ left: 0, top: 320, filter: grassFilter, transition: 'filter 3s ease-in-out' }}
            width="800"
            height="80"
            viewBox="0 0 800 80"
            overflow="visible"
            role="img"
            aria-label="Grass"
          >
            <path d={GROUND_TUFTS} fill="#15803d" opacity="0.8" />
            <GrassBlades grass={GROUND_GRASS[0]} fill="#15803d" seconds={3.1} />
            <GrassBlades grass={GROUND_GRASS[1]} fill="#22c55e" seconds={3.1} />
            <GrassBlades grass={GROUND_GRASS[2]} fill="#4ade80" seconds={3.1} />
          </svg>
        )}

        {/* Signposts between the meadow and the trampoline place */}
        {room === MEADOW && <Signpost x={762} label="→" />}
        {room === TRAMPOLINE_PLACE && <Signpost x={8} label="←" />}
        {room === TRAMPOLINE_PLACE && <Signpost x={762} label="→" />}
        {room === BEACH && <Signpost x={8} label="←" />}

        {/* Trampoline */}
        {room === TRAMPOLINE_PLACE && <Trampoline {...TRAMPOLINE} />}

        {/* The big cloud high up, half the picture wide, with the rooster on it */}
        {room === HIGH_SKY && (
          <>
            <CloudPlatform {...HIGH_CLOUD} />
            <Rooster x={ROOSTER_X} y={HIGH_CLOUD.y - 58} facing={1} />
            {skyHeart === 'given' ? (
              // Once the rooster has been given the heart, a big one floats above the two
              <div
                className="absolute animate-bounce"
                style={{
                  // Midway between the rooster and the player while they stand together
                  left: Math.min(ROOSTER_X + 60, (ROOSTER_X + 32 + player.x + 20) / 2 - 24),
                  top: HIGH_CLOUD.y - 128,
                }}
              >
                <Heart
                  aria-label="Heart above the two"
                  className="w-12 h-12 text-red-600 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                />
              </div>
            ) : (
              <div
                className="absolute bg-white text-gray-800 text-sm font-semibold px-3 py-1.5 rounded-2xl shadow-md whitespace-nowrap"
                style={{ left: ROOSTER_X - 20, top: HIGH_CLOUD.y - 102 }}
                role="note"
              >
                Cock-a-doodle-doo!
                <span
                  className="absolute bg-white"
                  style={{ left: 50, bottom: -5, width: 12, height: 12, transform: 'rotate(45deg)' }}
                />
              </div>
            )}
          </>
        )}

        {/* The next place to the west: more sky, and the big cloud carrying on over the right half */}
        {room === HIGH_SKY_WEST && (
          <>
            <CloudPlatform {...HIGH_WEST_CLOUD} />
            {/* A heart out in the open air beyond the end of the cloud, to jump out to */}
            {skyHeart === 'floating' && (
              <div
                className="absolute animate-pulse"
                style={{ transform: `translate(${SKY_HEART.x}px, ${SKY_HEART.y}px)` }}
              >
                <Heart
                  aria-label="Heart to collect"
                  className="w-8 h-8 text-red-600 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]"
                />
              </div>
            )}
          </>
        )}

        {/* The cloud up in the sky, and the blue egg lying on it */}
        {room === SKY && (
          <>
            <CloudPlatform {...SKY_CLOUD} />
            {/* The second trampoline, which shoots the player up to the big cloud */}
            <Trampoline {...SKY_TRAMPOLINE} />
            {!doubleCoins && (
              <div
                className="absolute"
                style={{ transform: `translate(${BLUE_EGG.x}px, ${BLUE_EGG.y}px)` }}
              >
                <Egg
                  aria-label="Blue egg"
                  className="w-8 h-8 text-blue-800 fill-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.9)]"
                />
              </div>
            )}
          </>
        )}

        {/* Under the sea: the shark and the money */}
        {room === UNDERWATER && (
          <>
            {SEA_COINS.map(
              (spot, i) =>
                seaCoinsThere[i] && (
                  <div
                    key={i}
                    className="absolute"
                    style={{ transform: `translate(${spot.x}px, ${spot.y}px)` }}
                  >
                    <Coin />
                  </div>
                )
            )}
            {/* Six little coloured fish that swim about and do no harm */}
            {SEA_FISH.map(fish => {
              // Back and forth across the water at its own pace, bobbing gently.
              const span = WORLD_WIDTH - 30;
              const travelled = (fish.start + shark.clock * fish.speed) % (span * 2);
              const goingRight = travelled < span;
              return (
                <SmallFish
                  key={fish.color}
                  x={goingRight ? travelled : span * 2 - travelled}
                  y={fish.y + Math.sin(shark.clock * 0.04 + fish.start) * 7}
                  dir={goingRight ? 1 : -1}
                  color={fish.color}
                  stripe={fish.stripe}
                />
              );
            })}
            <Shark x={shark.x} y={SHARK.y} dir={shark.dir} bite={shark.bite} />
            <p className="absolute bottom-1 inset-x-0 text-center text-xs font-semibold text-sky-100/90 pointer-events-none">
              Swim with the arrow keys · swim up to the surface to get out
            </p>
          </>
        )}

        {/* Above the open sea: the water, and the boat riding on it */}
        {room === SEA_TOP && (
          <>
            <svg
              className="absolute pointer-events-none"
              style={{ left: 0, top: 300 }}
              width="800"
              height="100"
              viewBox="0 0 800 100"
              role="img"
              aria-label="Open sea"
            >
              <defs>
                <linearGradient id="openSea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <rect y="14" width="800" height="86" fill="url(#openSea)" />
              {/* Waves rolling slowly sideways */}
              <g fill="#0ea5e9">
                <path d="M-80 16 Q-60 4 -40 16 T0 16 T40 16 T80 16 T120 16 T160 16 T200 16 T240 16 T280 16 T320 16 T360 16 T400 16 T440 16 T480 16 T520 16 T560 16 T600 16 T640 16 T680 16 T720 16 T760 16 T800 16 T840 16 T880 16 V30 H-80 Z">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 0"
                    to="80 0"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            </svg>
            {/* The deck sits just under the player's feet, bobbing with the waves */}
            <Boat x={ride.boatX} y={BOAT_DECK_Y + 4 + Math.sin(ride.clock * 0.05) * 3} />
            {ride.phase === 'boat' && (
              <p className="absolute bottom-1 inset-x-0 text-center text-xs font-semibold text-sky-100 pointer-events-none">
                Steer the boat with ← → · sail out to the left to reach the beach
              </p>
            )}
          </>
        )}

        {/* The angel: waiting in the dark, carrying the player, or flying off again */}
        {(room === DARK || room === SEA_TOP) && ride.angelY > -90 && (
          <Angel x={ride.angelX} y={ride.angelY} flap={Math.sin(ride.clock * 0.18)} />
        )}

        {/* Further out in the sea: a turtle, more fish, frogs and a herring. None of them do any harm. */}
        {room === DEEP_SEA && (
          <>
            {DEEP_SEA_FISH.map(fish => {
              const span = WORLD_WIDTH - 30;
              const travelled = (fish.start + shark.clock * fish.speed) % (span * 2);
              const goingRight = travelled < span;
              return (
                <SmallFish
                  key={fish.color}
                  x={goingRight ? travelled : span * 2 - travelled}
                  y={fish.y + Math.sin(shark.clock * 0.04 + fish.start) * 7}
                  dir={goingRight ? 1 : -1}
                  color={fish.color}
                  stripe={fish.stripe}
                />
              );
            })}
            {(() => {
              // The herring darts to and fro near the surface...
              const span = WORLD_WIDTH - 48;
              const travelled = (500 + shark.clock * 2.4) % (span * 2);
              const goingRight = travelled < span;
              return (
                <Herring
                  x={goingRight ? travelled : span * 2 - travelled}
                  y={48 + Math.sin(shark.clock * 0.07) * 10}
                  dir={goingRight ? 1 : -1}
                />
              );
            })()}
            {(() => {
              // ...and the turtle paddles slowly across the middle.
              const span = WORLD_WIDTH - 72;
              const travelled = (900 + shark.clock * 0.6) % (span * 2);
              const goingRight = travelled < span;
              const turtleX = goingRight ? travelled : span * 2 - travelled;
              const turtleY = 140 + Math.sin(shark.clock * 0.02) * 14;
              return (
                <>
                  <Turtle
                    x={turtleX}
                    y={turtleY}
                    dir={goingRight ? 1 : -1}
                    flap={Math.sin(shark.clock * 0.08) * 22}
                  />
                  {/* Until the cure has been taken, the turtle offers it */}
                  {!cured && (
                    <div
                      className="absolute bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-md text-center leading-tight"
                      style={{
                        width: 190,
                        left: Math.max(4, Math.min(WORLD_WIDTH - 194, turtleX - 60)),
                        top: turtleY - 48,
                      }}
                      role="note"
                    >
                      Would you like a cure for not being able to breathe under water?
                    </div>
                  )}
                </>
              );
            })()}
            {/* The cure: a magic bottle in purple, pink and blue, bobbing in the water */}
            {!cured && (
              <div
                className="absolute"
                style={{
                  transform: `translate(${MAGIC_BOTTLE.x}px, ${
                    MAGIC_BOTTLE.y + Math.sin(shark.clock * 0.06) * 4
                  }px)`,
                }}
              >
                <MagicBottle />
              </div>
            )}
            {/* One frog sits on the sand; the other swims up and down, kicking */}
            <Frog x={78} y={344} dir={1} kick={0} />
            <Frog
              x={300 + Math.sin(shark.clock * 0.011) * 60}
              y={230 + Math.sin(shark.clock * 0.017) * 70}
              dir={Math.cos(shark.clock * 0.011) >= 0 ? 1 : -1}
              kick={(Math.sin(shark.clock * 0.16) + 1) / 2}
            />
            <p className="absolute bottom-1 left-2 text-xs font-semibold text-sky-100/90 pointer-events-none">
              Swim left to go back
            </p>
          </>
        )}

        {/* Hint at the beach: how to get under the water */}
        {room === BEACH && (
          <p
            className="absolute text-xs font-semibold text-white pointer-events-none"
            style={{ left: BEACH_WATER_X + 130, top: 378 }}
          >
            Press ↓ in the water to dive
          </p>
        )}

        {/* The fisher at the beach, offering water, with the water bottle beside him */}
        {room === BEACH && (
          <>
            {/* The boat: sailing in with the player, lying on the sand, or leaving with the fisher */}
            {ride.phase === 'boat' && (
              <Boat x={ride.boatX} y={BOAT_DECK_Y + 4 + Math.sin(ride.clock * 0.05) * 3} />
            )}
            {ride.phase !== 'boat' && shore.boat === 'landed' && <Boat x={SHORE_BOAT_X} y={BOAT_DECK_Y + 4} />}

            {(() => {
              if (shore.fisher === 'gone') return null;
              if (shore.answer === 'yes') {
                const f = shore.frames;
                if (f < FISHER_BOARD_FRAMES) {
                  // Climbing into the boat: a hop from the sand onto the deck
                  const t = f / FISHER_BOARD_FRAMES;
                  return (
                    <Fisher
                      x={FISHER_X + (SHORE_BOAT_X + 14 - FISHER_X) * t}
                      y={238 - 36 * t - Math.sin(t * Math.PI) * 34}
                      withLine={false}
                    />
                  );
                }
                // Sailing off towards the sun, smaller and smaller
                const t = Math.min(1, (f - FISHER_BOARD_FRAMES) / FISHER_SAIL_FRAMES);
                const size = 1 - 0.96 * t;
                return (
                  <div
                    className="absolute"
                    data-sailing-away
                    style={{
                      left: 0,
                      top: 0,
                      width: BOAT_WIDTH,
                      transformOrigin: '0 0',
                      transform: `translate(${
                        SHORE_BOAT_X + (BEACH_SUN.x - (BOAT_WIDTH / 2) * size - SHORE_BOAT_X) * t
                      }px, ${BOAT_DECK_Y + 4 + (BEACH_SUN.y - 6 - BOAT_DECK_Y) * t}px) scale(${size})`,
                    }}
                  >
                    <Boat x={0} y={0} />
                    <Fisher x={14} y={-102} withLine={false} />
                  </div>
                );
              }
              if (shore.answer === 'no') {
                // Hat off; the rod turns into a sword; then the swing
                const f = shore.frames;
                const sword = Math.max(
                  0,
                  Math.min(1, (f - SWORD_START_FRAME) / (SWORD_READY_FRAME - SWORD_START_FRAME))
                );
                const swing =
                  f < SWORD_HIT_FRAME - 12
                    ? 0
                    : f < SWORD_HIT_FRAME
                    ? (f - (SWORD_HIT_FRAME - 12)) / 12
                    : f < SWORD_HIT_FRAME + 40
                    ? 1
                    : Math.max(0, 1 - (f - SWORD_HIT_FRAME - 40) / 25);
                return (
                  <Fisher
                    x={FISHER_X}
                    // He turns towards the player to strike
                    facing={player.x + PLAYER_SIZE / 2 < FISHER_X + 32 ? -1 : 1}
                    hatOff
                    sword={sword}
                    swing={swing}
                  />
                );
              }
              return <Fisher x={FISHER_X} />;
            })()}

            {/* The fisher asks for the boat once it lies on the sand: answer with the buttons, or Y / N */}
            {shore.boat === 'landed' && shore.answer === null && (
              <div
                className="absolute bg-white text-gray-800 text-sm font-semibold px-3 py-2 rounded-2xl shadow-md text-center z-10"
                style={{ left: FISHER_X - 56, top: 150 }}
                role="dialog"
                aria-label="The fisher asks for the boat"
              >
                <p className="whitespace-nowrap mb-1.5">May I have the boat?</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => (fisherAnswer.current = 'yes')}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-0.5 rounded-full transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => (fisherAnswer.current = 'no')}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-0.5 rounded-full transition-colors"
                  >
                    No
                  </button>
                </div>
                <span
                  className="absolute bg-white"
                  style={{ left: 84, bottom: -5, width: 12, height: 12, transform: 'rotate(45deg)' }}
                />
              </div>
            )}

            {!rainbow && (
              <>
                {/* His offer of water, while he has nothing else on his mind */}
                {shore.fisher === 'here' && shore.answer === null && shore.boat !== 'landed' && (
                  <div
                    className="absolute bg-white text-gray-800 text-sm font-semibold px-3 py-1.5 rounded-2xl shadow-md whitespace-nowrap"
                    style={{ left: FISHER_X - 70, top: 198 }}
                    role="note"
                  >
                    Would you like some water?
                    {/* Tail of the speech bubble */}
                    <span
                      className="absolute bg-white"
                      style={{ left: 96, bottom: -5, width: 12, height: 12, transform: 'rotate(45deg)' }}
                    />
                  </div>
                )}
                <div
                  className="absolute"
                  style={{ transform: `translate(${WATER_BOTTLE.x}px, ${WATER_BOTTLE.y}px)` }}
                >
                  <WaterBottle />
                </div>
              </>
            )}
          </>
        )}

        {/* Knife to pick up */}
        {room === MEADOW && knife && (
          <div className="absolute" style={{ transform: `translate(${knife.x}px, ${knife.y}px)` }}>
            <KnifeIcon size={30} />
          </div>
        )}

        {/* Platforms */}
        {room === MEADOW && PLATFORMS.map((platform, index) => (
          <div
            key={index}
            className="absolute bg-gradient-to-b from-brown-400 to-brown-600 rounded-md"
            style={{
              transform: `translate(${platform.x}px, ${platformYs[index]}px)`,
              width: platform.width + 'px',
              height: platform.height + 'px',
              backgroundColor: '#8B4513',
            }}
          />
        ))}

        {/* Player: leans slightly into the direction of travel */}
        <div
          className={`absolute w-10 h-10${rainbow ? ' rainbow' : ''}`}
          style={{
            transform: `translate(${player.x}px, ${player.y}px) rotate(${player.vx * 2 + player.flip}deg)`,
          }}
        >
          {/* Chicken Body: mirrored to face the way it is moving */}
          {isHen ? (
            <svg
              className="absolute"
              // Swimming sideways, the hen leans forward into it.
              style={{
                left: -4,
                top: -6,
                transform: `scaleX(${player.facing}) rotate(${swimSideways ? 24 : 0}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              width="48"
              height="48"
              viewBox="0 0 48 48"
              overflow="visible"
              role="img"
              aria-label="Hen"
            >
              {/* Legs and feet (gone while swimming downwards) */}
              <g
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity={swimDown ? 0 : 1}
              >
                {/* Each leg swings around its hip, the two in opposite directions */}
                <path d="M19 38 V46 M15 46 H23" transform={`rotate(${legAngle} 19 38)`} />
                <path d="M27 38 V46 M23 46 H31" transform={`rotate(${-legAngle} 27 38)`} />
              </g>
              {/* Tail feathers */}
              <g fill="#fef3c7" stroke="#a16207" strokeWidth="1.2" strokeLinejoin="round">
                <path d="M12 27 Q0 20 3 7 Q11 12 15 22 Z" />
                <path d="M11 30 Q-1 30 1 18 Q9 20 14 26 Z" />
              </g>
              {/* Body, neck and head */}
              <path
                d="M8 29 Q8 18 20 18 Q26 18 28 14 Q29 6 36 6 Q43 6 43 14 Q43 20 39 23 Q40 40 23 40 Q8 40 8 29 Z"
                fill="#fffbeb"
                stroke="#a16207"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Wing (flapping while swimming sideways or upwards) */}
              <path
                d="M13 27 Q21 21 30 27 Q25 36 13 31 Z"
                fill="#fde68a"
                stroke="#a16207"
                strokeWidth="1.2"
                strokeLinejoin="round"
                transform={`rotate(${wingFlap * 0.8} 28 27)`}
              />
              {/* Head going red in the sun at the beach, or blue when out of breath under water */}
              <circle
                data-sunburn
                cx="36"
                cy="13.5"
                r="6.6"
                fill={headTint.color}
                opacity={headTint.amount * SUNBURN_OPACITY}
              />
              {/* Comb */}
              <g fill="#ef4444">
                <circle cx="31.5" cy="6.5" r="3" />
                <circle cx="35.5" cy="4.5" r="3.2" />
                <circle cx="39.5" cy="6.5" r="3" />
              </g>
              {/* Wattle */}
              <ellipse cx="41" cy="21.5" rx="2.2" ry="3.6" fill="#ef4444" />
              {/* Beak */}
              <path d="M42 12 L48 15.5 L42 18 Z" fill="#f97316" />
              {/* Eye */}
              {/* Eye: a money eye while falling past the cat; glows red while holding the knife */}
              {room === CAT_FALL ? (
                <g transform="translate(37.5 13)" aria-label="Money eyes">
                  <circle r="3.2" fill="#fde047" stroke="#a16207" strokeWidth="0.8" />
                  <text
                    y="2"
                    textAnchor="middle"
                    fontSize="5.6"
                    fontWeight="bold"
                    fill="#166534"
                    transform={`scale(${player.facing} 1)`}
                  >
                    $
                  </text>
                </g>
              ) : hasKnife ? (
                <circle cx="37.5" cy="13" r="2.4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.6" />
              ) : (
                <circle cx="37.5" cy="13" r="1.7" fill="#111827" />
              )}
            </svg>
          ) : (
            // Starter chick: drawn a little taller than the hitbox, feet on the ground.
            // The picture itself looks to the left, so everything is mirrored when walking right.
            <div className="absolute inset-0" style={{ transform: `scaleX(${-player.facing})` }}>
              {/* The body, below the neck. It is the lower part of the picture,
                  so that it can turn on its own: swimming sideways, it swings
                  out behind the head, which stays as it is. */}
              <div
                className="absolute inset-0"
                data-chick-body
                style={{
                  transformOrigin: '20px 18px',
                  transform: `rotate(${swimSideways ? -52 : 0}deg)`,
                  transition: 'transform 0.2s ease-out',
                }}
              >
                {/* Legs: drawn here so they can swing; the picture's own feet are cut off below.
                    Swimming downwards, the legs are gone. */}
                {!swimDown && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{ left: 0, top: 0 }}
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    overflow="visible"
                    aria-hidden="true"
                  >
                    {[
                      { x: 15.5, angle: legAngle },
                      { x: 26.5, angle: -legAngle },
                    ].map(leg => (
                      <g
                        key={leg.x}
                        data-leg
                        transform={`rotate(${leg.angle} ${leg.x} 33)`}
                        stroke="#f59e0b"
                        strokeLinecap="round"
                        fill="none"
                      >
                        <path d={`M${leg.x} 33 V42.5`} strokeWidth="3" />
                        <path
                          d={`M${leg.x} 42.5 l-5.5 1.2 M${leg.x} 42.5 l-4.5 -1.2 M${leg.x} 42.5 l2.5 1`}
                          strokeWidth="2"
                        />
                      </g>
                    ))}
                  </svg>
                )}
                <img
                  src={chickImage}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none select-none"
                  style={{ left: 2, top: -10, width: 36, height: 54, clipPath: 'inset(48% 0 15% 0)' }}
                />
                {/* Wings that flap while swimming sideways or upwards */}
                {player.swimming && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{ left: 0, top: 0 }}
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    overflow="visible"
                    aria-hidden="true"
                  >
                    <g fill="#facc15" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round">
                      <path
                        data-wing
                        d="M7 22 Q-6 22 -9 34 Q2 34 9 28 Z"
                        transform={`rotate(${wingFlap} 7 23)`}
                      />
                      <path d="M33 22 Q46 22 49 34 Q38 34 31 28 Z" transform={`rotate(${-wingFlap} 33 23)`} />
                    </g>
                  </svg>
                )}
              </div>
              {/* The head: the upper part of the picture, always upright */}
              <img
                src={chickImage}
                alt="Chick"
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ left: 2, top: -10, width: 36, height: 54, clipPath: 'inset(0 0 48% 0)' }}
              />
              {/* Head going red in the sun at the beach: a red tint in the shape
                  of the picture, fading out below the head */}
              <div
                data-sunburn
                className="absolute pointer-events-none"
                style={{
                  left: 2,
                  top: -10,
                  width: 36,
                  height: 54,
                  backgroundColor: headTint.color,
                  opacity: headTint.amount * (headTint.blue ? 0.95 : SUNBURN_OPACITY),
                  // Blue replaces the yellow outright; red is laid over it
                  mixBlendMode: headTint.blue ? 'color' : 'multiply',
                  maskImage: `url(${chickImage}), linear-gradient(#000 46%, transparent 53%)`,
                  maskSize: '100% 100%',
                  maskRepeat: 'no-repeat',
                  maskComposite: 'intersect',
                  WebkitMaskImage: `url(${chickImage}), linear-gradient(#000 46%, transparent 53%)`,
                  WebkitMaskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskComposite: 'source-in',
                }}
              />
              {/* Money eyes: only while falling past the cat, with all that money about */}
              {room === CAT_FALL && (
                <svg
                  className="absolute pointer-events-none"
                  style={{ left: 0, top: 0 }}
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  overflow="visible"
                  role="img"
                  aria-label="Money eyes"
                >
                  {[
                    { x: 9.8, y: 12.2 },
                    { x: 25.4, y: 8.4 },
                  ].map(eye => (
                    <g key={eye.x} transform={`translate(${eye.x} ${eye.y})`}>
                      <circle r="3.8" fill="#fde047" stroke="#a16207" strokeWidth="0.9" />
                      {/* Turned back the right way round when the figure is mirrored */}
                      <text
                        y="2.4"
                        textAnchor="middle"
                        fontSize="6.6"
                        fontWeight="bold"
                        fill="#166534"
                        transform={`scale(${-player.facing} 1)`}
                      >
                        $
                      </text>
                    </g>
                  ))}
                </svg>
              )}
              {/* Eyes: glow red while holding the knife */}
              {hasKnife && (
                <svg
                  className="absolute pointer-events-none"
                  style={{ left: 0, top: 0 }}
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  overflow="visible"
                  role="img"
                  aria-label="Red eyes"
                >
                  {[
                    { x: 9.8, y: 12.2 },
                    { x: 25.4, y: 8.4 },
                  ].map(eye => (
                    <g key={eye.x}>
                      <circle cx={eye.x} cy={eye.y} r="3.3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                      <circle cx={eye.x - 0.9} cy={eye.y - 1.1} r="0.9" fill="#ffffff" />
                    </g>
                  ))}
                </svg>
              )}
            </div>
          )}

          {/* Tears: fall from the eyes for as long as the player is crying */}
          {player.crying && (
            <svg
              className="absolute pointer-events-none"
              style={{ left: 0, top: -8 }}
              width="40"
              height="60"
              viewBox="0 0 40 60"
              overflow="visible"
              role="img"
              aria-label="Crying"
            >
              {(isHen
                ? [{ x: player.facing === 1 ? 33.5 : 6.5, y: 17 }]
                : // The chick picture looks to the left, so its eyes sit at
                  // different heights and swap sides when it turns around.
                  [
                    { x: 9.5, y: 24 },
                    { x: 25.5, y: 20 },
                  ].map(eye => ({ x: player.facing === -1 ? eye.x : 40 - eye.x, y: eye.y }))
              ).flatMap((eye, eyeIndex) =>
                [0, 0.3].map(delay => (
                  <circle
                    key={`${eyeIndex}-${delay}`}
                    cx={eye.x}
                    cy={eye.y}
                    r="2.4"
                    fill="#38bdf8"
                    stroke="#e0f2fe"
                    strokeWidth="0.8"
                  >
                    <animate
                      attributeName="cy"
                      from={eye.y}
                      to={eye.y + 24}
                      dur="0.6s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="1;1;0"
                      dur="0.6s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))
              )}
            </svg>
          )}

          {/* Things bought in the shop */}
          <Wearables wearing={save.wearing} isHen={isHen} facing={player.facing} />

          {/* The heart from the sky, carried in the hand: held out in front */}
          {skyHeart === 'carried' && (
            <div
              className="absolute"
              style={{ left: player.facing === 1 ? 30 : -10, top: 12 }}
              role="img"
              aria-label="Carrying the heart"
            >
              <Heart className="w-5 h-5 text-red-600 fill-red-500" />
            </div>
          )}
        </div>

        {/* Follower chick from the shop: a small copy that trails behind */}
        {save.wearing.includes('follower') && (
          <img
            src={chickImage}
            alt="Follower chick"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              left: 9,
              top: 11,
              width: 22,
              height: 33,
              // Kept a step behind, so it stands next to the player rather than on top
              transform: `translate(${follower.x - follower.facing * FOLLOW_GAP}px, ${follower.y}px) scaleX(${-follower.facing})`,
            }}
          />
        )}

        {/* The surface of the sea, drawn in front of the player so that it wades in it */}
        {room === BEACH && (
          <svg
            className="absolute pointer-events-none"
            style={{ left: BEACH_WATER_X, top: 330 }}
            width={WORLD_WIDTH - BEACH_WATER_X}
            height="70"
            viewBox={`0 0 ${WORLD_WIDTH - BEACH_WATER_X} 70`}
            aria-hidden="true"
          >
            <path
              d="M12 6 Q30 0 50 6 T90 6 T130 6 T170 6 T210 6 T250 6 T290 6 T330 6 T370 6 T400 6 V70 H40 Q28 40 12 6 Z"
              fill="#0e7490"
              opacity="0.6"
            />
            <path
              d="M12 6 Q30 0 50 6 T90 6 T130 6 T170 6 T210 6 T250 6 T290 6 T330 6 T370 6 T400 6"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="2"
              opacity="0.8"
            />
          </svg>
        )}

        {/* Coin */}
        {room === MEADOW && coin && (
          <div className="absolute" style={{ transform: `translate(${coin.x}px, ${coin.y}px)` }}>
            <Coin />
          </div>
        )}

        {/* Eggs */}
        {room === MEADOW && eggs.map((egg, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              transform: `translate(${egg.x}px, ${egg.y}px)`,
            }}
          >
            <Egg
              className={
                egg.red
                  ? 'w-8 h-8 text-red-700 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                  : egg.gold
                  ? 'w-8 h-8 text-yellow-600 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]'
                  : 'w-8 h-8 text-white'
              }
            />
          </div>
        ))}

        {/* Bunny. Once it has been beaten with the knife it does not vanish: it
            lies where it was, squashed very flat, for the rest of the game. */}
        {room === MEADOW && (
        <div
          className="absolute"
          data-bunny-flat={!bunnyAlive}
          style={{
            // The bunny picture faces left, so mirror it when walking right.
            width: bunny.width,
            height: bunny.height,
            transformOrigin: '50% 44px', // Its feet, so that it is flattened onto the ground
            transform: `translate(${bunny.x}px, ${bunny.y}px) scaleX(${-bunnyFacing})${
              bunnyAlive ? '' : ' scale(1.25, 0.12)'
            }`,
          }}
        >
          {/* Feet: drawn here so they can step; the picture's own feet are cut off below.
              The two take turns moving forward and lifting as the bunny walks along. */}
          <svg
            className="absolute pointer-events-none"
            style={{ left: 0, top: 0 }}
            width="40"
            height="40"
            viewBox="0 0 40 40"
            overflow="visible"
            aria-hidden="true"
          >
            {[
              { x: 11, phase: 0 },
              { x: 24, phase: Math.PI },
            ].map(foot => {
              const swing = bunny.x * BUNNY_STEP_SPEED + foot.phase;
              return (
                <ellipse
                  key={foot.x}
                  data-bunny-foot
                  cx={foot.x + Math.sin(swing) * 3.5}
                  cy={41 - Math.max(0, Math.cos(swing)) * 3}
                  rx="6"
                  ry="3.4"
                  fill="#f8fafc"
                  stroke="#1f2937"
                  strokeWidth="1.6"
                />
              );
            })}
          </svg>
          {/* Drawn a little larger than the 40×40 hitbox, with the feet on the ground */}
          <img
            src={bunnyImage}
            alt="Bunny"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: -2, top: -8, width: 44, height: 52, clipPath: 'inset(0 0 8% 0)' }}
          />
          {/* Flower tucked into the pink ear */}
          <svg
            className="absolute"
            style={{ left: 21, top: -1 }}
            width="16"
            height="16"
            viewBox="-8 -8 16 16"
            aria-hidden="true"
          >
            {[0, 72, 144, 216, 288].map(angle => (
              <circle key={angle} cx="0" cy="-4" r="3" fill="#f9a8d4" transform={`rotate(${angle})`} />
            ))}
            <circle cx="0" cy="0" r="2.5" fill="#facc15" />
          </svg>
        </div>
        )}

        {/* Storm cloud */}
        {room === MEADOW && cloud && (
          <svg
            className="absolute"
            style={{ transform: `translate(${cloud.x}px, ${cloud.y}px)`, left: -5, top: -8 }}
            width="80"
            height="62"
            viewBox="0 0 80 62"
            role="img"
            aria-label="Storm cloud"
          >
            {/* Lightning bolt */}
            <path d="M42 38 L33 50 H40 L36 61 L50 46 H42 L47 38 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
            {/* Cloud body */}
            {/* A light outline keeps it visible against the night sky */}
            <g fill="#475569" stroke={isNight ? '#e2e8f0' : '#1e293b'} strokeWidth="1.5">
              <path d="M18 40 Q5 40 5 29 Q5 19 16 18 Q18 6 32 6 Q42 6 46 13 Q52 9 60 12 Q68 15 67 23 Q76 25 75 33 Q74 40 64 40 Z" />
            </g>
            {/* Angry eyes */}
            <g stroke="#f8fafc" strokeWidth="2" strokeLinecap="round">
              <path d="M27 21 L34 24" />
              <path d="M52 21 L45 24" />
            </g>
            <circle cx="31" cy="27" r="2" fill="#f8fafc" />
            <circle cx="48" cy="27" r="2" fill="#f8fafc" />
          </svg>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            {shopOpen ? (
              <div className="text-center">
                <Shop
                  save={save}
                  onBuy={buyItem}
                  onToggleWear={toggleWear}
                  onBack={() => setShopOpen(false)}
                />
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
                <p className="text-lg mb-4">
                  Final Score: {score} · Level {level}
                </p>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={restartGame}
                    className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={revive}
                    disabled={save.coins < REVIVE_PRICE}
                    className="flex items-center gap-1.5 bg-rose-500 text-white px-6 py-2 rounded-full hover:bg-rose-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                    Revive · {REVIVE_PRICE} kr
                  </button>
                  <button
                    onClick={() => setShopOpen(true)}
                    className="bg-amber-400 text-white px-6 py-2 rounded-full hover:bg-amber-500 transition-colors"
                  >
                    Shop
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  or press <span className="font-bold">Enter</span> to play again
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-white/80 px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-700">
            Use <span className="font-bold">Space</span> or <span className="font-bold">↑</span> to jump
            <br />
            Use <span className="font-bold">←→</span> to move
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;

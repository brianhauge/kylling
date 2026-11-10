import { useState, useEffect, useRef } from 'react';
import { Egg, Heart } from 'lucide-react';
import chickImage from './assets/chick.png';
import { Coin, Shop, Wearables } from './Shop';
import { KnifeIcon, Signpost } from './Props';
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
  floating: false, // Rising from the trampoline up to the sky
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
type Room = typeof MEADOW | typeof TRAMPOLINE_PLACE | typeof SKY | typeof BEACH;
const ROOM_ROW: Room[] = [MEADOW, TRAMPOLINE_PLACE, BEACH]; // Left to right

const BEACH_WATER_X = WORLD_WIDTH / 2; // Sand to the left of this, water to the right
const WADING_SPEED = 2.5; // Top speed in the water (half the normal speed)
const FLIP_DEGREES_PER_FRAME = 15; // The somersault takes 24 frames

// `y` is where the feet of the 40px player box come to rest.
const TRAMPOLINE = { x: 360, y: 314, width: 80 };
const SKY_CLOUD = { x: 230, y: 250, width: 340 };
const FLOAT_SPEED = -4; // px per frame while floating upwards
const SKY_FLOAT_TOP = 150; // The float ends this high in the sky, above the cloud
const BLUE_EGG: Position = { x: 480, y: 215 }; // On the sky cloud
const BLUE_EGG_MULTIPLIER = 2; // Coins are worth this much more for the rest of the level
// For testing later levels: while developing, opening the game with e.g.
// "?score=85" in the address starts the first game at that score.
const DEV_START_SCORE = import.meta.env.DEV
  ? Math.max(0, Number(new URLSearchParams(window.location.search).get('score')) || 0)
  : 0;

const KNIFE_LEVEL = 5; // From this level a knife lies in the meadow
const WALK_CYCLE_SPEED = 0.22; // Leg swing (radians) per px walked
const LEG_SWING_DEGREES = 28;

const MAX_LIVES = 3;
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
  const body = useRef(initialBody());
  const keys = useRef({ left: false, right: false, jump: false, jumpPressed: false });
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

  const [player, setPlayer] = useState({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, crying: false, step: 0, flip: 0 });

  // Which place the player is in, the walking cycle, and the level in which
  // the blue egg was last taken (its bonus lasts for the rest of that level).
  const roomRef = useRef<Room>(MEADOW);
  const [room, setRoom] = useState<Room>(MEADOW);
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
      } else {
        return;
      }
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => setKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => setKey(e, false);
    const releaseAll = () => {
      keys.current = { left: false, right: false, jump: false, jumpPressed: false };
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
      const room = roomRef.current;
      let nextRoom = room;
      const dir = b.floating ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0);
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
      // The places lie in a row: meadow – trampoline place – beach. Walking
      // all the way out of one side leads to the neighbour on that side.
      const rowIndex = ROOM_ROW.indexOf(room);
      if (rowIndex >= 0 && b.x > maxX && b.vx > 0 && rowIndex < ROOM_ROW.length - 1) {
        nextRoom = ROOM_ROW[rowIndex + 1];
        b.x = 0;
      } else if (rowIndex > 0 && b.x < 0 && b.vx < 0) {
        nextRoom = ROOM_ROW[rowIndex - 1];
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
        b.vy = FLOAT_SPEED;
        nextY = b.y + b.vy;
        if (room === TRAMPOLINE_PLACE && nextY < -PLAYER_SIZE) {
          nextRoom = SKY;
          nextY = WORLD_HEIGHT;
        } else if (room === SKY && nextY <= SKY_FLOAT_TOP) {
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
              b.vy = FLOAT_SPEED;
            }
          } else if (
            room === SKY &&
            isOver(SKY_CLOUD) &&
            feetBefore <= SKY_CLOUD.y + 0.01 &&
            feetAfter >= SKY_CLOUD.y
          ) {
            nextY = SKY_CLOUD.y - PLAYER_SIZE;
            b.vy = 0;
            b.onGround = true;
          }
        }
        if (room === SKY) {
          // There is no ground in the sky: stepping off the cloud means
          // falling out of the bottom and back down to the trampoline place.
          if (nextY > WORLD_HEIGHT) {
            nextRoom = TRAMPOLINE_PLACE;
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

      if (nextRoom !== room) {
        roomRef.current = nextRoom;
        setRoom(nextRoom);
        trail.current = []; // The follower chick comes along instead of walking the old route
      }

      // Walking: the legs swing with the distance covered, and rest otherwise.
      if (b.onGround && Math.abs(b.vx) > 0.3) stepRef.current += Math.abs(b.vx) * WALK_CYCLE_SPEED;
      else stepRef.current = 0;

      if (graceFrames.current > 0) graceFrames.current -= 1;
      const crying = graceFrames.current > 0;
      setPlayer(p => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        facing: dir !== 0 ? dir : p.facing,
        crying,
        step: stepRef.current,
        flip: b.flip * b.flipDir,
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
      const touchingEnemy =
        touchingBunny || (cloudRef.current !== null && overlaps(hitbox, cloudRef.current));
      if (graceFrames.current === 0 && touchingEnemy) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setGameOver(true);
        } else {
          graceFrames.current = HIT_GRACE_FRAMES;
        }
      }
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
    keys.current = { left: false, right: false, jump: false, jumpPressed: false };
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
    bunnyAliveRef.current = true;
    setBunnyAlive(true);
    setPlayer({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, crying: false, step: 0, flip: 0 });
    setLives(MAX_LIVES);
    setPlatformYs(platformYsRef.current);
    setEggs(eggsRef.current);
    setBunny(bunnyRef.current);
    setScore(0);
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
            <circle cx="540" cy="70" r="75" fill="url(#sunGlow)" />
            <circle cx="540" cy="70" r="30" fill="#fde047" />
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
          {/* Distant mountains */}
          <path
            d="M0 330 L0 250 L90 170 L170 240 L260 150 L370 250 L450 200 L540 260 L640 160 L740 245 L800 205 L800 330 Z"
            fill="#93c5fd"
            opacity="0.7"
          />
          {/* Snow caps */}
          <path d="M260 150 L237 176 L252 172 L262 180 L272 171 L286 174 Z" fill="#ffffff" opacity="0.8" />
          <path d="M640 160 L619 182 L633 178 L642 186 L652 177 L664 180 Z" fill="#ffffff" opacity="0.8" />

          {/* Far hills */}
          <path
            d="M0 330 L0 270 Q100 215 220 265 T440 260 T660 250 T800 265 L800 330 Z"
            fill="#86efac"
          />
          {/* Near hills */}
          <path
            d="M0 330 L0 300 Q80 265 180 295 T380 290 T580 295 T800 285 L800 330 Z"
            fill="#4ade80"
          />
          {/* Night tint over the mountains and hills */}
          <rect
            width="800"
            height="400"
            fill="#0f172a"
            style={{ opacity: isNight ? 0.5 : 0, transition: NIGHT_TRANSITION }}
            mask="url(#landMask)"
          />
          <mask id="landMask">
            <path
              d="M0 330 L0 250 L90 170 L170 240 L260 150 L370 250 L450 200 L540 260 L640 160 L740 245 L800 205 L800 330 Z"
              fill="#ffffff"
            />
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

        {/* Signposts between the meadow and the trampoline place */}
        {room === MEADOW && <Signpost x={762} label="→" />}
        {room === TRAMPOLINE_PLACE && <Signpost x={8} label="←" />}
        {room === TRAMPOLINE_PLACE && <Signpost x={762} label="→" />}
        {room === BEACH && <Signpost x={8} label="←" />}

        {/* Trampoline */}
        {room === TRAMPOLINE_PLACE && (
          <svg
            className="absolute"
            style={{ transform: `translate(${TRAMPOLINE.x - 6}px, ${TRAMPOLINE.y}px)` }}
            width="92"
            height="32"
            viewBox="0 0 92 32"
            role="img"
            aria-label="Trampoline"
          >
            {/* Legs */}
            <g stroke="#475569" strokeWidth="3" strokeLinecap="round">
              <path d="M12 10 L6 30" />
              <path d="M80 10 L86 30" />
              <path d="M46 10 V30" />
            </g>
            {/* Springs */}
            <path
              d="M10 8 l3 4 l3 -4 l3 4 M73 12 l3 -4 l3 4 l3 -4"
              stroke="#94a3b8"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Frame and mat */}
            <rect x="3" y="3" width="86" height="9" rx="4.5" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.5" />
            <rect x="12" y="4.5" width="68" height="4" rx="2" fill="#0f172a" />
          </svg>
        )}

        {/* The cloud up in the sky, and the blue egg lying on it */}
        {room === SKY && (
          <>
            <svg
              className="absolute"
              style={{ transform: `translate(${SKY_CLOUD.x - 30}px, ${SKY_CLOUD.y - 22}px)` }}
              width={SKY_CLOUD.width + 60}
              height="100"
              viewBox={`0 0 ${SKY_CLOUD.width + 60} 100`}
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
          className="absolute w-10 h-10"
          style={{
            transform: `translate(${player.x}px, ${player.y}px) rotate(${player.vx * 2 + player.flip}deg)`,
          }}
        >
          {/* Chicken Body: mirrored to face the way it is moving */}
          {isHen ? (
            <svg
              className="absolute"
              style={{ left: -4, top: -6, transform: `scaleX(${player.facing})` }}
              width="48"
              height="48"
              viewBox="0 0 48 48"
              role="img"
              aria-label="Hen"
            >
              {/* Legs and feet */}
              <g stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none">
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
              {/* Wing */}
              <path
                d="M13 27 Q21 21 30 27 Q25 36 13 31 Z"
                fill="#fde68a"
                stroke="#a16207"
                strokeWidth="1.2"
                strokeLinejoin="round"
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
              {/* Eye: glows red while holding the knife */}
              {hasKnife ? (
                <circle cx="37.5" cy="13" r="2.4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.6" />
              ) : (
                <circle cx="37.5" cy="13" r="1.7" fill="#111827" />
              )}
            </svg>
          ) : (
            // Starter chick: drawn a little taller than the hitbox, feet on the ground.
            // The picture itself looks to the left, so everything is mirrored when walking right.
            <div className="absolute inset-0" style={{ transform: `scaleX(${-player.facing})` }}>
              {/* Legs: drawn here so they can swing; the picture's own feet are cut off below */}
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
              <img
                src={chickImage}
                alt="Chick"
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ left: 2, top: -10, width: 36, height: 54, clipPath: 'inset(0 0 15% 0)' }}
              />
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

        {/* Bunny (gone for the rest of the game once it has been beaten with the knife) */}
        {room === MEADOW && bunnyAlive && (
        <div
          className="absolute"
          style={{
            // The bunny picture faces left, so mirror it when walking right.
            width: bunny.width,
            height: bunny.height,
            transform: `translate(${bunny.x}px, ${bunny.y}px) scaleX(${-bunnyFacing})`,
          }}
        >
          {/* Drawn a little larger than the 40×40 hitbox, with the feet on the ground */}
          <img
            src={bunnyImage}
            alt="Bunny"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: -2, top: -8, width: 44, height: 52 }}
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

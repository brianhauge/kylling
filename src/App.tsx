import { useState, useEffect, useRef } from 'react';
import { Egg, Heart } from 'lucide-react';
import chickImage from './assets/chick.png';
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
const PLAYER_SIZE = 40;

// Vertical movement
const GRAVITY = 0.6;
const JUMP_FORCE = -14; // Peak height ≈ JUMP_FORCE² / (2 × GRAVITY) ≈ 163px
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
}

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
});

const MAX_LIVES = 2;
const HIT_GRACE_FRAMES = 120; // Invulnerable (and blinking) for 2 seconds after a hit

// From this level on the platforms bob up and down.
const MOVING_PLATFORMS_LEVEL = 4;
const PLATFORM_TRAVEL = 30; // px above and below the resting height
const PLATFORM_PERIOD_FRAMES = 200;

const restingPlatformYs = () => PLATFORMS.map(p => p.y);
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
  const keys = useRef({ left: false, right: false, jump: false });
  const eggsRef = useRef<EggItem[]>(initialEggs());
  const lastBatch = useRef<Position[]>(eggsRef.current);
  const eggsLaid = useRef(eggsRef.current.length);
  const bunnyRef = useRef<GameObject>(initialBunny());
  const bunnyDir = useRef(-1); // -1 = walking left, 1 = walking right
  const [bunnyFacing, setBunnyFacing] = useState(-1);

  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const graceFrames = useRef(0);
  const platformYsRef = useRef<number[]>(restingPlatformYs());
  const platformClock = useRef(0);

  const [player, setPlayer] = useState({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, blink: false });
  const [lives, setLives] = useState(MAX_LIVES);
  const [platformYs, setPlatformYs] = useState<number[]>(platformYsRef.current);
  const [eggs, setEggs] = useState<EggItem[]>(eggsRef.current);
  const [bunny, setBunny] = useState<GameObject>(bunnyRef.current);
  const [score, setScore] = useState<number>(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  // The level follows directly from the score: one level per 20 points.
  const level = levelForScore(score);
  const isHen = level >= HEN_LEVEL;

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
      keys.current = { left: false, right: false, jump: false };
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
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (dir !== 0) {
        const accel = b.onGround ? GROUND_ACCEL : AIR_ACCEL;
        b.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, b.vx + dir * accel));
      } else {
        b.vx *= b.onGround ? GROUND_FRICTION : AIR_FRICTION;
        if (Math.abs(b.vx) < 0.05) b.vx = 0;
      }
      b.x += b.vx;
      const maxX = WORLD_WIDTH - PLAYER_SIZE;
      if (b.x < 0 || b.x > maxX) {
        b.x = Math.max(0, Math.min(maxX, b.x));
        b.vx = 0;
      }

      // Vertical: jump, gravity, then land on a platform or the ground.
      if (k.jump && b.onGround) b.vy = JUMP_FORCE;
      b.vy += GRAVITY;
      let nextY = b.y + b.vy;
      b.onGround = false;
      b.platform = null;
      if (b.vy > 0) {
        for (let i = 0; i < PLATFORMS.length; i++) {
          const platform = PLATFORMS[i];
          const overPlatform = b.x < platform.x + platform.width && b.x + PLAYER_SIZE > platform.x;
          const feetBefore = b.y + PLAYER_SIZE;
          const feetAfter = nextY + PLAYER_SIZE;
          // The feet were above the platform (where it was or is now) and
          // would end up at or below its current top.
          const wasAbove = feetBefore <= Math.max(prevYs[i], newYs[i]) + 0.01;
          if (overPlatform && wasAbove && feetAfter >= newYs[i]) {
            nextY = newYs[i] - PLAYER_SIZE;
            b.vy = 0;
            b.onGround = true;
            b.platform = i;
            break;
          }
        }
      }
      if (nextY >= GROUND_LEVEL) {
        nextY = GROUND_LEVEL;
        b.vy = 0;
        b.onGround = true;
        b.platform = null;
      }
      b.y = nextY;

      if (graceFrames.current > 0) graceFrames.current -= 1;
      const blink = graceFrames.current > 0 && Math.floor(graceFrames.current / 6) % 2 === 0;
      setPlayer(p => ({ x: b.x, y: b.y, vx: b.vx, facing: dir !== 0 ? dir : p.facing, blink }));

      // Move bunny
      const bn = bunnyRef.current;
      // Patrol back and forth, turning around at each end of the range.
      const bunnyX = Math.max(BUNNY_MIN_X, Math.min(BUNNY_MAX_X, bn.x + bunnyDir.current * BUNNY_SPEED));
      if (bunnyX <= BUNNY_MIN_X) bunnyDir.current = 1;
      if (bunnyX >= BUNNY_MAX_X) bunnyDir.current = -1;
      bunnyRef.current = { ...bn, x: bunnyX };
      setBunnyFacing(bunnyDir.current);
      setBunny(bunnyRef.current);

      const hitbox: GameObject = { x: b.x, y: b.y, width: PLAYER_SIZE, height: PLAYER_SIZE };

      // Check egg collisions
      const remaining = eggsRef.current.filter(egg => !overlaps(hitbox, egg));
      if (remaining.length < eggsRef.current.length) {
        const points = eggsRef.current
          .filter(egg => !remaining.includes(egg))
          .reduce((sum, egg) => sum + (egg.gold ? GOLD_EGG_POINTS : 1), 0);
        eggsRef.current = remaining;
        // All eggs collected: lay a fresh batch somewhere else and keep playing.
        if (remaining.length === 0) {
          const spots = nextEggs(lastBatch.current, hitbox);
          lastBatch.current = spots;
          // Every fourth egg laid since the start of the game is a golden one.
          eggsRef.current = spots.map(spot => ({
            ...spot,
            gold: ++eggsLaid.current % GOLD_EGG_INTERVAL === 0,
          }));
        }
        setEggs(eggsRef.current);
        scoreRef.current += points;
        setScore(scoreRef.current);
      }

      // Check bunny collision: each hit costs a heart, the last one ends the game.
      if (graceFrames.current === 0 && overlaps(hitbox, bunnyRef.current)) {
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
    keys.current = { left: false, right: false, jump: false };
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    graceFrames.current = 0;
    platformClock.current = 0;
    platformYsRef.current = restingPlatformYs();
    setPlayer({ x: 50, y: GROUND_LEVEL, vx: 0, facing: 1, blink: false });
    setLives(MAX_LIVES);
    setPlatformYs(platformYsRef.current);
    setEggs(eggsRef.current);
    setBunny(bunnyRef.current);
    setScore(0);
    setGameOver(false);
  };

  // Enter restarts the game from the Game Over screen.
  useEffect(() => {
    if (!gameOver) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        restartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 to-sky-100 flex items-center justify-center">
      <div className="relative w-[800px] h-[400px] bg-gradient-to-b from-sky-400 to-sky-100 rounded-lg shadow-2xl overflow-hidden">
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
          </defs>

          {/* Sun */}
          <circle cx="540" cy="70" r="75" fill="url(#sunGlow)" />
          <circle cx="540" cy="70" r="30" fill="#fde047" />

          {/* Clouds */}
          <g fill="#ffffff" opacity="0.85">
            <ellipse cx="250" cy="70" rx="38" ry="13" />
            <ellipse cx="275" cy="60" rx="24" ry="13" />
            <ellipse cx="420" cy="115" rx="30" ry="10" />
            <ellipse cx="438" cy="107" rx="18" ry="10" />
            <ellipse cx="690" cy="140" rx="34" ry="11" />
          </g>

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
        </svg>

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
        </div>

        {/* Level-up banner */}
        {levelUp !== null && !gameOver && (
          <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none z-10">
            <div className="bg-amber-400 text-white font-bold text-xl px-6 py-2 rounded-full shadow-lg animate-bounce">
              Level {levelUp}!{levelUp === HEN_LEVEL && ' You are a hen now!'}
            </div>
          </div>
        )}

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-20 bg-gradient-to-b from-green-500 to-green-600" />

        {/* Platforms */}
        {PLATFORMS.map((platform, index) => (
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
            transform: `translate(${player.x}px, ${player.y}px) rotate(${player.vx * 2}deg)`,
            // Blinks while invulnerable after being hit by the bunny
            opacity: player.blink ? 0.25 : 1,
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
                <path d="M19 38 V46 M15 46 H23" />
                <path d="M27 38 V46 M23 46 H31" />
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
              <circle cx="37.5" cy="13" r="1.7" fill="#111827" />
            </svg>
          ) : (
            // Starter chick: drawn a little taller than the hitbox, feet on the ground
            <img
              src={chickImage}
              alt="Chick"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left: 0, top: -8, width: 40, height: 52, transform: `scaleX(${player.facing})` }}
            />
          )}
        </div>

        {/* Eggs */}
        {eggs.map((egg, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              transform: `translate(${egg.x}px, ${egg.y}px)`,
            }}
          >
            <Egg
              className={
                egg.gold
                  ? 'w-8 h-8 text-yellow-600 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]'
                  : 'w-8 h-8 text-white'
              }
            />
          </div>
        ))}

        {/* Bunny */}
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

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
              <p className="text-lg mb-4">
                Final Score: {score} · Level {level}
              </p>
              <button
                onClick={restartGame}
                className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors"
              >
                Play Again
              </button>
              <p className="text-sm text-gray-500 mt-3">
                or press <span className="font-bold">Enter</span>
              </p>
            </div>
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
  );
}

export default App;

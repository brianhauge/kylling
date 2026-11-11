// Grass blades for the hills and the ground of the meadow. Everything is
// worked out once, as SVG path strings, so drawing it each frame costs nothing.

// One quadratic curve piece: start point, control point, end point.
type Curve = [x0: number, y0: number, cx: number, cy: number, x1: number, y1: number];

// The tops of the two rows of hills, the same curves as the hill shapes in
// App.tsx ("Q ... T ... T ..." written out with the mirrored control points).
const FAR_HILL: Curve[] = [
  [0, 270, 100, 215, 220, 265],
  [220, 265, 340, 315, 440, 260],
  [440, 260, 540, 205, 660, 250],
  [660, 250, 780, 295, 800, 265],
];
const NEAR_HILL: Curve[] = [
  [0, 300, 80, 265, 180, 295],
  [180, 295, 280, 325, 380, 290],
  [380, 290, 480, 255, 580, 295],
  [580, 295, 680, 335, 800, 285],
];

/** Height of a hill top at `x`. */
const curveY = (curves: Curve[], x: number) => {
  const [x0, y0, cx, cy, x1, y1] = curves.find(c => x <= c[4]) ?? curves[curves.length - 1];
  // x(t) rises steadily along each piece, so t can be found by halving.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const t = (lo + hi) / 2;
    const xt = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    if (xt < x) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
};

/** Repeatable "random" numbers between 0 and 1, so the grass looks the same every time. */
const randomFrom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** One curved, pointed blade standing at (x, y), `height` tall, its tip leaning `lean` px sideways. */
const blade = (x: number, y: number, height: number, lean: number, halfWidth: number) => {
  const n = (v: number) => v.toFixed(1);
  const tipX = x + lean;
  const tipY = y - height;
  const bendY = y - height * 0.55;
  return (
    `M${n(x - halfWidth)} ${n(y + 1.5)}` +
    `Q${n(x - halfWidth * 0.5 + lean * 0.25)} ${n(bendY)} ${n(tipX)} ${n(tipY)}` +
    `Q${n(x + halfWidth * 0.5 + lean * 0.45)} ${n(bendY)} ${n(x + halfWidth)} ${n(y + 1.5)}Z`
  );
};

interface GrassOptions {
  yAt: (x: number) => number;
  spacing: number; // Average px between blades
  minHeight: number;
  maxHeight: number;
  halfWidth: number;
  shades: number; // How many colour groups to deal the blades into
  seed: number;
}

/** A row of blades along a line, dealt into `shades` paths for different greens. */
const grassRow = ({ yAt, spacing, minHeight, maxHeight, halfWidth, shades, seed }: GrassOptions) => {
  const random = randomFrom(seed);
  const paths = Array.from({ length: shades }, () => '');
  for (let x = -2; x < 804; x += spacing * (0.6 + random() * 0.8)) {
    const height = minHeight + random() * (maxHeight - minHeight);
    const lean = (random() - 0.5) * height * 0.9;
    paths[Math.floor(random() * shades)] += blade(x, yAt(x), height, lean, halfWidth);
  }
  return paths;
};

/** Small tufts of three blades scattered over an area. */
const grassTufts = (
  count: number,
  place: (random: () => number) => { x: number; y: number },
  height: number,
  seed: number
) => {
  const random = randomFrom(seed);
  let path = '';
  for (let i = 0; i < count; i++) {
    const { x, y } = place(random);
    path += blade(x - 2.5, y, height * 0.75, -2.2, 0.9);
    path += blade(x, y, height, (random() - 0.5) * 2, 1);
    path += blade(x + 2.5, y, height * 0.8, 2.2, 0.9);
  }
  return path;
};

// Along the tops of the hills (in the 800×400 scenery coordinates).
export const FAR_HILL_GRASS = grassRow({
  yAt: x => curveY(FAR_HILL, x),
  spacing: 5,
  minHeight: 4,
  maxHeight: 8,
  halfWidth: 1.1,
  shades: 2,
  seed: 11,
});
export const NEAR_HILL_GRASS = grassRow({
  yAt: x => curveY(NEAR_HILL, x),
  spacing: 4.5,
  minHeight: 6,
  maxHeight: 12,
  halfWidth: 1.3,
  shades: 3,
  seed: 23,
});
// Tufts on the slopes of the hills, between each hill top and what hides its foot.
export const FAR_HILL_TUFTS = grassTufts(
  40,
  random => {
    const x = random() * 800;
    const top = curveY(FAR_HILL, x);
    const foot = curveY(NEAR_HILL, x);
    return { x, y: top + 8 + random() * Math.max(0, foot - top - 12) };
  },
  6,
  37
);
export const NEAR_HILL_TUFTS = grassTufts(
  45,
  random => {
    const x = random() * 800;
    const top = curveY(NEAR_HILL, x);
    return { x, y: top + 9 + random() * Math.max(0, 318 - top - 12) };
  },
  7,
  41
);

// Along the top edge of the ground, and tufts on its face. These are drawn in
// their own strip whose y = 0 is the top edge of the ground.
export const GROUND_GRASS = grassRow({
  yAt: () => 0,
  spacing: 3.6,
  minHeight: 7,
  maxHeight: 15,
  halfWidth: 1.5,
  shades: 3,
  seed: 53,
});
export const GROUND_TUFTS = grassTufts(
  70,
  random => ({ x: random() * 800, y: 14 + random() * 62 }),
  8,
  67
);

import { SwayingGrass } from './grass';

/** One colour of a grass row, bending back and forth in the wind. */
export function GrassBlades({
  grass,
  fill,
  seconds,
}: {
  grass: SwayingGrass;
  fill: string;
  seconds: number; // How long one round of gusts takes
}) {
  return (
    <path d={grass.rest} fill={fill} data-grass>
      <animate
        attributeName="d"
        values={grass.sway}
        keyTimes="0;0.35;0.55;0.75;1"
        calcMode="spline"
        keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
        dur={`${seconds}s`}
        repeatCount="indefinite"
      />
    </path>
  );
}

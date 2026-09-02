export type Point = { x: number; y: number };

/**
 * An SVG path through `points` as a smooth cubic spline, using Fritsch–Carlson
 * monotone tangents.
 *
 * Monotone rather than plain Catmull-Rom on purpose. Every series on this
 * dashboard is a cumulative total, so it can only ever rise or stay flat; a
 * Catmull-Rom curve overshoots around a sharp step and would dip *below* the
 * previous point, drawing a decrease that never happened. The monotone
 * construction clamps the tangent to zero wherever the secants change sign, so
 * the rendered curve can never leave the interval between two data points.
 *
 * Falls back to a straight segment for two points and a move for one, since a
 * spline needs three to mean anything.
 */
export function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${round(points[0].x)},${round(points[0].y)}`;
  if (n === 2) {
    return `M${round(points[0].x)},${round(points[0].y)}L${round(points[1].x)},${round(points[1].y)}`;
  }

  const dx: number[] = [];
  const secant: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    secant[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }

  // Tangent at each knot: the harmonic mean of the neighbouring secants, or
  // zero at a turning point — that zero is what forbids overshoot.
  const tangent: number[] = new Array(n);
  tangent[0] = secant[0];
  tangent[n - 1] = secant[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (secant[i - 1] * secant[i] <= 0) {
      tangent[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangent[i] = (w1 + w2) / (w1 / secant[i - 1] + w2 / secant[i]);
    }
  }

  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    const c1x = points[i].x + third;
    const c1y = points[i].y + tangent[i] * third;
    const c2x = points[i + 1].x - third;
    const c2y = points[i + 1].y - tangent[i + 1] * third;
    path += `C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(points[i + 1].x)},${round(points[i + 1].y)}`;
  }
  return path;
}

/** The same curve, closed down to `baseline` for an area fill. */
export function monotoneArea(points: Point[], baseline: number): string {
  if (points.length === 0) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${monotonePath(points)}L${round(last.x)},${round(baseline)}L${round(first.x)},${round(baseline)}Z`;
}

/** Path data does not need sub-hundredth precision; trimming keeps the DOM small. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

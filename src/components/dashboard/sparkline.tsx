import { monotoneArea, monotonePath } from "@/components/dashboard/curve";
import type { SeriesPoint } from "@/types/api";

/**
 * The shape of one tile's number over the window — no axes, no legend, no
 * tooltip. The tile already states the value and the growth figure; this only
 * says whether it arrived steadily or in one jump.
 *
 * Every sparkline on the dashboard is drawn in the same ink on purpose. Six
 * independent single-series lines are never read against one another, so a hue
 * per tile would encode nothing and would spend the categorical palette on
 * decoration — colour is kept for the category breakdown, where it does work.
 *
 * `preserveAspectRatio="none"` lets the curve stretch to whatever width the
 * tile has; `vector-effect="non-scaling-stroke"` keeps the stroke 2px through
 * that stretch instead of smearing it horizontally.
 */
export function Sparkline({
  points,
  className,
  gradientId,
}: {
  points: SeriesPoint[];
  className?: string;
  /** Unique per instance — two <linearGradient> nodes must not share an id. */
  gradientId: string;
}) {
  if (points.length < 2) return null;

  const width = 100;
  const height = 32;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A dead-flat series (nothing created in the window) has no range to scale
  // against; park it on the centre line rather than dividing by zero.
  const span = high - low || 1;
  const flat = high === low;

  const coords = points.map((point, index) => ({
    x: (index / (points.length - 1)) * width,
    y: flat
      ? height / 2
      : height - ((point.value - low) / span) * (height - 4) - 2,
  }));

  const line = monotonePath(coords);
  const area = monotoneArea(coords, height);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

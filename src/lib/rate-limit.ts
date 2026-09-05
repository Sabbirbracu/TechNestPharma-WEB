/**
 * The one piece of app-wide state a 429 produces: how long until requests work
 * again.
 *
 * A rate limit is not a property of the screen that happened to trip it. The
 * dashboard fires half a dozen queries at once, and when the window closes
 * they all fail together — so an error message rendered per query would say the
 * same thing six times, while a page that only knows how to spin says nothing
 * at all. That is what the user saw: three 429s in the server log and an
 * indefinite loading state in the browser.
 *
 * So this is a tiny module-level store rather than React state: `apiFetch`
 * reports into it from outside the component tree, and one banner subscribes.
 * Same shape as the `refreshHandler` hook in `api.ts`, and for the same reason.
 */

export type RateLimitState = {
  /** Epoch ms at which requests should work again. */
  readonly until: number;
  /** The server's own sentence, shown above the countdown. */
  readonly message: string;
  /** Whole seconds left, recomputed here once a second.
   *
   *  The countdown lives in the store rather than in the banner because a
   *  component may not read the clock while rendering — `Date.now()` is impure
   *  and makes a render's output depend on when it happened to run. Ticking
   *  here keeps the banner a pure function of this snapshot, and means the
   *  timer exists only while something is actually throttled. */
  readonly remaining: number;
};

let current: RateLimitState | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(state: RateLimitState | null) => void>();

function emit() {
  for (const listener of listeners) listener(current);
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function secondsLeft(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (current === null) {
      stopTimer();
      return;
    }
    const remaining = secondsLeft(current.until);
    if (remaining <= 0) {
      clearRateLimit();
      return;
    }
    // A fresh object every tick: `useSyncExternalStore` compares snapshots by
    // reference, so mutating in place would never re-render.
    current = { ...current, remaining };
    emit();
  }, 1000);
}

/**
 * Record a 429. Keeps the LATEST expiry when several land at once — six
 * queries failing together are one outage, and the banner must not count down
 * to a moment when the earliest of them happens to clear.
 */
export function reportRateLimit(retryAfterSeconds: number, message: string) {
  const until = Date.now() + Math.max(retryAfterSeconds, 1) * 1000;
  if (current && current.until >= until) {
    return;
  }
  current = { until, message, remaining: secondsLeft(until) };
  startTimer();
  emit();
}

/** Called when the countdown reaches zero, and available for a manual dismiss. */
export function clearRateLimit() {
  stopTimer();
  if (current === null) return;
  current = null;
  emit();
}

export function subscribeRateLimit(
  listener: (state: RateLimitState | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `useSyncExternalStore` requires a stable reference between changes, which is
 *  why `current` is replaced wholesale rather than mutated. */
export function getRateLimit(): RateLimitState | null {
  return current;
}

/** Server snapshot: nothing has been throttled during a render on the server. */
export function getRateLimitServer(): RateLimitState | null {
  return null;
}

/**
 * Seconds in a `Retry-After` header, or null.
 *
 * The header is defined as either a delay in seconds or an HTTP date, and
 * slowapi can emit both depending on how the limiter is configured — so both
 * are handled rather than assuming the shape we happen to send today.
 */
export function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? Math.ceil(seconds) : null;
  }

  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

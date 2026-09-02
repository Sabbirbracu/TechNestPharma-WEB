"use client";

/**
 * The notification chime.
 *
 * Synthesised with the Web Audio API rather than shipped as an mp3. Two
 * reasons: an audio file is a network request that can fail or be blocked
 * exactly when the tab has been idle for an hour, and a two-note sine ping is
 * a few lines of code against a few kilobytes of asset plus a loading state.
 *
 * **Browsers will not let a page make noise until the user has interacted with
 * it.** An AudioContext created before any click starts `suspended`, and
 * calling `resume()` from a timer or a network callback is rejected. So the
 * context is created lazily on the first real user gesture and kept for the
 * life of the page; a notification that arrives before anyone has clicked
 * anything is silent, which is the behaviour the browser intends and not a bug
 * worth fighting.
 */

const STORAGE_KEY = "notifications.sound";

let context: AudioContext | null = null;
let unlocked = false;

// A one-value store so React can read the preference through
// `useSyncExternalStore`. localStorage is not readable while the server
// renders, and a plain `useState` initialiser that touched it would either
// throw there or hydrate to a different value than it rendered.
const listeners = new Set<() => void>();

export function subscribeToSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot, and the value before localStorage has been consulted. */
export function getSoundServerSnapshot(): boolean {
  return true;
}

/** Has the user muted the chime? Sound is on by default — the whole point of
 *  asking for it was to be told without watching the screen. */
export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Private mode, or site data blocked. Default to on rather than silent.
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Nothing to do — the preference just will not survive a reload.
  }
  for (const listener of listeners) listener();
}

/**
 * Called from a real user gesture (a click anywhere) to create and resume the
 * AudioContext while the browser is still willing to.
 */
export function unlockSound(): void {
  if (unlocked) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    void context.resume();
    unlocked = true;
  } catch {
    // No Web Audio (or blocked). Notifications stay silent; nothing else
    // depends on this.
  }
}

/**
 * A short two-note rise — the shape of "something arrived" rather than
 * "something is wrong". Deliberately quiet: this fires while someone is
 * reading, not to summon them from another room.
 */
export function playNotificationSound(): void {
  if (!isSoundEnabled() || context === null) return;

  try {
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;

    // E5 then A5. Two notes read as intentional; one reads as a system beep.
    [
      { freq: 659.25, at: 0 },
      { freq: 880.0, at: 0.11 },
    ].forEach(({ freq, at }) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      // An envelope, not a square on/off — an abrupt gate produces an audible
      // click at both ends.
      const start = now + at;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      osc.connect(gain).connect(context!.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // A failed chime must never interrupt the notification itself.
  }
}

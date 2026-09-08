"use client";

/**
 * In-app notification chimes.
 *
 * Two kinds, playing through the same `AudioContext`. Four are synthesised —
 * no download to fail just when a background tab needs to alert its user — and
 * the default is a recorded file, chosen by the client (2026-09-08).
 *
 * The recorded one goes through `decodeAudioData` rather than an `<audio>`
 * element on purpose. Both are gated by the browser's autoplay policy, but an
 * `<audio>` element carries its *own* gate: `unlockSound()` already satisfies
 * the context's, and routing the file through the same context means one
 * gesture unlocks everything rather than the file staying silent for reasons
 * the synthesised ones do not have.
 *
 * Sound preferences are intentionally local to this browser: they are a
 * personal workstation preference, not an account-level email setting.
 */

const ENABLED_STORAGE_KEY = "notifications.sound";
const SOUND_STORAGE_KEY = "notifications.sound.choice";

type Tone = {
  frequency: number;
  at: number;
  duration: number;
  wave?: OscillatorType;
};

export const NOTIFICATION_SOUNDS = [
  {
    id: "arrival",
    name: "Arrival",
    description: "The house notification sound.",
    src: "/notification-arrival.mp3",
    // Measured, not guessed: the file peaks at 0.677 (-3.4 dBFS), where the
    // synthesised chimes below peak at 0.075. Played flat it would be roughly
    // nine times their amplitude — startling on a quiet desk, and jarring for
    // anyone switching between the two. This lands its peak near 0.27, which
    // is a notification rather than an alarm. One number to turn if the client
    // wants it louder.
    gain: 0.4,
  },
  {
    id: "executive",
    name: "Executive",
    description: "A poised, two-note rise.",
    tones: [
      { frequency: 659.25, at: 0, duration: 0.28 },
      { frequency: 880, at: 0.11, duration: 0.3 },
    ],
  },
  {
    id: "clarity",
    name: "Clarity",
    description: "A clean, bright three-note confirmation.",
    tones: [
      { frequency: 523.25, at: 0, duration: 0.2, wave: "triangle" },
      { frequency: 659.25, at: 0.09, duration: 0.22, wave: "triangle" },
      { frequency: 783.99, at: 0.18, duration: 0.28, wave: "triangle" },
    ],
  },
  {
    id: "harbor",
    name: "Harbor",
    description: "A lower, calm arrival tone.",
    tones: [
      { frequency: 440, at: 0, duration: 0.3 },
      { frequency: 587.33, at: 0.14, duration: 0.34 },
    ],
  },
  {
    id: "beacon",
    name: "Beacon",
    description: "A precise, lightly percussive signal.",
    tones: [
      { frequency: 739.99, at: 0, duration: 0.16, wave: "triangle" },
      { frequency: 739.99, at: 0.2, duration: 0.2, wave: "triangle" },
    ],
  },
] as const satisfies ReadonlyArray<
  {
    id: string;
    name: string;
    description: string;
  } & ({ tones: readonly Tone[] } | { src: string; gain: number })
>;

export type NotificationSoundId = (typeof NOTIFICATION_SOUNDS)[number]["id"];

const DEFAULT_SOUND: NotificationSoundId = "arrival";

let context: AudioContext | null = null;
let unlocked = false;
const listeners = new Set<() => void>();

/** Decoded audio for the file-backed chimes, keyed by URL.
 *
 *  The promise is cached rather than the buffer, so a notification arriving
 *  while the first decode is still running waits for that one instead of
 *  starting a second fetch of the same file. */
const decoded = new Map<string, Promise<AudioBuffer | null>>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function isNotificationSoundId(value: string | null): value is NotificationSoundId {
  return NOTIFICATION_SOUNDS.some((sound) => sound.id === value);
}

export function subscribeToSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server snapshots prevent localStorage from causing a hydration mismatch. */
export function getSoundServerSnapshot(): boolean {
  return true;
}

export function getNotificationSoundServerSnapshot(): NotificationSoundId {
  return DEFAULT_SOUND;
}

export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // The preference simply will not survive a reload when storage is blocked.
  }
  notifyListeners();
}

export function getNotificationSound(): NotificationSoundId {
  try {
    const saved = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return isNotificationSoundId(saved) ? saved : DEFAULT_SOUND;
  } catch {
    return DEFAULT_SOUND;
  }
}

export function setNotificationSound(sound: NotificationSoundId): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, sound);
  } catch {
    // The current selection still works for this session's render.
  }
  // Warm the new choice while the person is still in Settings, so the first
  // notification after switching is not the one that pays for the download.
  const chosen = NOTIFICATION_SOUNDS.find((option) => option.id === sound);
  if (chosen && "src" in chosen) void loadBuffer(chosen.src);
  notifyListeners();
}

/** Create and resume the context only from a genuine user gesture. */
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
    // Fetch and decode now, on the gesture, rather than on the first
    // notification. Decoding takes long enough to be audible as a delay, and a
    // chime that arrives after the toast has been read is worse than none.
    void loadBuffer(currentFileSound()?.src);
  } catch {
    // No Web Audio, or it is blocked. Notifications still work silently.
  }
}

/** The selected sound, if it is one backed by a file. */
function currentFileSound(): { src: string; gain: number } | null {
  const sound = NOTIFICATION_SOUNDS.find(
    (option) => option.id === getNotificationSound(),
  );
  return sound && "src" in sound ? sound : null;
}

function loadBuffer(src: string | undefined): Promise<AudioBuffer | null> {
  if (!src || context === null) return Promise.resolve(null);

  const existing = decoded.get(src);
  if (existing) return existing;

  const pending = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`Sound ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context!.decodeAudioData(data))
    .catch(() => {
      // A missing or undecodable file must not leave the app silent forever:
      // dropping the entry lets the next notification try again, and
      // `playNotificationSound` falls back to a synthesised chime meanwhile.
      decoded.delete(src);
      return null;
    });

  decoded.set(src, pending);
  return pending;
}

/** Play the current chime, or a supplied one for an explicit preview. */
export function playNotificationSound(soundId = getNotificationSound()): void {
  if (!isSoundEnabled() || context === null) return;

  const sound = NOTIFICATION_SOUNDS.find((option) => option.id === soundId);
  if (!sound) return;

  if ("src" in sound) {
    playFile(sound.src, sound.gain);
    return;
  }

  // `as const` preserves the sound ids for the picker; widen only the tone
  // list here so optional fields such as `wave` are available on every item.
  const tones: readonly Tone[] = sound.tones;

  try {
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;

    tones.forEach((tone) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const start = now + tone.at;
      const end = start + tone.duration;

      oscillator.type = tone.wave ?? "sine";
      oscillator.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    });
  } catch {
    // A failed chime must never interrupt the notification itself.
  }
}

/** Play a decoded file through the shared context.
 *
 *  Asynchronous by nature — the buffer may still be decoding on the very first
 *  notification of a session, in which case this plays as soon as it is ready.
 *  A chime a few hundred milliseconds late still lands while the toast is on
 *  screen; silence does not.
 */
function playFile(src: string, level: number): void {
  void loadBuffer(src).then((buffer) => {
    if (!buffer || context === null) return;
    // Re-checked here rather than only at the call site: the mute switch may
    // have been thrown while the file was still decoding.
    if (!isSoundEnabled()) return;

    try {
      if (context.state === "suspended") void context.resume();

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = level;
      source.connect(gain).connect(context.destination);
      source.start();
    } catch {
      // A failed chime must never interrupt the notification itself.
    }
  });
}

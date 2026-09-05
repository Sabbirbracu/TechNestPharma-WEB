"use client";

/**
 * In-app notification chimes. They are synthesised with the Web Audio API,
 * avoiding a fragile media download just when a background tab needs to alert
 * its user. Sound preferences are intentionally local to this browser: they
 * are a personal workstation preference, not an account-level email setting.
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
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  tones: readonly Tone[];
}>;

export type NotificationSoundId = (typeof NOTIFICATION_SOUNDS)[number]["id"];

const DEFAULT_SOUND: NotificationSoundId = "executive";

let context: AudioContext | null = null;
let unlocked = false;
const listeners = new Set<() => void>();

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
  } catch {
    // No Web Audio, or it is blocked. Notifications still work silently.
  }
}

/** Play the current chime, or a supplied one for an explicit preview. */
export function playNotificationSound(soundId = getNotificationSound()): void {
  if (!isSoundEnabled() || context === null) return;

  const sound = NOTIFICATION_SOUNDS.find((option) => option.id === soundId);
  if (!sound) return;
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

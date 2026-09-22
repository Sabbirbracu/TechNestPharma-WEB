"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isSoundEnabled } from "@/lib/notification-sound";
import { cn } from "@/lib/utils";

/**
 * "Hook, line & download" — a stick figure fishes the notice file down while
 * a source is being checked.
 *
 * Adapted from the StickMan ceiling-file experiment. The comedy timing is
 * kept, but the clock answers to the REAL request:
 *
 *   0 – 4.2s   walk in, practice throw that misses, second throw hooks
 *   4.2 – 5.85 the tug — LOOPS for as long as the fetch is still running
 *   5.85 →     success: the file comes loose and drops onto the pad
 *              error:   the line snaps, the file stays put, he sits down
 *
 * So the file never drops before the server has answered, and a slow fetch
 * just means a longer tug — nothing is ever delayed to finish a joke. A fetch
 * that answers early still gets the short performance, while its toast and
 * refreshed list land immediately.
 *
 * Drawing is imperative inside one requestAnimationFrame loop, as in the
 * original: sixty React renders a second of a stick figure would be waste.
 * Everything is reached through refs (never document queries) and the clip
 * path id comes from useId, so several instances can play at once.
 *
 * Shown as a modal over a blurred page, which stays frozen until the
 * performance ends (client request, 2026-09-17). The one escape hatch: if the
 * fetch is still running after LONG_WAIT_MS, a "keep checking in the
 * background" button appears — a hung request must not lock the ERP.
 */

export type HookFetchOutcome = "pending" | "success" | "error";

type Pose =
  | "stand"
  | "windup"
  | "overhead"
  | "release"
  | "follow"
  | "spent"
  | "haul"
  | "flat"
  | "wave";

// Joint positions: head, hip, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR.
const RIG: Record<Pose, number[]> = {
  windup: [18, -49, 6, -25, 35, -59, 42, -72, 2, -37, -10, -29, -7, -13, -22, 0, 19, -12, 26, 0],
  overhead: [2, -56, 1, -27, 14, -76, -8, -89, -7, -39, -15, -30, -13, -14, -25, 0, 16, -13, 27, 0],
  release: [-12, -53, -5, -27, -31, -65, -46, -74, -10, -36, -4, -26, -19, -13, -28, 0, 13, -15, 27, 0],
  follow: [-20, -43, -7, -25, -39, -42, -54, -32, -12, -30, 0, -25, -20, -12, -28, 0, 11, -14, 27, -3],
  haul: [14, -43, 20, -24, -3, -37, -28, -48, 1, -29, -27, -45, 1, -13, -18, 0, 25, -12, 35, 0],
  stand: [0, -50, 0, -26, -12, -37, -12, -25, 12, -37, 12, -25, -7, -12, -13, 0, 7, -12, 13, 0],
  spent: [-5, -38, 2, -22, -14, -24, -17, -13, 9, -24, 14, -13, -5, -10, -13, 0, 12, -10, 20, 0],
  flat: [28, -8, 5, -5, 17, -2, 35, 0, 23, -14, 35, -19, -8, -5, -20, 0, -7, -1, -23, 0],
  wave: [0, -50, 0, -26, -12, -37, -12, -25, 17, -43, 19, -61, -7, -12, -13, 0, 7, -12, 13, 0],
};

const LONG_WAIT_MS = 20_000;
const EXIT_MS = 250;

const HAUL_START = 4.2;
const HAUL_END = 5.85;
const SUCCESS_END = 8.4;
const FAILURE_END = 7.6;

const BG = "var(--card)";
const CAPE = "var(--primary)";

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};
const fade = (t: number, a: number, b: number, c: number, d: number) =>
  ease(phase(t, a, b)) * (1 - ease(phase(t, c, d)));

const stroke = (d: string, extra = "") =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const fileGlyph = (x: number, y: number) =>
  `<g transform="translate(${x} ${y})">${stroke("M-18 1L6 0l13 12-1 35-37-1Z", `style="fill:${BG}"`)}${stroke("M6 0l1 12h12M-10 26l19 1M-10 33l14 1")}</g>`;

function bentLimb(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const before = [lerp(bx, ax, 0.15), lerp(by, ay, 0.15)];
  const after = [lerp(bx, cx, 0.15), lerp(by, cy, 0.15)];
  return `M${ax} ${ay}L${before[0]} ${before[1]}Q${bx} ${by} ${after[0]} ${after[1]}L${cx} ${cy}`;
}

/* -------------------------------------------------------------------------- */
/* Foley — synthesised, created only after the click, silent if the user has  */
/* switched the app's sounds off.                                             */
/* -------------------------------------------------------------------------- */

type Cue = "step" | "cast" | "metal" | "rope" | "release" | "air" | "heavy" | "snap";

const CUES: [number, Cue][] = [
  [0.3, "step"],
  [1.24, "cast"],
  [2.2, "metal"],
  [2.35, "rope"],
  [3.38, "cast"],
  [3.95, "metal"],
  [4.25, "rope"],
  [4.8, "rope"],
  [5.35, "rope"],
];
const SUCCESS_CUES: [number, Cue][] = [
  [5.85, "release"],
  [5.92, "air"],
  [6.28, "heavy"],
];
const FAILURE_CUES: [number, Cue][] = [
  [5.85, "snap"],
  [6.3, "heavy"],
];

class Foley {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  start() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      this.context ??= new Ctor();
      if (!this.master) {
        this.master = this.context.createGain();
        // Quieter than the showcase: this plays on a working screen.
        this.master.gain.value = 0.7;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      this.context = null;
    }
  }

  close() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }

  private layer(
    duration: number,
    volume: number,
    frequency: number,
    end = frequency,
    { delay = 0, noise = true, q = 0.7, attack = 0.004, pulse = 0 } = {},
  ) {
    const c = this.context;
    if (!c || !this.master || c.state !== "running") return;
    const at = c.currentTime + delay;
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    let source: AudioScheduledSourceNode;
    if (noise) {
      const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / c.sampleRate;
        data[i] =
          (Math.random() * 2 - 1) *
          (pulse ? 0.3 + 0.7 * Math.pow(Math.sin(t * pulse * Math.PI), 2) : 1);
      }
      const node = c.createBufferSource();
      node.buffer = buffer;
      source = node;
    } else {
      const node = c.createOscillator();
      node.frequency.setValueAtTime(frequency, at);
      node.frequency.exponentialRampToValueAtTime(end, at + duration);
      source = node;
    }
    filter.type = noise ? "bandpass" : "lowpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(noise ? frequency : 1800, at);
    if (noise) filter.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(attack, duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(at);
    source.stop(at + duration);
  }

  play(cue: Cue) {
    const thud = (v: number) => {
      this.layer(0.16, v, 95, 42, { noise: false });
      this.layer(0.065, v * 0.6, 320);
    };
    switch (cue) {
      case "step":
        return this.layer(0.055, 0.075, 520);
      case "cast":
        this.layer(0.27, 0.15, 550, 2800, { attack: 0.07 });
        return this.layer(0.18, 0.055, 3300, 1600, { delay: 0.06, pulse: 60 });
      case "metal":
        this.layer(0.12, 0.065, 1800, 1550, { noise: false });
        this.layer(0.07, 0.04, 2900, 2650, { noise: false });
        return this.layer(0.02, 0.13, 3500);
      case "rope":
        this.layer(0.38, 0.105, 650, 1100, { pulse: 32, q: 1.5 });
        return this.layer(0.3, 0.035, 230, 310, { q: 7, pulse: 45 });
      case "release":
        this.layer(0.04, 0.18, 1300);
        return this.layer(0.13, 0.075, 600, 180);
      case "snap":
        this.layer(0.025, 0.2, 2100);
        return this.layer(0.09, 0.1, 480, 180, { noise: false });
      case "air":
        return this.layer(0.4, 0.12, 700, 2400, { attack: 0.14 });
      case "heavy":
        thud(0.32);
        return this.layer(0.25, 0.1, 180, 80);
    }
  }
}

/* -------------------------------------------------------------------------- */

export function HookFetchStage({
  outcome,
  title,
  padLabel,
  resultCaption,
  onDone,
}: {
  /** Dialog heading, e.g. "Checking EDCL". */
  title: string;
  /** The real request's state. The drop waits for "success". */
  outcome: HookFetchOutcome;
  /** Text on the landing pad the file drops onto — the source's name. */
  padLabel: string;
  /** Final caption once the request has settled, e.g. "2 new notices." */
  resultCaption: string;
  /** Called when the performance has finished and the stage can close. */
  onDone: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `hook-clip-${uid}`;
  const titleId = `hook-title-${uid}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [longWait, setLongWait] = useState(false);
  const outcomeRef = useRef(outcome);
  const resultRef = useRef(resultCaption);
  const doneRef = useRef(onDone);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const padTextRef = useRef<SVGTextElement>(null);
  const propsRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const groundRef = useRef<SVGPathElement>(null);
  const workerRef = useRef<SVGGElement>(null);
  const capeRef = useRef<SVGPathElement>(null);
  const spineRef = useRef<SVGPathElement>(null);
  const armsRef = useRef<SVGPathElement>(null);
  const legsRef = useRef<SVGPathElement>(null);
  const palmsRef = useRef<SVGGElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const mouthRef = useRef<SVGPathElement>(null);
  const eyesRef = useRef<SVGPathElement>(null);
  const browsRef = useRef<SVGPathElement>(null);
  const marksRef = useRef<SVGPathElement>(null);
  const handRef = useRef<SVGGElement>(null);

  /** Fade out, then hand control back. Idempotent — the animation's end and
   *  the background button can both call it. */
  const leavingRef = useRef(false);
  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setVisible(false);
    window.setTimeout(() => doneRef.current(), EXIT_MS);
  }, []);

  // Freeze the page: no scrolling behind, focus held inside, restored after.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const enter = requestAnimationFrame(() => setVisible(true));
    dialogRef.current?.focus();
    const longWaitTimer = window.setTimeout(() => {
      if (outcomeRef.current === "pending") setLongWait(true);
    }, LONG_WAIT_MS);
    return () => {
      cancelAnimationFrame(enter);
      window.clearTimeout(longWaitTimer);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Only offered while the request is genuinely still out.
  const offerBackground = longWait && outcome === "pending";

  useEffect(() => {
    outcomeRef.current = outcome;
    resultRef.current = resultCaption;
    doneRef.current = onDone;
  }, [outcome, resultCaption, onDone]);

  useEffect(() => {
    const foley = new Foley();
    const audible = isSoundEnabled();
    if (audible) foley.start();

    const set = (el: Element | null, key: string, value: string | number) =>
      el?.setAttribute(key, String(value));

    function actor(
      t: number,
      x: number,
      y: number,
      pose: Pose,
      alpha: number,
      blend: Pose | null = null,
      f = 0,
    ) {
      const base = RIG[pose];
      const v = blend ? base.map((n, i) => lerp(n, RIG[blend][i], ease(f))) : [...base];
      const effort = pose === "haul";
      const flutter = Math.sin(Math.max(0, t) * 8 - 1) * 3;
      const trail = pose === "flat" ? 1 : 4;
      set(
        capeRef.current,
        "d",
        `M${v[0]} ${v[1] + 1}C${v[0] - 13} ${v[1] + 4 - trail} ${v[0] - 28} ${v[1] + 6 + flutter} ${v[0] - 39} ${v[1] + 15 + flutter}L${v[0] - 29} ${v[1] + 19 + flutter}Q${v[0] - 27} ${v[1] + 28} ${v[0] - 22} ${v[1] + 26}Q${v[0] - 9} ${v[1] + 21} ${v[0]} ${v[1] + 1}Z`,
      );
      set(workerRef.current, "opacity", alpha);
      set(workerRef.current, "transform", `translate(${x} ${y})`);
      set(spineRef.current, "d", `M${v[0]} ${v[1] - 5}Q${v[0] + 3} ${v[1] + 11} ${v[2]} ${v[3]}`);
      set(
        armsRef.current,
        "d",
        bentLimb(v[0], v[1], v[4], v[5], v[6], v[7]) + bentLimb(v[0], v[1], v[8], v[9], v[10], v[11]),
      );
      set(
        legsRef.current,
        "d",
        bentLimb(v[2], v[3], v[12], v[13], v[14], v[15]) +
          "q-3-2-7 0q-2 2 7 2" +
          bentLimb(v[2], v[3], v[16], v[17], v[18], v[19]) +
          "q4-2 7 1q1 2-7 1",
      );
      if (palmsRef.current) {
        palmsRef.current.innerHTML =
          `<circle cx="${v[6]}" cy="${v[7]}" r="2.3" fill="${BG}" stroke-width="1.5"/>` +
          (pose === "wave" ? "" : `<circle cx="${v[10]}" cy="${v[11]}" r="2.3" fill="${BG}" stroke-width="1.5"/>`);
      }
      set(
        faceRef.current,
        "transform",
        `translate(${v[0]} ${v[1] + 50}) rotate(${pose === "spent" ? 10 : 0} 0 -66)`,
      );
      set(
        mouthRef.current,
        "d",
        effort
          ? "M-5-60q5-5 10 0"
          : pose === "spent"
            ? "M-5-59q4-2 9 0"
            : pose === "flat"
              ? "M-4-60h8"
              : pose === "wave"
                ? "M-5-62q5 7 11-1"
                : "M-4-61q4 3 8 0",
      );
      set(
        eyesRef.current,
        "d",
        effort
          ? "M-7-70l4 2-4 2m14-4-4 2 4 2"
          : pose === "flat"
            ? "M-7-71l5 5m0-5-5 5m9-5 5 5m0-5-5 5"
            : "M-5-69v1m9-1v1",
      );
      set(
        browsRef.current,
        "d",
        effort ? "M-8-74l5 2m6 0 5-2" : pose === "spent" ? "M-8-73l5 2m6 0 5-2" : "",
      );
      const hx = v[0];
      const hy = v[1] - 16;
      set(
        marksRef.current,
        "d",
        effort
          ? `M${hx - 18} ${hy - 7}q-5-4-4 1q2 3 4-1m2 9q-6-1-4 3q3 1 4-3`
          : pose === "flat"
            ? `M${hx - 18} ${hy - 7}l-4-4m7-2-1-5m30 5 4-4`
            : "",
      );
      set(handRef.current, "opacity", pose === "wave" ? 1 : 0);
      set(handRef.current, "transform", `translate(${v[10]} ${v[11]}) scale(.7)`);
      set(groundRef.current, "opacity", 0.25 * alpha);
      return v;
    }

    function render(t: number, failed: boolean, looped: boolean) {
      const props = propsRef.current;
      const front = frontRef.current;
      if (!props || !front) return;
      front.innerHTML = "";
      props.innerHTML = "";

      let x = lerp(411, 449, ease(phase(t, 0, 0.5)));
      const y = 328;
      let pose: Pose = "stand";
      let next: Pose | null = null;
      let f = 0;
      if (t >= 0.5 && t < 0.9) [pose, next, f] = ["stand", "windup", phase(t, 0.5, 0.9)];
      else if (t >= 0.9 && t < 1.04) pose = "windup";
      else if (t >= 1.04 && t < 1.15) [pose, next, f] = ["windup", "overhead", phase(t, 1.04, 1.15)];
      else if (t >= 1.15 && t < 1.24) [pose, next, f] = ["overhead", "release", phase(t, 1.15, 1.24)];
      else if (t >= 1.24 && t < 1.48) [pose, next, f] = ["release", "follow", phase(t, 1.24, 1.48)];
      else if (t >= 1.48 && t < 1.75) pose = "follow";
      else if (t >= 1.75 && t < 2.7) [pose, next, f] = ["follow", "spent", phase(t, 1.75, 2.35)];
      else if (t >= 2.7 && t < 3.05) [pose, next, f] = ["spent", "windup", phase(t, 2.7, 3.05)];
      else if (t >= 3.05 && t < 3.2) pose = "windup";
      else if (t >= 3.2 && t < 3.29) [pose, next, f] = ["windup", "overhead", phase(t, 3.2, 3.29)];
      else if (t >= 3.29 && t < 3.38) [pose, next, f] = ["overhead", "release", phase(t, 3.29, 3.38)];
      else if (t >= 3.38 && t < 3.65) [pose, next, f] = ["release", "follow", phase(t, 3.38, 3.65)];
      else if (t >= 3.65 && t < 3.95) pose = "follow";
      else if (t >= 3.95 && t < HAUL_START) [pose, next, f] = ["follow", "haul", phase(t, 3.95, HAUL_START)];
      else if (t >= HAUL_START && t < HAUL_END) {
        pose = "haul";
        // After the first tug he holds his ground rather than stepping back
        // to the start of the loop.
        x += (looped ? 14 : ease(phase(t, HAUL_START, 5.8)) * 14) + Math.sin(t * 65) * 0.6;
      } else if (t >= HAUL_END && t < 6.3) {
        [pose, next, f] = ["haul", "flat", phase(t, HAUL_END, 6.3)];
        x = lerp(463, 480, ease(f));
      } else if (t >= 6.3 && t < 6.8) [x, pose] = [480, "flat"];
      else if (t >= 6.8 && t < 7.2) [x, pose, next, f] = [480, "flat", "spent", phase(t, 6.8, 7.2)];
      else if (t >= 7.2) [x, pose] = [480, failed ? "spent" : "wave"];

      const end = failed ? FAILURE_END : SUCCESS_END;
      const v = actor(t, x, y, pose, fade(t, 0, 0.25, end - 0.55, end - 0.05), next, f);
      const hand = { x: x + v[6], y: y + v[7] };

      // The file only comes loose on success; on failure it shivers and stays.
      const drop = failed ? 0 : phase(t, HAUL_END, 6.28);
      const tug = t > HAUL_START && t < HAUL_END ? Math.sin(t * 22) * 1.8 : 0;
      const shiver = failed && t >= HAUL_END ? Math.sin(t * 40) * 2 * (1 - phase(t, HAUL_END, 6.6)) : 0;
      const fy = 108 + tug + shiver + 210 * drop * drop;

      let hook = { ...hand };
      let sag = 12;
      let rotation = 0;
      if (t >= 1.24 && t < 2.2) {
        const q = phase(t, 1.24, 2.2);
        hook = { x: lerp(403, 386, q) - Math.sin(q * Math.PI) * 143, y: lerp(254, 320, q) - Math.sin(q * Math.PI) * 172 };
        sag = 35;
        rotation = q * 210;
      } else if (t >= 2.2 && t < 2.7) {
        const q = ease(phase(t, 2.2, 2.7));
        hook = { x: lerp(386, hand.x, q), y: lerp(320, hand.y, q) };
        sag = 25 * (1 - q);
      } else if (t >= 3.38 && t < 3.95) {
        const q = phase(t, 3.38, 3.95);
        hook = { x: lerp(403, 337, q), y: lerp(254, 176, q) - Math.sin(q * Math.PI) * 68 };
        sag = 24 * (1 - q);
        rotation = lerp(-80, -180, ease(q));
      } else if (t >= 3.95) {
        hook = { x: 337, y: fy + 68 };
        rotation = -180;
        sag = 0;
        if (failed && t >= HAUL_END) {
          // Snapped: the hook falls away on its own.
          const q = phase(t, HAUL_END, 6.3);
          hook = { x: lerp(337, 372, q), y: lerp(176, 318, q * q) };
          rotation = lerp(-180, -40, q);
        }
      }
      const ropeHand = t < 3.95 ? { x: x + v[10], y: y + v[11] } : hand;
      const ropeAlpha = fade(t, 0.5, 0.7, failed ? HAUL_END : 5.95, failed ? 5.95 : 6.14);
      const hookAlpha = failed ? fade(t, 0.5, 0.7, 6.6, 7) : ropeAlpha;
      if (t < 7) {
        props.innerHTML =
          `<g opacity="${ropeAlpha}">${stroke(`M${ropeHand.x} ${ropeHand.y}Q${(ropeHand.x + hook.x) / 2} ${(ropeHand.y + hook.y) / 2 + sag} ${hook.x} ${hook.y}`, 'stroke-width="1.2"')}</g>` +
          `<g opacity="${hookAlpha}" transform="translate(${hook.x} ${hook.y}) rotate(${rotation}) scale(.65)"><circle r="2.2" stroke="currentColor" stroke-width="1.6" fill="${BG}"/>${stroke("M0 2.2V16Q0 26 13 26T26 12V8l-5 6", 'stroke-width="1.8"')}</g>`;
      }
      const shelfAlpha = failed ? fade(t, 0.35, 0.6, end - 0.6, end - 0.1) : fade(t, 0.35, 0.6, 6.1, 6.4);
      props.innerHTML += `<g opacity="${shelfAlpha}">${stroke("M268 105h104M273 105l-6-8m22 8-6-8m22 8-6-8m22 8-6-8m22 8-6-8m22 8-6-8", 'opacity=".65"')}<g clip-path="url(#${clipId})">${fileGlyph(320, fy)}${stroke(`M313 ${fy + 46}v7a7 7 0 0 0 14 0v-7`, 'stroke-width="2"')}</g></g>`;
      if (t >= 3.95 && t < 4.08) front.innerHTML = stroke("M304 161l-5 3m34-4 6 3M319 174v5");
      if (failed && t >= HAUL_END && t < 6.05) front.innerHTML = stroke("M330 196l-8-6m14 2 2-9m6 11 9-3", 'stroke="var(--destructive)"');

      if (padTextRef.current) {
        padTextRef.current.textContent =
          t < 3.95 ? "Fetching…" : t < HAUL_END ? "Pulling…" : failed ? "Snapped" : t < 6.3 ? "Incoming!" : padLabel;
      }
      if (captionRef.current) {
        captionRef.current.textContent =
          t < 1.24
            ? `Checking ${padLabel}. He has a plan.`
            : t < 2.2
              ? "Almost."
              : t < 3.38
                ? "That was a practice throw."
                : t < 3.95
                  ? "One more try."
                  : t < 4.3
                    ? "Got it."
                    : t < HAUL_END
                      ? "Just. A little. Tug."
                      : resultRef.current;
      }
    }

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let previous = -1;
    let failed = false;
    let looped = false;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      // Hold the tug until the server has answered — never drop early.
      if (clock >= HAUL_END && outcomeRef.current === "pending") {
        clock -= HAUL_END - HAUL_START;
        previous = HAUL_START - 0.001;
        looped = true;
      }
      if (clock >= HAUL_END && clock - dt < HAUL_END) failed = outcomeRef.current === "error";
      const cues = [...CUES, ...(clock >= HAUL_END ? (failed ? FAILURE_CUES : SUCCESS_CUES) : [])];
      if (audible) {
        for (const [at, cue] of cues) {
          if (at > previous && at <= clock && clock - at < 0.15) foley.play(cue);
        }
      }
      previous = clock;
      render(clock, failed, looped);
      if (clock < (failed ? FAILURE_END : SUCCESS_END)) raf = requestAnimationFrame(tick);
      else leave();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      foley.close();
    };
  }, [clipId, padLabel, leave]);

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[300] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-md transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={outcome === "pending"}
        tabIndex={-1}
        onKeyDown={(event) => {
          // The page is frozen on purpose: Escape does nothing, and Tab can
          // only reach the background button once it exists.
          if (event.key === "Escape") event.preventDefault();
          if (event.key === "Tab") {
            event.preventDefault();
            hideRef.current?.focus();
          }
        }}
        className={cn(
          "w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-card text-foreground shadow-2xl outline-none transition-all duration-300",
          visible ? "translate-y-0 scale-100" : "translate-y-3 scale-95",
        )}
      >
        <header className="flex items-start justify-between gap-3 px-6 pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              Looking for newly published tender notices.
            </p>
          </div>
          <span
            className={cn(
              "mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
              outcome === "error"
                ? "bg-destructive/10 text-destructive ring-destructive/20"
                : outcome === "success"
                  ? "bg-success/10 text-success ring-success/20"
                  : "bg-primary/10 text-primary ring-primary/20",
            )}
          >
            <span className="relative flex size-2">
              {outcome === "pending" && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            {outcome === "pending" ? "Live" : outcome === "success" ? "Done" : "Failed"}
          </span>
        </header>

        <div className="mx-5 mt-4 rounded-2xl bg-gradient-to-b from-primary/[0.07] via-secondary/40 to-transparent ring-1 ring-inset ring-border/50">
          <svg
            viewBox="196 60 330 290"
            className="mx-auto block h-60 w-auto max-w-full sm:h-72"
            fill="none"
            aria-hidden
          >
            <defs>
              <clipPath id={clipId}>
                <rect width="640" height="280" />
              </clipPath>
            </defs>
            {/* Soft floor so the figure stands on something. */}
            <ellipse cx="400" cy="331" rx="150" ry="7" fill="currentColor" opacity=".05" />
            <path
              ref={groundRef}
              d="M161 328q75-2 147 0m9 0 66 1m8-1 72-1"
              stroke="currentColor"
              strokeWidth=".8"
              opacity="0"
            />
            <g ref={propsRef} />
            {/* The landing pad the notice drops into — the source's own "button". */}
            <g>
              <rect
                x="220"
                y="280"
                width="200"
                height="48"
                rx="12"
                fill="var(--primary)"
                fillOpacity=".08"
                stroke="var(--primary)"
                strokeOpacity=".45"
                strokeWidth="1.5"
              />
              <text
                ref={padTextRef}
                x="320"
                y="309"
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill="var(--primary)"
                stroke="none"
              >
                Fetching…
              </text>
            </g>
            <g
              ref={workerRef}
              opacity="0"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path ref={capeRef} fill={CAPE} stroke="none" />
              <path ref={spineRef} />
              <path ref={armsRef} />
              <path ref={legsRef} />
              <g ref={faceRef}>
                <ellipse cy="-66" rx="12" ry="11.5" fill={BG} />
                <path ref={mouthRef} strokeWidth="1.6" />
                <path ref={eyesRef} strokeWidth="1.7" />
                <path ref={browsRef} strokeWidth="1.3" />
              </g>
              <g ref={palmsRef} />
              <g ref={handRef} opacity="0">
                <path
                  d="M-3 2V-6L1-11V-18Q1-21 4-20Q7-19 6-15L5-10H12Q15-10 14-6L12 1Q12 3 9 3H1Z"
                  fill="currentColor"
                  strokeWidth="1.2"
                />
                <path d="M0-5V1M7-6H12" stroke={BG} strokeWidth="1.2" />
              </g>
              <path ref={marksRef} fill="none" strokeWidth="1.3" />
            </g>
            <g ref={frontRef} />
          </svg>
        </div>

        <p
          ref={captionRef}
          aria-hidden
          className="min-h-12 px-6 pt-4 text-center text-sm font-semibold text-foreground/80"
        />

        <footer className="flex min-h-12 items-center justify-center px-6 pb-5">
          {offerBackground && (
            <button
              ref={hideRef}
              type="button"
              onClick={leave}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Taking a while — keep checking in the background
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

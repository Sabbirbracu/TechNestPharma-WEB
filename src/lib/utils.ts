import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic, deduping conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compare two ISO timestamps newest-first, by the instant they name.
 *
 * These strings must NOT be compared with `localeCompare`. Mail carries the
 * offset of whoever wrote the Date header: a supplier's reply arrives as
 * `…T21:01:42+06:00` while our own sent copy comes back from Google's SMTP as
 * `…T08:04:20-07:00`. Those are three minutes apart, but as text the second
 * sorts thirteen hours earlier — which pushed every outbound message to the
 * bottom of a thread and made replies look like they had not been sent.
 *
 * Sorts unparseable/missing values last rather than throwing them to the top.
 */
export function byNewest(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const left = a ? Date.parse(a) : NaN;
  const right = b ? Date.parse(b) : NaN;
  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return 1;
  if (Number.isNaN(right)) return -1;
  return right - left;
}

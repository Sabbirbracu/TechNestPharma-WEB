"use client";

import { useEffect, useState } from "react";

/**
 * Delays a rapidly-changing value. Used on filter inputs so each keystroke does
 * not become its own request — the query key only changes once typing settles.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

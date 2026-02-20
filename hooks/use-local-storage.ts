"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Ignore malformed local state and keep defaults.
    } finally {
      setLoaded(true);
    }
  }, [key]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // No-op if storage is unavailable.
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}

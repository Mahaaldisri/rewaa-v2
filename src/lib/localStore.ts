/** Thin, crash-proof wrapper around localStorage (private browsing / SSR safe). */

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — fail silently, state stays in-memory */
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** Stable per-browser identifier used to attach orders to guest checkouts. */
export function getGuestToken(): string {
  const KEY = "rewaa_guest_token";
  let token = readJSON<string | null>(KEY, null);
  if (!token) {
    token = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    writeJSON(KEY, token);
  }
  return token;
}

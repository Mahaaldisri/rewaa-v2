import { readJSON, writeJSON, removeKey } from "@/lib/localStore";
import { env } from "@/config/env";

/**
 * Consent layer for analytics and marketing.
 *
 * - "necessary" storage (cart, session, consent itself) is always allowed —
 *   it is required for the store to work at all.
 * - "analytics" and "marketing" are opt-in. No third-party script is loaded and
 *   no event leaves the browser before the matching category is granted.
 * - The decision is versioned: bumping `CONSENT_VERSION` (for example after a
 *   policy change) asks every visitor again.
 */

export const CONSENT_VERSION = "2026-01";
const CONSENT_KEY = "rewaa_consent";

export interface ConsentState {
  version: string;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of the visitor's last decision. */
  updatedAt: string;
}

type Listener = (state: ConsentState | null) => void;

const listeners = new Set<Listener>();

function isFresh(state: ConsentState | null): state is ConsentState {
  return Boolean(state && state.version === CONSENT_VERSION);
}

export const consent = {
  /** Stored decision, or null when the visitor has not decided yet. */
  read(): ConsentState | null {
    const stored = readJSON<ConsentState | null>(CONSENT_KEY, null);
    return isFresh(stored) ? stored : null;
  },

  isDecided(): boolean {
    return consent.read() !== null;
  },

  state(): ConsentState {
    const stored = consent.read();
    if (stored) return stored;
    return {
      version: CONSENT_VERSION,
      // When consent is not required (e.g. an internal/staging deployment)
      // measurement is on by default, but the visitor can still turn it off.
      analytics: !env.analytics.requireConsent,
      marketing: false,
      updatedAt: "",
    };
  },

  save(partial: { analytics: boolean; marketing: boolean }): ConsentState {
    const next: ConsentState = {
      version: CONSENT_VERSION,
      analytics: partial.analytics,
      marketing: partial.marketing,
      updatedAt: new Date().toISOString(),
    };
    writeJSON(CONSENT_KEY, next);
    listeners.forEach((listener) => listener(next));
    return next;
  },

  /** Withdraws everything except what the store needs to function. */
  revokeAll(): ConsentState {
    return consent.save({ analytics: false, marketing: false });
  },

  /** Used by the "reset" action on the privacy page and by tests. */
  clear(): void {
    removeKey(CONSENT_KEY);
    listeners.forEach((listener) => listener(null));
  },

  isAllowed(category: "analytics" | "marketing"): boolean {
    if (category === "analytics" && !env.analytics.requireConsent) return consent.state().analytics;
    return consent.state()[category];
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export type { Listener as ConsentListener };

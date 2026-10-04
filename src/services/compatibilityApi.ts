import {
  knownModels,
  partsForDeviceSlug,
  searchCompatibleParts,
  sparePartSummaries,
  type CompatibilityResult,
  type DeviceCompatibility,
} from "@/lib/compatibility";
import { productBySlug } from "@/data/catalog";

/**
 * Compatibility service.
 *
 * The catalogue is the single source of truth, and it is served through this
 * facade so components never read data files directly. When a backend exposes
 * `/compatibility` it only has to replace the bodies here — the UI contract
 * (`CompatibilityResult` / `DeviceCompatibility`) stays the same.
 */
/** Mirrors the latency of the other mock services so the UI behaves the same. */
function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const compatibilityApi = {
  /** Search by device name, model code or SKU. */
  async search(query: string): Promise<CompatibilityResult> {
    await delay(240);
    return searchCompatibleParts(query);
  },

  /** Everything that declares compatibility with a device product. */
  async forDevice(slug: string): Promise<DeviceCompatibility | undefined> {
    await delay(200);
    return partsForDeviceSlug(slug);
  },

  /** Model codes present in the catalogue (search hints, empty states). */
  async models(): Promise<string[]> {
    await delay(80);
    return knownModels.slice(0, 40);
  },

  /** Spare parts available in the catalogue. */
  async parts() {
    await delay(120);
    return sparePartSummaries();
  },

  /** Sync helpers for seeds/derived UI that already resolved the catalogue. */
  sync: {
    search: searchCompatibleParts,
    forDevice: (slug: string) => partsForDeviceSlug(slug),
    parts: sparePartSummaries,
    deviceName(slug: string): string | undefined {
      return productBySlug(slug)?.name;
    },
  },
};

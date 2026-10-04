import { cities, pickupBranches, shipping as catalogShipping } from "@/data/catalog/support";
import { shipping as shippingRules } from "@/config/site";
import type { City, PickupBranch, ShippingConfig } from "@/types/product";

/**
 * Reference data (cities, shipping options, pickup branches, payment catalogue).
 *
 * UI components must go through this module instead of reading the catalogue
 * files directly, so the data can later be served by the API without touching
 * a single component. Latency is intentionally small — it is reference data.
 */

export interface ShippingMethodOption {
  id: "standard" | "express" | "same_day" | "pickup";
  label: string;
  hint: string;
  icon: "truck" | "bolt" | "package" | "store";
  /** Base cost before per-city rules; 0 means free. */
  baseCost: number;
  requiresSameDayCity: boolean;
}

const METHODS: ShippingMethodOption[] = [
  { id: "standard", label: "شحن قياسي", hint: "الخيار الأكثر اقتصادًا", icon: "truck", baseCost: shippingRules.flatRate, requiresSameDayCity: false },
  { id: "express", label: "شحن سريع", hint: "أولوية في التجهيز والتوصيل", icon: "bolt", baseCost: shippingRules.expressRate, requiresSameDayCity: false },
  { id: "same_day", label: "توصيل في نفس اليوم", hint: "للمدن التي تتوفر فيها الخدمة", icon: "package", baseCost: shippingRules.sameDayRate, requiresSameDayCity: true },
  { id: "pickup", label: "استلام من المعرض", hint: "بدون رسوم شحن", icon: "store", baseCost: 0, requiresSameDayCity: false },
];

function wait(ms = 90): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const referenceApi = {
  /** GET /v1/reference/cities */
  async listCities(): Promise<City[]> {
    await wait();
    return cities;
  },

  /** GET /v1/reference/cities/:id */
  async getCity(cityId: string): Promise<City | undefined> {
    await wait(60);
    return cities.find((city) => city.id === cityId);
  },

  /** GET /v1/reference/shipping — thresholds + available methods. */
  async shippingConfig(): Promise<ShippingConfig> {
    await wait(60);
    return catalogShipping;
  },

  /** GET /v1/reference/shipping-methods */
  async listShippingMethods(): Promise<ShippingMethodOption[]> {
    await wait(60);
    return METHODS;
  },

  /** GET /v1/reference/branches?city= */
  async listPickupBranches(cityName?: string): Promise<PickupBranch[]> {
    await wait(80);
    return cityName ? pickupBranches.filter((branch) => branch.city === cityName) : pickupBranches;
  },

  /** Synchronous helpers for components that already have the config loaded. */
  shipping: {
    /** Cost of a method for a given order value and destination city. */
    costFor(methodId: ShippingMethodOption["id"], orderValue: number, city?: City): number {
      if (methodId === "pickup") return 0;
      if (orderValue >= shippingRules.freeShippingThreshold && methodId === "standard") return 0;
      const method = METHODS.find((entry) => entry.id === methodId);
      if (!method) return shippingRules.flatRate;
      if (method.requiresSameDayCity && !city?.sameDayAvailable) return shippingRules.expressRate;
      return method.baseCost;
    },
    isAvailable(methodId: ShippingMethodOption["id"], city?: City): boolean {
      const method = METHODS.find((entry) => entry.id === methodId);
      if (!method) return false;
      if (!method.requiresSameDayCity) return true;
      return Boolean(city?.sameDayAvailable);
    },
    /** [min, max] business days for a method in a city. */
    etaFor(methodId: ShippingMethodOption["id"], city?: City): [number, number] {
      if (!city) return [2, 5];
      if (methodId === "same_day") return [0, 1];
      if (methodId === "express") return city.expressEta;
      return city.standardEta;
    },
    freeShippingThreshold: shippingRules.freeShippingThreshold,
  },
};

export type { City, PickupBranch, ShippingConfig };

import { branches } from "@/data/content/branches";
import { serviceAreas } from "@/config/site";
import { env } from "@/config/env";
import { ApiError } from "@/types/product";

/**
 * Service availability.
 *
 * Three clearly separated sources:
 *   - `api`         a real backend answered (the only source used in production).
 *   - `sample`      the development/demo build synthesises slots from the
 *                   branches + service windows. Everything is labelled as a
 *                   sample and no figure is presented as a confirmed booking.
 *   - `unavailable` nothing is known: the UI must show no coverage, no fee and
 *                   no slot rather than inventing them.
 *
 * Coverage itself is *not* invented anywhere: the served cities come from
 * `serviceAreas.cities` (editable business configuration).
 */

export type AvailabilitySource = "api" | "sample" | "unavailable";

export interface AvailabilityWindow {
  /** e.g. "9:00 ص – 12:00 م" */
  label: string;
  /** ISO date (yyyy-mm-dd) the window belongs to. */
  date: string;
  /** True when the value is generated for the demo build. */
  sample: boolean;
}

export interface ServiceAvailability {
  cityId: string;
  cityName: string;
  covered: boolean;
  source: AvailabilitySource;
  /** Districts served in this city, from the branch directory. */
  districts: string[];
  installation: { available: boolean; fee?: number; sampleFee: boolean };
  maintenance: { available: boolean; fee?: number; sampleFee: boolean };
  waterTest: { available: boolean; fee?: number; sampleFee: boolean };
  /** Nearest visit window, only when a source can provide one. */
  nearestSlot?: AvailabilityWindow;
  /** Branch that would handle the visit, when known. */
  branch?: { name: string; district: string; phone: string; hours: string };
  /** Shopper-facing note about data provenance. */
  note: string;
}

interface Query {
  /** City id or Arabic name; matched against the branch directory. */
  city: string;
  /** Optional district to narrow the answer. */
  district?: string;
}

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(new Date(isoDate));
}

/** Demo slots: the next two working windows (Friday is a weekend day here). */
function sampleSlot(): AvailabilityWindow {
  const windows = serviceAreas.visitWindows;
  let offset = 1;
  let date = todayPlus(offset);
  while (new Date(date).getDay() === 5) {
    offset += 1;
    date = todayPlus(offset);
  }
  return {
    label: `${weekdayLabel(date)} · ${windows[0]}`,
    date,
    sample: true,
  };
}

function normalise(value: string): string {
  return value.trim().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
}

function branchesFor(city: string) {
  const target = normalise(city);
  return branches.filter(
    (branch) => normalise(branch.city) === target || normalise(branch.cityId) === target || normalise(branch.name).includes(target)
  );
}

/**
 * Local (no backend) answer built from configuration + the branch directory.
 * Used for the mock/demo path only.
 */
function localAnswer(query: Query, source: AvailabilitySource): ServiceAvailability {
  const matched = branchesFor(query.city);
  const servedCity = serviceAreas.cities.find((city) => normalise(city) === normalise(query.city));
  const cityName = matched[0]?.city ?? servedCity ?? query.city;
  const covered = matched.length > 0 || Boolean(servedCity);

  const sample = source === "sample";
  const branch = matched[0];
  const districts = matched.map((entry) => entry.district).filter(Boolean);
  const fee = (value: number) => (sample ? value : undefined);

  return {
    cityId: branch?.cityId ?? normalise(cityName),
    cityName,
    covered,
    source: source === "sample" ? "sample" : covered ? "unavailable" : "unavailable",
    districts: query.district && districts.length > 0 ? districts.filter((d) => normalise(d).includes(normalise(query.district!))) : districts,
    installation: {
      available: covered && sample,
      fee: fee(serviceAreas.estimatedFees.installation),
      sampleFee: sample,
    },
    maintenance: {
      available: covered && sample,
      fee: fee(serviceAreas.estimatedFees.maintenanceVisit),
      sampleFee: sample,
    },
    waterTest: {
      available: covered && sample,
      fee: fee(serviceAreas.estimatedFees.waterTestVisit),
      sampleFee: sample,
    },
    nearestSlot: covered && sample ? sampleSlot() : undefined,
    branch: branch ? { name: branch.name, district: branch.district, phone: branch.phone, hours: branch.hours } : undefined,
    note: covered
      ? sample
        ? "بيانات توفر تجريبية للعرض: المواعيد والرسوم تقديرية وتُحدد نهائيًا عند تأكيد الحجز."
        : "المدينة ضمن نطاق الخدمة المعلن. تُحدَّد المواعيد والرسوم عند تأكيد الحجز مع الفريق."
      : `${serviceAreas.note} يمكنك إرسال بياناتك وسيتواصل الفريق لتأكيد إمكانية الخدمة.`,
  };
}

export const availabilityApi = {
  /**
   * Availability for a city (and optionally a district).
   * Production without a configured backend returns `unavailable` — never a
   * made-up slot, fee or coverage.
   */
  async forCity(query: Query): Promise<ServiceAvailability> {
    if (env.api.configured && !env.mock.enabled) {
      try {
        const response = await fetch(`${env.api.url}/v1/services/availability?city=${encodeURIComponent(query.city)}${
          query.district ? `&district=${encodeURIComponent(query.district)}` : ""
        }`, { headers: { accept: "application/json" } });
        if (!response.ok) throw new ApiError("تعذّر جلب مواعيد الخدمة", "AVAILABILITY_ERROR", response.status);
        const data = (await response.json()) as Omit<ServiceAvailability, "source" | "note"> & { note?: string };
        return { ...data, source: "api", note: data.note ?? "بيانات مباشرة من خدمة الجدولة." };
      } catch {
        return {
          ...localAnswer(query, "unavailable"),
          source: "unavailable",
          note: "تعذّر الوصول إلى خدمة المواعيد الآن. أرسل طلبك وسيتم تأكيد الموعد معك.",
        };
      }
    }

    if (env.mock.enabled) {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const answer = localAnswer(query, "sample");
      return { ...answer, source: "sample" };
    }

    return localAnswer(query, "unavailable");
  },

  /** Served cities for pickers — configuration, not invented data. */
  servedCities(): { id: string; name: string; districts: string[] }[] {
    return serviceAreas.cities.map((city) => ({
      id: normalise(city),
      name: city,
      districts: branchesFor(city).map((branch) => branch.district),
    }));
  },

  /** Sync view of coverage for maps/lists that already know the city. */
  coverageFor(city: string): { covered: boolean; districts: string[] } {
    const matched = branchesFor(city);
    const covered = matched.length > 0 || serviceAreas.cities.some((entry) => normalise(entry) === normalise(city));
    return { covered, districts: matched.map((branch) => branch.district) };
  },
};

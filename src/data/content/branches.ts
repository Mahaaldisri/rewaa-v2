import type { Branch } from "@/types/content";
import { contact } from "@/config/site";

/**
 * Showroom / branch directory.
 * Addresses and coordinates are demo values (PLACEHOLDER) — replace them with
 * the real branch records once they are confirmed.
 */
export const branches: Branch[] = [
  {
    id: "br-riyadh-malqa",
    name: "رواء – الملقا (المعرض الرئيسي)",
    city: "الرياض",
    cityId: "riyadh",
    district: "حي الملقا",
    address: "طريق الملك عبدالعزيز، تقاطع أنس بن مالك",
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hours: "السبت – الخميس · 9 ص – 10 م",
    hoursNote: "الجمعة · 4 م – 10 م",
    services: ["بيع الأنظمة", "استلام الطلبات", "تركيب ميداني", "صيانة وقطع غيار", "فحص مياه"],
    coordinates: { lat: 24.7757, lng: 46.6265 },
    mapsQuery: "رواء لتقنيات المياه حي الملقا الرياض",
    isFlagship: true,
  },
  {
    id: "br-riyadh-industrial",
    name: "رواء – مخرج 9 الصناعية",
    city: "الرياض",
    cityId: "riyadh",
    district: "المنطقة الصناعية الثانية",
    address: "طريق الدمام، مخرج 9",
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hours: "السبت – الخميس · 8 ص – 8 م",
    services: ["مستودع وقطع غيار", "تجهيز المشاريع", "أنظمة مركزية", "تحلية"],
    coordinates: { lat: 24.6092, lng: 46.8052 },
    mapsQuery: "المنطقة الصناعية الثانية مخرج 9 الرياض",
  },
  {
    id: "br-jeddah",
    name: "رواء – جدة",
    city: "جدة",
    cityId: "jeddah",
    district: "حي الزهراء",
    address: "طريق الأمير سلطان، مقابل مركز التسوق",
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hours: "السبت – الخميس · 9 ص – 11 م",
    hoursNote: "الجمعة · 4 م – 11 م",
    services: ["بيع الأنظمة", "تركيب ميداني", "صيانة وقطع غيار", "فحص مياه"],
    coordinates: { lat: 21.5802, lng: 39.1626 },
    mapsQuery: "رواء لتقنيات المياه طريق الأمير سلطان جدة",
  },
  {
    id: "br-dammam",
    name: "رواء – الدمام",
    city: "الدمام",
    cityId: "dammam",
    district: "حي الفيصلية",
    address: "شارع الملك فهد، قرب تقاطع الأمير محمد بن فهد",
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hours: "السبت – الخميس · 9 ص – 10 م",
    services: ["بيع الأنظمة", "تركيب ميداني", "صيانة", "قطع غيار"],
    coordinates: { lat: 26.4207, lng: 50.0888 },
    mapsQuery: "رواء لتقنيات المياه شارع الملك فهد الدمام",
  },
  {
    id: "br-khobar",
    name: "رواء – الخبر (خدمة وحجز)",
    city: "الخبر",
    cityId: "khobar",
    district: "حي العقربية",
    address: "طريق الملك فيصل، مبنى الخدمات الفنية",
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hours: "السبت – الخميس · 9 ص – 6 م",
    services: ["صيانة", "تركيب ميداني", "فحص مياه", "استلام طلبات"],
    coordinates: { lat: 26.2794, lng: 50.2080 },
    mapsQuery: "رواء لتقنيات المياه طريق الملك فيصل الخبر",
  },
];

export function branchesByCity(cityId: string): Branch[] {
  return branches.filter((branch) => branch.cityId === cityId);
}

export const branchCities = Array.from(new Set(branches.map((branch) => branch.city)));

export const branchServices = Array.from(new Set(branches.flatMap((branch) => branch.services)));

export function directionsUrl(branch: Branch): string {
  const query = encodeURIComponent(branch.mapsQuery);
  return `https://www.google.com/maps/search/?api=1&query=${query}&center=${branch.coordinates.lat},${branch.coordinates.lng}`;
}

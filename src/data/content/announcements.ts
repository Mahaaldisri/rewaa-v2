import type { Announcement } from "@/types/content";
import { shipping } from "@/config/site";
import { formatMoney } from "@/lib/format";

/**
 * Homepage notices.
 *
 * Every notice either restates a value from `src/config/site.ts` or points at a
 * feature that exists in this storefront. No deadlines are invented, so none of
 * them carry `startsAt`/`endsAt` — the scheduling fields exist for future
 * seasonal notices and are honoured by `contentApi.listAnnouncements()`.
 */
export const announcements: Announcement[] = [
  {
    id: "free-shipping-threshold",
    kind: "shipping",
    icon: "truck",
    title: `توصيل مجاني فوق ${formatMoney(shipping.freeShippingThreshold)}`,
    body: "يُحسب الشرط تلقائيًا في سلة الشراء، ويظهر المجموع النهائي قبل الدفع.",
    href: "/legal/shipping",
    ctaLabel: "سياسة الشحن",
    tone: "brand",
    featured: true,
  },
  {
    id: "compatibility-checker",
    kind: "tool",
    icon: "settings",
    title: "فاحص توافق القطع متاح مجانًا",
    body: "اكتب اسم جهازك أو رقم الموديل لتعرف الشمعات المتوافقة وبدائلها.",
    href: "/compatibility",
    ctaLabel: "افحص التوافق",
    tone: "aqua",
  },
  {
    id: "service-visit-booking",
    kind: "service",
    icon: "calendar",
    title: "حجز زيارة فني أو صيانة",
    body: "اختر مدينتك لتعرف التوفر والرسوم التقديرية قبل تأكيد الحجز.",
    href: "/services",
    ctaLabel: "اعرض الخدمات",
    tone: "success",
  },
];

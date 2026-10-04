import type { IconName } from "@/components/ui/Icon";

/**
 * Homepage hero slides.
 *
 * Copy lives here (not in JSX) so the storefront team can edit it without
 * touching components. Every claim in these slides is either a plain statement
 * about what the store offers or a link to a page that proves it — no
 * certifications, coverage, counts or percentages are asserted here.
 */
export interface HeroSlide {
  id: string;
  /** Small ribbon shown when no live offer replaces it. */
  eyebrow: string;
  eyebrowIcon: IconName;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryCta: { label: string; href: string; icon: IconName };
  secondaryCta?: { label: string; href: string; icon: IconName };
  /** Optional card floating over the side image (desktop only). */
  aside?: { icon: IconName; title: string; body: string; ctaLabel: string; ctaHref: string };
}

export const heroSlides: HeroSlide[] = [
  {
    id: "storefront",
    eyebrow: "أنظمة تنقية وتحلية مياه",
    eyebrowIcon: "droplet",
    title: "أنظمة تنقية وتحلية مياه، بقطع متوفرة وخدمة تصل إليك",
    description:
      "من فلتر تحت المغسلة إلى وحدة تحلية لمشروع كامل: نختار معك النظام المناسب، نركّبه، ونوفّر شمعاته وقطعه لاحقًا — مع ضمان معلن على صفحة كل منتج.",
    image: "/images/hero-kitchen.jpg",
    imageAlt: "مطبخ منزلي مزوّد بنظام تنقية مياه تحت المغسلة",
    primaryCta: { label: "تسوّق فلاتر المياه", href: "/c/water-filters", icon: "droplet" },
    secondaryCta: { label: "ساعدني أختار", href: "/product-finder", icon: "target" },
    aside: {
      icon: "calendar",
      title: "حجز زيارة فني في 4 خطوات",
      body: "اختر نوع الخدمة والموعد المفضل، ويصلك رقم طلب تتابع به الزيارة.",
      ctaLabel: "احجز الآن",
      ctaHref: "/services/book",
    },
  },
  {
    id: "services",
    eyebrow: "تركيب وصيانة",
    eyebrowIcon: "wrench",
    title: "فني يركّب النظام ويشرح لك الصيانة والدورة الزمنية للشمعات",
    description:
      "احجز زيارة تركيب أو صيانة أو فحص مياه، وتابع حالة الطلب برقم مرجعي. التغطية والمواعيد تُعرض حسب مدينتك قبل تأكيد أي حجز.",
    image: "/images/hero-technician.jpg",
    imageAlt: "فني رواء أثناء تركيب نظام تنقية مياه",
    primaryCta: { label: "احجز خدمة", href: "/services/book", icon: "calendar" },
    secondaryCta: { label: "كل الخدمات", href: "/services", icon: "headset" },
    aside: {
      icon: "mapPin",
      title: "تغطية الخدمة حسب المدينة",
      body: "اختر مدينتك في صفحة الخدمة لتعرف التوفر والرسوم التقديرية قبل التأكيد.",
      ctaLabel: "اعرض الخدمات",
      ctaHref: "/services",
    },
  },
  {
    id: "parts",
    eyebrow: "قطع وشمعات",
    eyebrowIcon: "layers",
    title: "اعرف شمعة جهازك بالضبط قبل أن تطلبها",
    description:
      "اكتب اسم الجهاز أو رقم الموديل، وسيعرض فاحص التوافق القطع التي تُعلن بيانات المنتج توافقها معها — مع سبب التطابق وبدائل متاحة، وتكلفة تشغيل تقدر تحسبها بنفسك.",
    image: "/images/hero-kitchen.jpg",
    imageAlt: "نظام تنقية مياه منزلي بعد التركيب",
    primaryCta: { label: "افحص توافق القطع", href: "/compatibility", icon: "settings" },
    secondaryCta: { label: "تسوّق الشمعات", href: "/c/cartridges", icon: "package" },
    aside: {
      icon: "percent",
      title: "كم تكلّفك الشمعات سنويًا؟",
      body: "حاسبة التوفير تقدّر تكلفة التشغيل ونقطة التعادل بأرقامك أنت.",
      ctaLabel: "افتح الحاسبة",
      ctaHref: "/calculator",
    },
  },
];

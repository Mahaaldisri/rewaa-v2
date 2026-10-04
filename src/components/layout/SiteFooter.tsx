import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PaymentGlyphs } from "@/components/product/PaymentMethods";
import { LogoMark } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/common/NewsletterForm";

const isExternal = (href: string) => href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("http");

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "تسوّق",
    links: [
      { label: "أنظمة التناضح العكسي", href: "/c/water-filters/ro" },
      { label: "الفلاتر المباشرة", href: "/c/water-filters/direct-flow" },
      { label: "الشمعات وقطع الغيار", href: "/c/cartridges" },
      { label: "فاحص توافق القطع", href: "/compatibility" },
      { label: "حاسبة توفير المياه", href: "/calculator" },
      { label: "العلامات التجارية", href: "/brands" },
      { label: "مضخات وخزانات", href: "/c/pumps-equipment" },
      { label: "أجهزة قياس وفحص المياه", href: "/c/testing" },
    ],
  },
  {
    title: "الخدمات والدعم",
    links: [
      { label: "حجز فني تركيب", href: "/services/install" },
      { label: "عقود الصيانة السنوية", href: "/services/contracts" },
      { label: "تحليل مياه مجاني", href: "/services/water-test" },
      { label: "تتبع طلبك", href: "/help/track" },
      { label: "الإرجاع والاستبدال", href: "/help/returns" },
    ],
  },
  {
    title: "عن رواء",
    links: [
      { label: "من نحن", href: "/about" },
      { label: "معارضنا", href: "/stores" },
      { label: "مشاريع تجارية وصناعية", href: "/business" },
      { label: "سياسة الخصوصية", href: "/legal/privacy" },
      { label: "الشروط والأحكام", href: "/legal/terms" },
    ],
  },
];

const SOCIAL: { icon: IconName; label: string; href: string }[] = [
  { icon: "message", label: "واتساب الدعم الفني", href: "/contact/whatsapp" },
  { icon: "phone", label: "920001234", href: "tel:920001234" },
  { icon: "store", label: "معارضنا", href: "/stores" },
  { icon: "headset", label: "طلب زيارة فني", href: "/services/book" },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-ink-950 text-ink-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_320px_at_85%_-10%,rgba(192,145,47,0.18),transparent_70%),radial-gradient(700px_300px_at_5%_0%,rgba(18,131,106,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.035]" />

      <div className="container-x relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-white p-2 shadow-hair">
                <LogoMark className="size-full" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-xl font-extrabold text-white">رواء</span>
                <span className="mt-1 text-[9px] font-bold tracking-[0.32em] text-aqua-300">REWAA</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-6 text-ink-300">
              متجر متخصص في بيع وتركيب وصيانة أنظمة تنقية المياه والمعدات المرتبطة بها — للمنازل والمنشآت
              التجارية، مع قطع استهلاكية متوفرة وخدمة ما بعد البيع.
            </p>

            <div className="mt-6 max-w-sm">
              <NewsletterForm tone="dark" />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIAL.map((item) => {
                const className =
                  "flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-[12px] font-medium text-ink-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white";
                const content = (
                  <>
                    <Icon name={item.icon} size={15} className="text-aqua-300" />
                    {item.label}
                  </>
                );
                return isExternal(item.href) ? (
                  <a key={item.href} href={item.href} className={className}>
                    {content}
                  </a>
                ) : (
                  <Link key={item.href} to={item.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="mb-3.5 font-display text-[13px] font-bold text-white">{col.title}</h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-[12.5px] text-ink-300 transition-colors hover:text-aqua-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11.5px] font-semibold text-ink-200">وسائل دفع آمنة ومعتمدة</p>
            <div className="mt-2.5">
              <PaymentGlyphs variant="dark" />
            </div>
          </div>
          <div className="text-[11.5px] leading-5 text-ink-300">
            <p>© 2026 مؤسسة رواء لتقنيات المياه. جميع الحقوق محفوظة.</p>
            <p className="mt-1">سجل تجاري 1010XXXXXX · الرقم الضريبي 3000XXXXXXXXXX · الرياض، المملكة العربية السعودية</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

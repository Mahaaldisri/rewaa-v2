import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { formatNumber } from "@/lib/format";
import { payments } from "@/services/payments";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoBadge } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

interface TrustItem {
  icon: IconName;
  title: string;
  body: string;
  href?: string;
}

/** Confidence builders shown right before the purchase decision. */
export function TrustStrip({ product, className }: { product: Product; className?: string }) {
  const items: TrustItem[] = [
    {
      icon: "rotate",
      title: `إرجاع مجاني خلال ${product.returns.days} يومًا`,
      body: product.returns.summary,
      href: "#tab-returns",
    },
    {
      icon: "shield",
      title: `ضمان ${product.warranty.months} شهرًا`,
      body: `${product.warranty.provider} — استبدال فوري عند وجود عيب صناعة.`,
      href: "#tab-warranty",
    },
    {
      icon: "badgeCheck",
      title: "قطع بضمان معلن",
      body: "لكل وحدة رقم تسلسلي، وتفاصيل الضمان منشورة على صفحة المنتج.",
    },
    {
      icon: "lock",
      title: "دفع عبر بوابة",
      body: payments.current().live
        ? "تُدخل بيانات البطاقة في حقول البوابة، ولا تُخزَّن لدى المتجر."
        : "لا توجد بوابة دفع متصلة في هذه البيئة — يمكنك الدفع عند الاستلام أو بالتحويل.",
    },
    {
      icon: "headset",
      title: "دعم فني وتركيب",
      body: "فرق رواء الفنية تصل إلى المدن المخدومة حسب المواعيد المتاحة.",
      href: "/help/contact",
    },
    {
      icon: "bolt",
      title: "ضمان جودة المياه",
      body: "تقرير قياس TDS قبل وبعد التركيب أو تُعاد قيمة الجهاز.",
    },
  ];

  return (
    <section
      className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}
      aria-label="ضمانات الشراء"
    >
      {items.map((item) => {
        const body = (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-700 group-hover:text-white">
              <Icon name={item.icon} size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold leading-5 text-ink-900">{item.title}</span>
              <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-500">{item.body}</span>
            </span>
          </>
        );

        const base =
          "group flex items-start gap-2.5 rounded-lg border border-ink-100 bg-surface p-3 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card";

        return item.href ? (
          <a key={item.title} href={item.href} className={base}>
            {body}
          </a>
        ) : (
          <div key={item.title} className={base}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

/** Seller card — reinforces marketplace trust. */
export function SellerCard({ product }: { product: Product }) {
  const { seller } = product;
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 bg-gradient-to-l from-ink-50/80 to-surface p-3.5"
      aria-label="البائع"
    >
      <div className="flex items-center gap-3">
        <LogoBadge className="size-11" />
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
            {seller.name}
            {seller.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-xs bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
                <Icon name="badgeCheck" size={11} strokeWidth={2.2} />
                بائع موثّق
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-500">
            {seller.rating} ★ · {formatNumber(seller.ordersFulfilled)} طلب مُنفَّذ · يرد {seller.responseTime}
          </p>
        </div>
      </div>
      {/* No public seller page exists yet, so the CTA points at a real route:
          the catalogue search filtered by this seller's name. */}
      <Link
        to={`/search?q=${encodeURIComponent(seller.name)}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
      >
        منتجات البائع
        <Icon name="chevronLeft" size={13} />
      </Link>
    </section>
  );
}

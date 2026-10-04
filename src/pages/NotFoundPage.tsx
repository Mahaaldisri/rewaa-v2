import { useLocation, Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { topLevelCategories } from "@/data/catalog/categories";
import { bestSellers } from "@/data/catalog";
import { ProductRail } from "@/components/product/ProductCard";
import { summariesToRelated } from "@/lib/product-view";
import { usePageSeo } from "@/lib/seo";
import { whatsappLink } from "@/config/site";

const QUICK_LINKS = [
  { label: "الرئيسية", href: "/", icon: "home" as const },
  { label: "تتبّع طلبك", href: "/help/track", icon: "truck" as const },
  { label: "حجز فني", href: "/services/book", icon: "calendar" as const },
  { label: "الأسئلة الشائعة", href: "/faq", icon: "info" as const },
];

/** 404 — surfaces the requested path, real categories and a search box. */
export function NotFoundPage() {
  const location = useLocation();

  usePageSeo({
    title: "الصفحة غير موجودة | رواء",
    description: "الرابط الذي تبحث عنه غير متوفر. تصفّح الأقسام أو ابحث عن المنتج الذي تحتاجه.",
    robots: "noindex, follow",
  });

  return (
    <div className="pb-16">
      <div className="container-x py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Icon name="search" size={30} />
          </span>
          <p className="mt-5 font-display text-[13px] font-bold tracking-[0.2em] text-aqua-600">خطأ 404</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-ink-950">
            الصفحة التي تبحث عنها غير موجودة
          </h1>
          <p className="mt-3 text-[13.5px] leading-7 text-ink-600">
            قد يكون الرابط قديمًا أو تم نقل الصفحة. لا مشكلة — ابحث عن المنتج، أو تصفّح الأقسام أدناه.
          </p>

          <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-ink-150 bg-paper px-3.5 py-2 text-[12px] text-ink-500">
            <Icon name="info" size={14} className="shrink-0 text-ink-400" />
            <span className="truncate font-mono" dir="ltr">
              {location.pathname}
            </span>
          </p>

          <form
            role="search"
            action="/search"
            className="mx-auto mt-6 flex max-w-lg items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const query = String(data.get("q") ?? "").trim();
              window.location.href = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
            }}
          >
            <div className="relative flex-1">
              <Icon name="search" size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                name="q"
                aria-label="ابحث في المتجر"
                placeholder="ابحث بالمنتج أو رقم الموديل"
                className="h-11 w-full rounded-lg border border-ink-200 bg-surface ps-10 pe-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
            >
              ابحث
            </button>
          </form>

          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700 transition hover:border-brand-200 hover:bg-ink-50"
                >
                  <Icon name={link.icon} size={15} className="text-brand-600" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={whatsappLink(`وصلت لرابط غير موجود: ${location.pathname}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-flow-200 bg-flow-50 px-4 text-[12.5px] font-bold text-flow-700"
          >
            <Icon name="whatsapp" size={15} />
            أبلغنا عن الرابط المعطوب
          </a>
        </div>

        {/* Categories */}
        <section className="mt-12">
          <h2 className="font-display text-[17px] font-extrabold text-ink-950">تصفّح الأقسام</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {topLevelCategories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/c/${category.slug}`}
                  className="group flex h-full items-center gap-3 rounded-xl border border-ink-100 bg-surface p-3.5 transition hover:border-brand-200 hover:shadow-hair"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 transition group-hover:bg-brand-50 group-hover:text-brand-700">
                    <Icon name={category.icon} size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[13px] font-bold text-ink-950">{category.name}</span>
                    <span className="block text-[11px] text-ink-500">{category.productCount ?? 0} منتج</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="container-x">
        <ProductRail id="404-best-sellers" eyebrow="الأكثر مبيعًا" title="قد يفيدك أحد هذه المنتجات" items={summariesToRelated(bestSellers(6))} />
      </section>
    </div>
  );
}

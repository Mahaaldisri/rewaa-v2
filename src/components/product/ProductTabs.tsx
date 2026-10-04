import { useMemo, useState } from "react";
import type { DescriptionBlock, Product } from "@/types/product";
import { formatMoney } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Disclosure } from "@/components/ui/primitives";
import { useMediaQuery } from "@/hooks/useUi";
import { cn } from "@/utils/cn";

interface TabDef {
  id: string;
  label: string;
  icon: IconName;
}

const TABS: TabDef[] = [
  { id: "description", label: "وصف المنتج", icon: "info" },
  { id: "specs", label: "المواصفات", icon: "grid" },
  { id: "features", label: "المميزات", icon: "sparkles" },
  { id: "shipping", label: "الشحن", icon: "truck" },
  { id: "returns", label: "الإرجاع والاستبدال", icon: "rotate" },
  { id: "warranty", label: "الضمان", icon: "shield" },
];

/* --------------------------- Panel contents --------------------------- */

function DescriptionPanel({ blocks }: { blocks: DescriptionBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-ink-50 px-3 py-2.5 text-[13px] text-ink-500">
        <Icon name="info" size={15} className="text-info" />
        لم يضف البائع وصفًا تفصيليًا لهذا المنتج بعد.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <section key={block.id}>
          <h4 className="mb-2 flex items-center gap-2 font-display text-[14.5px] font-bold text-ink-900">
            <span className="h-4 w-[3px] rounded-full bg-aqua-400" />
            {block.title}
          </h4>
          {block.body && (
            <div className="space-y-2.5">
              {block.body.map((paragraph, i) => (
                <p key={i} className="text-[13.5px] leading-7 text-ink-600 text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {block.bullets && (
            <ul
              className={cn(
                "grid gap-2 sm:grid-cols-2",
                block.tone === "warning" && "rounded-md bg-warning-soft/50 p-3 ring-1 ring-inset ring-warning/15"
              )}
            >
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-[13px] leading-6 text-ink-600">
                  <Icon
                    name={block.tone === "warning" ? "alert" : "check"}
                    size={14}
                    strokeWidth={2.2}
                    className={cn("mt-1 shrink-0", block.tone === "warning" ? "text-warning" : "text-brand-500")}
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function SpecsPanel({ product }: { product: Product }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = product.specifications.filter(
      (row) =>
        !query.trim() ||
        row.label.includes(query.trim()) ||
        row.value.includes(query.trim())
    );
    const map = new Map<string, typeof filtered>();
    filtered.forEach((row) => {
      const key = row.group ?? "عام";
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return Array.from(map.entries());
  }, [product.specifications, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-500">
          {product.specifications.length} بندًا فنيًا · البيانات معتمدة من {product.seller.name}
        </p>
        <div className="relative">
          <Icon name="search" size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المواصفات…"
            aria-label="بحث في المواصفات"
            className="h-9 w-[210px] rounded-md border border-ink-200 bg-surface pe-3 ps-9 text-[12.5px] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md bg-ink-50 px-3 py-6 text-center text-[13px] text-ink-500">
          لا توجد مواصفات مطابقة لبحثك.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([group, rows]) => (
            <section key={group}>
              <h4 className="mb-2 font-display text-[12.5px] font-bold tracking-wide text-aqua-700">{group}</h4>
              <dl className="overflow-hidden rounded-lg border border-ink-100">
                {rows.map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      "grid grid-cols-[minmax(110px,38%)_1fr] gap-3 px-3.5 py-2.5 text-[13px] transition-colors hover:bg-brand-50/40",
                      i % 2 === 0 ? "bg-surface" : "bg-ink-50/40"
                    )}
                  >
                    <dt className="font-medium text-ink-500">{row.label}</dt>
                    <dd className="font-semibold text-ink-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturesPanel({ product }: { product: Product }) {
  const highlights = product.description.find((b) => b.id === "why")?.bullets ?? [];
  const stages = product.description.find((b) => b.id === "stages")?.bullets ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-4">
        <h4 className="mb-3 flex items-center gap-2 font-display text-[14px] font-bold text-brand-900">
          <Icon name="sparkles" size={16} className="text-aqua-500" />
          أبرز المميزات
        </h4>
        <ul className="space-y-2.5">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[13px] leading-6 text-ink-700">
              <Icon name="check" size={14} strokeWidth={2.4} className="mt-1 shrink-0 text-brand-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-3 flex items-center gap-2 font-display text-[14px] font-bold text-ink-900">
          <Icon name="droplet" size={16} className="text-aqua-500" />
          مسار المياه داخل النظام
        </h4>
        <ol className="space-y-2.5">
          {stages.map((note, i) => (
            <li key={note} className="flex items-start gap-3 rounded-md border border-ink-100 bg-surface p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-950 font-display text-[12px] font-bold text-aqua-300">
                {i + 1}
              </span>
              <span className="text-[13px] leading-6 text-ink-700">{note}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <a
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="rounded-md bg-ink-50 px-2.5 py-1 text-[11.5px] font-medium text-ink-600 ring-1 ring-inset ring-ink-100 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200"
            >
              #{tag}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShippingPanelTab({ product }: { product: Product }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <h4 className="mb-3 font-display text-[14px] font-bold text-ink-900">مدد التوصيل والتركيب حسب المدينة</h4>
        <div className="overflow-hidden rounded-lg border border-ink-100">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-ink-950 px-3.5 py-2 text-[11.5px] font-bold text-aqua-200">
            <span>المدينة</span>
            <span>قياسي</span>
            <span>سريع</span>
          </div>
          {product.shipping.cities.slice(0, 8).map((city, i) => (
            <div
              key={city.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] gap-3 px-3.5 py-2 text-[12.5px]",
                i % 2 === 0 ? "bg-surface" : "bg-ink-50/40"
              )}
            >
              <span className="font-medium text-ink-800">
                {city.name}
                <span className="ms-1.5 text-[11px] text-ink-400">{city.region}</span>
              </span>
              <span className="tabular-nums text-ink-600">{city.standardEta[0]}–{city.standardEta[1]} يوم</span>
              <span className="tabular-nums text-ink-600">{city.expressEta[0]}–{city.expressEta[1]} يوم</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-ink-500">{product.shipping.note}</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-3.5">
          <h4 className="mb-1.5 flex items-center gap-2 font-display text-[13.5px] font-bold text-brand-900">
            <Icon name="truck" size={15} />
            رسوم الشحن
          </h4>
          <ul className="space-y-1.5 text-[12.5px] text-ink-700">
            <li className="flex justify-between">
              <span>شحن قياسي</span>
              <span className="font-semibold">{formatMoney(product.shipping.flatRate)}</span>
            </li>
            <li className="flex justify-between">
              <span>شحن سريع</span>
              <span className="font-semibold">{formatMoney(product.shipping.expressRate)}</span>
            </li>
            <li className="flex justify-between">
              <span>الاستلام من المعرض</span>
              <span className="font-semibold text-success">مجاني</span>
            </li>
            <li className="flex justify-between border-t border-brand-200/60 pt-1.5 font-bold text-brand-900">
              <span>شحن مجاني للطلبات فوق</span>
              <span>{formatMoney(product.shipping.freeShippingThreshold)}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-ink-100 p-3.5">
          <h4 className="mb-2 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink-900">
            <Icon name="store" size={15} className="text-aqua-600" />
            الاستلام من المعرض
          </h4>
          <ul className="space-y-2">
            {product.shipping.branches.map((branch) => (
              <li key={branch.id} className="text-[12.5px] leading-5 text-ink-600">
                <span className="font-semibold text-ink-900">{branch.name}</span> — {branch.address}
                <span className="mt-0.5 block text-[11px] text-ink-400">{branch.hours}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReturnsPanel({ product }: { product: Product }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex items-start gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-brand-700 shadow-hair">
          <Icon name="rotate" size={20} />
        </span>
        <div>
          <p className="font-display text-[26px] font-extrabold leading-none text-ink-950">
            {product.returns.days} <span className="text-[14px] text-ink-500">يومًا</span>
          </p>
          <p className="mt-1.5 text-[12.5px] leading-5 text-ink-600">{product.returns.summary}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {product.returns.conditions.map((condition) => (
          <li key={condition} className="flex items-start gap-2 text-[13px] leading-6 text-ink-600">
            <Icon name="check" size={14} strokeWidth={2.4} className="mt-1 shrink-0 text-success" />
            {condition}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WarrantyPanel({ product }: { product: Product }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-aqua-200/70 bg-aqua-50/50 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-lg bg-ink-950 text-aqua-300">
            <Icon name="shield" size={19} />
          </span>
          <div>
            <p className="font-display text-[22px] font-extrabold leading-none text-ink-950">
              {product.warranty.months} شهرًا
            </p>
            <p className="mt-1 text-[11.5px] text-ink-500">{product.warranty.provider}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-ink-700">{product.warranty.summary}</p>
      </div>
      <div className="rounded-lg border border-ink-100 p-4">
        <h4 className="mb-2.5 font-display text-[13.5px] font-bold text-ink-900">ماذا يغطّي الضمان؟</h4>
        <ul className="space-y-2 text-[12.5px] leading-5 text-ink-600">
          <li className="flex gap-2">
            <Icon name="check" size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-success" />
            عيوب الصناعة في الهيكل والمضخة والمحوّل والخزان
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-success" />
            التسريب الناتج عن وصلات أو محابس المصنع
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-success" />
            عمالة الإصلاح مجانية طوال فترة الضمان في المدن المخدومة
          </li>
          <li className="flex gap-2">
            <Icon name="close" size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-danger" />
            لا يغطي الشمعات والممبرين (مواد استهلاكية) ولا التركيب غير المعتمد
          </li>
        </ul>
        <a
          href="/help/warranty-claim"
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-900"
        >
          قدّم طلب ضمان أو بلاغ صيانة
          <Icon name="chevronLeft" size={13} />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------ Container ------------------------------ */

function PanelBody({ id, product }: { id: string; product: Product }) {
  switch (id) {
    case "description":
      return <DescriptionPanel blocks={product.description} />;
    case "specs":
      return <SpecsPanel product={product} />;
    case "features":
      return <FeaturesPanel product={product} />;
    case "shipping":
      return <ShippingPanelTab product={product} />;
    case "returns":
      return <ReturnsPanel product={product} />;
    case "warranty":
      return <WarrantyPanel product={product} />;
    default:
      return null;
  }
}

export function ProductTabs({ product, reviewCount }: { product: Product; reviewCount: number }) {
  const [active, setActive] = useState(TABS[0].id);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <section id="details" className="scroll-mt-24">
      {isDesktop ? (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-card">
          <div
            role="tablist"
            aria-label="تفاصيل المنتج"
            className="flex items-center gap-1 overflow-x-auto border-b border-ink-100 bg-paper/60 px-2 no-scrollbar"
          >
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3.5 py-3.5 text-[13px] font-semibold transition-colors",
                    isActive ? "text-brand-800" : "text-ink-500 hover:text-ink-800"
                  )}
                >
                  <Icon name={tab.icon} size={15} className={isActive ? "text-aqua-500" : "text-ink-400"} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-t-full bg-brand-700" />
                  )}
                </button>
              );
            })}
            <a
              href="#reviews"
              className="ms-auto flex shrink-0 items-center gap-1.5 px-3.5 py-3.5 text-[13px] font-semibold text-ink-500 transition hover:text-brand-800"
            >
              <Icon name="star" size={15} className="text-aqua-500" />
              التقييمات
              <span className="rounded-xs bg-ink-100 px-1.5 py-0.5 text-[10.5px] tabular-nums text-ink-600">
                {reviewCount}
              </span>
            </a>
          </div>

          <div
            role="tabpanel"
            id={`panel-${active}`}
            aria-labelledby={`tab-${active}`}
            className="p-5 animate-fade sm:p-6"
          >
            <PanelBody id={active} product={product} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-card">
          <div className="px-4">
            {TABS.map((tab) => (
              <Disclosure
                key={tab.id}
                id={tab.id}
                title={tab.label}
                icon={tab.icon}
                defaultOpen={tab.id === "description"}
              >
                <PanelBody id={tab.id} product={product} />
              </Disclosure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { compatibilityApi } from "@/services/compatibilityApi";
import { useStore } from "@/store/StoreProvider";
import { cn } from "@/utils/cn";
import type { CompatibilityResult } from "@/lib/compatibility";

/**
 * Compatibility checker — search a cartridge or spare part by device name,
 * model number or SKU and see only the parts the catalogue declares compatible,
 * with the reason for every match.
 */
export function CompatibilityChecker({ className }: { className?: string }) {
  const { addToCart, pushToast } = useStore();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void compatibilityApi.models().then((list) => {
      if (!cancelled) setModels(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      pushToast({ tone: "warning", title: "اكتب اسم الجهاز أو رقم الموديل" });
      return;
    }
    setLoading(true);
    try {
      setResult(await compatibilityApi.search(trimmed));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(query);
  };

  const suggestions = useMemo(() => models.slice(0, 8), [models]);

  const addPart = async (slug: string) => {
    setAdding(slug);
    try {
      const { productApi } = await import("@/services/api");
      const product = await productApi.getBySlug(slug);
      const variant = product.variants[0];
      if (!variant) return;
      const ok = await addToCart({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        name: product.name,
        selectionLabel: variant.sku,
        unitPrice: variant.price,
        quantity: 1,
        image: product.images[0]?.thumb,
      });
      if (ok) pushToast({ tone: "success", title: "تمت إضافة القطعة إلى السلة" });
    } finally {
      setAdding(null);
    }
  };

  return (
    <section className={cn("rounded-xl border border-ink-100 bg-surface p-4 shadow-hair sm:p-5", className)} aria-labelledby="compat-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="compat-title" className="flex items-center gap-2 font-display text-[16px] font-extrabold text-ink-950">
            <span className="grid size-7 place-items-center rounded-md bg-brand-50 text-brand-700">
              <Icon name="settings" size={15} />
            </span>
            فاحص التوافق
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-6 text-ink-600">
            اكتب اسم الجهاز أو رقم الموديل أو رقم القطعة، وسنعرض فقط القطع التي تذكر بيانات الكتالوج أنها متوافقة — مع سبب
            كل تطابق. لا نعرض توافقًا غير موجود في بيانات المنتجات.
          </p>
        </div>
        <Badge tone="neutral" icon="package">
          مبني على بيانات الكتالوج
        </Badge>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label className="flex-1">
          <span className="sr-only">اسم الجهاز أو رقم الموديل</span>
          <div className="flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
            <Icon name="search" size={16} className="text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder=" مثال: RWA-RO5 أو شمعة كربون 10 إنش"
              className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-ink-300"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث" className="text-ink-400 hover:text-ink-700">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
        >
          {loading ? "جارٍ الفحص…" : "افحص التوافق"}
        </button>
      </form>

      {suggestions.length > 0 && !result && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-400">موديلات في الكتالوج:</span>
          {suggestions.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => {
                setQuery(model);
                void run(model);
              }}
              className="rounded-full border border-ink-200 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
              dir="ltr"
            >
              {model}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {result && !loading && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-ink-100 bg-paper p-3.5 text-[12.5px] leading-6 text-ink-700">
            {result.device ? (
              <>
                الجهاز المطابق: <strong className="font-bold text-ink-950">{result.device.name}</strong>{" "}
                <span className="font-mono text-[11px] text-ink-500" dir="ltr">
                  {result.device.sku}
                </span>{" "}
                —{" "}
                <Link to={`/p/${result.device.slug}`} className="font-bold text-brand-700 underline decoration-dotted">
                  صفحة الجهاز
                </Link>
              </>
            ) : (
              <>نتائج البحث عن «{result.query}»</>
            )}
          </div>

          {result.parts.length === 0 ? (
            <div className="rounded-lg border border-warning/25 bg-warning-soft p-3.5 text-[12.5px] leading-6 text-ink-800">
              {result.note ??
                "لا توجد قطع متوافقة مسجّلة لهذا المدخل. أرسل لنا رقم الموديل أو صورة لوحة الجهاز وسيتحقق الفريق الفني."}
              {result.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.suggestions.slice(0, 6).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        setQuery(model);
                        void run(model);
                      }}
                      className="rounded-full border border-ink-200 bg-surface px-2.5 py-1 font-mono text-[11px] text-ink-600"
                      dir="ltr"
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {result.parts.map((part, index) => (
                <li
                  key={part.summary.slug}
                  className="rounded-lg border border-ink-100 bg-surface p-3.5 transition hover:border-brand-200"
                >
                  <div className="flex gap-3">
                    <Link to={`/p/${part.summary.slug}`} className="shrink-0" tabIndex={-1}>
                      <img
                        src={part.summary.image}
                        alt=""
                        loading="lazy"
                        className="size-16 rounded-lg border border-ink-100 bg-paper object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/p/${part.summary.slug}`}
                          className="font-display text-[13.5px] font-bold text-ink-900 hover:text-brand-700"
                        >
                          {part.summary.name}
                        </Link>
                        {index === 0 && <Badge tone="success" icon="check">الأقرب للتوافق</Badge>}
                        {part.alternative && index > 0 && <Badge tone="info" icon="refresh">بديل متوافق</Badge>}
                        {!part.summary.inStock && <Badge tone="neutral" icon="clock">حسب الطلب</Badge>}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-400" dir="ltr">
                        {part.summary.sku}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {part.reasons.map((reason) => (
                          <li key={reason.kind + reason.label} className="flex items-start gap-1.5 text-[11.5px] leading-5 text-ink-600">
                            <Icon name="checkCircle" size={12} className="mt-0.5 shrink-0 text-flow-600" />
                            {reason.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                      <span className="font-display text-[14px] font-extrabold tabular-nums text-ink-950">
                        {formatMoney(part.summary.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void addPart(part.summary.slug)}
                        disabled={adding === part.summary.slug || !part.summary.inStock}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 text-[11.5px] font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
                      >
                        <Icon name="cart" size={13} />
                        {adding === part.summary.slug ? "…" : "أضف للسلة"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] leading-5 text-ink-400">
            التوافق مبني على ما تعلنه بيانات المنتج (موديلات التوافق، النوع، المقاس). إن اختلفت قطعتك عن الأرقام أعلاه،
            أرسل صورة لوحة الجهاز للتأكد قبل الشراء.
          </p>
        </div>
      )}
    </section>
  );
}

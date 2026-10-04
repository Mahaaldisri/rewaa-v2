import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { CompatibilityChecker } from "@/components/services/CompatibilityChecker";
import { ServiceAvailabilityPanel } from "@/components/services/ServiceAvailabilityPanel";
import { usePageSeo, breadcrumbSchema } from "@/lib/seo";
import { knownModels } from "@/lib/compatibility";

/**
 * Public compatibility checker: `/compatibility`.
 * Everything shown comes from the catalogue through `compatibilityApi`.
 */
export function CompatibilityPage() {
  usePageSeo({
    title: "فاحص توافق الشمعات وقطع الغيار | رواء",
    description:
      "ابحث باسم الجهاز أو رقم الموديل لتعرف الشمعات والقطع المتوافقة معه، مع سبب التوافق وبدائل متوافقة وأسعار القطع من كتالوج رواء.",
    canonical: "/compatibility",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "فاحص التوافق", href: "/compatibility" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "فاحص توافق القطع — رواء",
        applicationCategory: "ShoppingApplication",
        operatingSystem: "Web",
        inLanguage: "ar-SA",
        offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
      },
    ],
  });

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "فاحص التوافق", href: "/compatibility" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="mx-auto max-w-4xl">
          <Badge tone="aqua" icon="settings">
            أداة مجانية
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-950">
            هل هذه القطعة متوافقة مع جهازك؟
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13.5px] leading-7 text-ink-600">
            اكتب اسم الجهاز أو رقم الموديل أو رقم القطعة (SKU)، وسنعرض فقط القطع التي تُعلن بيانات المنتج توافقها معها، مع
            سبب كل تطابق وبديل متوافق عند توفره. لا نعرض أي توافق غير موجود في بيانات الكتالوج.
          </p>

          <CompatibilityChecker className="mt-6" />

          <section className="mt-6 rounded-xl border border-ink-100 bg-paper p-5">
            <h2 className="font-display text-[15px] font-extrabold text-ink-950">كيف يعمل الفاحص؟</h2>
            <ol className="mt-3 space-y-2.5">
              {[
                "نقرأ من بيانات كل قطعة قائمة الموديلات التي تُعلن الشركة توافقها معها، إضافة إلى نوع القطعة ومقاسها.",
                "نطابق ما تكتبه مع أسماء الأجهزة والأرقام (SKU) والموديلات المسجّلة في الكتالوج فقط.",
                "نرتّب النتائج بحسب قوة التطابق: تطابق الموديل أولًا، ثم النوع، ثم المقاس — مع ذكر السبب لكل نتيجة.",
                "إذا لم يظهر تطابق صريح، نعرض أقرب عائلة قطع ونوضّح أن التوافق غير مؤكد بدلًا من تخمينه.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-[12.5px] leading-6 text-ink-700">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6 rounded-xl border border-ink-100 bg-surface p-5">
            <h2 className="font-display text-[15px] font-extrabold text-ink-950">موديلات مسجّلة في الكتالوج</h2>
            <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">
              هذه الأرقام مأخوذة مباشرة من بيانات المنتجات، وتتحدّث تلقائيًا عند إضافة قطعة جديدة.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {knownModels.slice(0, 24).map((model) => (
                <span
                  key={model}
                  dir="ltr"
                  className="rounded-full border border-ink-200 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink-600"
                >
                  {model}
                </span>
              ))}
            </div>
          </section>

          <ServiceAvailabilityPanel className="mt-6" context="parts" />

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/c/cartridges"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
            >
              <Icon name="package" size={16} />
              تصفّح كل الشمعات والقطع
            </Link>
            <Link
              to="/help/contact"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
            >
              <Icon name="message" size={16} />
              أرسل صورة لوحة الجهاز للفريق
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

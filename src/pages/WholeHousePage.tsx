import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ProductGridSkeleton } from "@/components/common/States";
import { catalogApi } from "@/services/catalogApi";
import { contentApi } from "@/services/contentApi";
import { guides } from "@/data/content/guides";
import { branchCities } from "@/data/content/branches";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, faqSchema, serviceSchema, usePageSeo } from "@/lib/seo";
import { whatsappLink } from "@/config/site";
import { cn } from "@/utils/cn";

const SIZING_ROWS = [
  {
    household: "شقة صغيرة · شخصان",
    bathrooms: "حمام واحد",
    flow: "1.5 – 2 م³/ساعة",
    stage: "فلتر مركزي ميكروني + كربون",
    note: "غالبًا لا تحتاج منقّي عسر مياه كاملًا",
  },
  {
    household: "فيلا · 4 – 6 أفراد",
    bathrooms: "2 – 3 حمامات",
    flow: "2.5 – 3.5 م³/ساعة",
    stage: "فلتر مركزي ثلاثي + منقّي عسر",
    note: "الأكثر شيوعًا في السكن العائلي",
  },
  {
    household: "فيلا كبيرة · 6 أفراد وأكثر",
    bathrooms: "4 حمامات وأكثر",
    flow: "4 – 6 م³/ساعة",
    stage: "فلتر مركزي + منقّي عسر مزدوج",
    note: "يُقاس الاستهلاك وذروة السحب قبل التحديد",
  },
  {
    household: "مبنى سكني أو منشأة",
    bathrooms: "نقاط متعددة",
    flow: "يُحدد بعد القياس",
    stage: "نظام مركزي بمعدات مزدوجة",
    note: "يتطلب دراسة استهلاك وجدول تشغيل",
  },
];

const STAGES = [
  {
    icon: "filter" as const,
    title: "فلتر الشوائب",
    body: "يحجز الرمل والصدأ والرواسب الدقيقة (5 – 20 ميكرون) قبل وصول المياه لبقية المراحل، ويحمي الأجهزة والخلاطات.",
  },
  {
    icon: "droplet" as const,
    title: "كربون نشط",
    body: "يخفض الطعم والرائحة الناتجة عن الكلور والمركبات العضوية، ويرفع جودة المياه المستخدمة في الطبخ والاستحمام.",
  },
  {
    icon: "sparkles" as const,
    title: "منقّي العسر (اختياري)",
    body: "يقلل أملاح الكالسيوم والمغنيسيوم عبر راتنج التبادل الأيوني بعد التأكد من درجة العسر بالقياس، وليس بالتقدير.",
  },
];

const STEPS = [
  { title: "قياس معدل التدفق", body: "نقيس عدد الليترات في الدقيقة من نقطة قريبة من المدخل لتحديد سعة الفلتر المناسبة." },
  { title: "تقدير الذروة اليومية", body: "عدد الأفراد + مرات الاستخدام (استحمام، غسيل، مطبخ) لتقدير ذروة السحب لا المتوسط فقط." },
  { title: "قراءة العسر و TDS", body: "قراءتان تحددان إن كان منقّي العسر لازمًا أم أن الفلترة الميكرونية والكربون كافية." },
  { title: "اختيار السعة والتركيب", body: "اختيار الغلاف والسعة وطريقة التركيب، مع نقطة تجاوز (Bypass) للصيانة دون قطع المياه." },
];

/** Whole-house landing — `/whole-house`. Substantive sizing guidance + inspection CTA. */
export function WholeHousePage() {
  const products = useAsync(() => catalogApi.listProducts({ pageSize: 4 }, "whole-house"), []);
  const faqs = useAsync(() => contentApi.listFaqs(), []);
  const [openRow, setOpenRow] = useState<number | null>(1);

  const waterFaqs = (faqs.data ?? []).filter((faq) => faq.group === "water-quality").slice(0, 6);

  usePageSeo({
    title: "فلترة المياه للمنزل بالكامل | رواء",
    description:
      "دليل عملي لاختيار نظام فلترة مركزية: مراحل الفلترة، جدول السعات حسب عدد الأفراد والحمامات، وخطوات القياس قبل التركيب.",
    canonical: "/whole-house",
    image: "/images/hero-technician.jpg",
    jsonLd: [
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "فلترة المنزل بالكامل", href: "/whole-house" },
      ]),
      serviceSchema({
        name: "تركيب فلترة مياه مركزية للمنزل",
        summary: "قياس معدل التدفق والعسر ثم تحديد النظام المركزي وتركيبه مع نقطة تجاوز للصيانة.",
        slug: "whole-house",
      }),
      ...(waterFaqs.length > 0
        ? [faqSchema(waterFaqs.map((faq) => ({ question: faq.question, answer: faq.answer })))]
        : []),
    ],
  });

  const guide = guides.find((item) => item.slug === "whole-house-vs-under-sink-filter") ?? guides[0];

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "فلترة المنزل بالكامل", href: "/whole-house" },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="bg-ink-950 text-white">
        <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <Badge tone="aqua" solid icon="home">
              مياه المنزل كلها
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-[36px]">
              فلترة مركزية تحمي المنزل من نقطة الدخول
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-8 text-ink-200">
              الفكرة بسيطة: تعالج المياه مرة واحدة عند مدخل المنزل، فتصل أنقى إلى كل نقطة — الحمام والمطبخ والغسالة.
              القرار الصحيح يبدأ بقياس معدل التدفق ودرجة عسر المياه، لا باختيار أكبر جهاز.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/services/book?type=water-test"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-aqua-400 px-6 text-[13.5px] font-bold text-ink-950 transition hover:bg-aqua-300"
              >
                <Icon name="search" size={17} />
                احجز زيارة قياس
              </Link>
              <a
                href={whatsappLink("أرغب بفلترة مياه المنزل بالكامل. عدد الأفراد:")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-6 text-[13.5px] font-bold text-white transition hover:bg-white/10"
              >
                <Icon name="whatsapp" size={17} />
                استشارة سريعة
              </a>
            </div>
            <p className="mt-4 text-[12px] text-ink-300">
              الخدمة متوفرة في {branchCities.length} مدن مخدومة، وخارجها بترتيب مسبق حسب توفر الفريق.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: "filter" as const, title: "حماية الأجهزة", body: "تقليل الرواسب يطيل عمر السخانات والغسالات والخلاطات." },
              { icon: "droplet" as const, title: "طعم ورائحة أفضل", body: "مرحلة الكربون تخفض أثر الكلور والمركبات العضوية." },
              { icon: "gauge" as const, title: "قرار بالقياس", body: "سعة النظام تُحدد من معدل التدفق لا من التخمين." },
            ].map((item) => (
              <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Icon name={item.icon} size={19} className="text-aqua-300" />
                <h2 className="mt-2.5 font-display text-[13.5px] font-bold">{item.title}</h2>
                <p className="mt-1 text-[12px] leading-6 text-ink-300">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stages */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow="مراحل النظام"
          title="من رواسب الشارع إلى مياه منزلك"
          description="الأنظمة المركّبة تُبنى عادة من مرحلتين أساسيتين، وتُضاف مرحلة ثالثة حسب نتيجة قياس العسر."
        />
        <ol className="grid gap-3 sm:grid-cols-3">
          {STAGES.map((stage, index) => (
            <li key={stage.title} className="rounded-xl border border-ink-100 bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-aqua-50 text-aqua-700">
                  <Icon name={stage.icon} size={19} />
                </span>
                <span className="font-display text-[22px] font-extrabold text-ink-100">{index + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-[14px] font-bold text-ink-950">{stage.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-6 text-ink-600">{stage.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Sizing table */}
      <section className="border-y border-ink-100 bg-paper py-10">
        <div className="container-x">
          <SectionHeading
            eyebrow="دليل السعات"
            title="أي حجم يناسب منزلك؟"
            description="الجدول إرشادي لتقريب الفكرة — القرار النهائي يعتمد على قياس معدل التدفق وذروة السحب في المنزل."
          />

          <div className="overflow-hidden rounded-xl border border-ink-150 bg-surface">
            <table className="w-full text-start text-[12.5px]">
              <caption className="sr-only">جدول إرشادي لسعات فلترة المياه المركزية</caption>
              <thead>
                <tr className="bg-ink-950 text-white">
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    حجم الأسرة
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-start font-bold sm:table-cell">
                    عدد الحمامات
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    التدفق الموصى به
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-start font-bold md:table-cell">
                    التكوين المقترح
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {SIZING_ROWS.map((row, index) => (
                  <tr
                    key={row.household}
                    className={cn("cursor-pointer align-top transition", openRow === index ? "bg-aqua-50/50" : "hover:bg-ink-50")}
                    onClick={() => setOpenRow(openRow === index ? null : index)}
                  >
                    <th scope="row" className="px-4 py-3.5 text-start font-bold text-ink-900">
                      {row.household}
                      <span className="mt-1 block text-[11px] font-normal text-ink-500 md:hidden">{row.stage}</span>
                      {openRow === index && <span className="mt-1.5 block text-[11.5px] font-normal text-aqua-700">{row.note}</span>}
                    </th>
                    <td className="hidden px-4 py-3.5 text-ink-600 sm:table-cell">{row.bathrooms}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-ink-800">{row.flow}</td>
                    <td className="hidden px-4 py-3.5 text-ink-600 md:table-cell">
                      {row.stage}
                      {openRow === index && <span className="mt-1.5 block text-[11.5px] text-aqua-700">{row.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-5 text-ink-500">
            <Icon name="info" size={13} className="mt-0.5 shrink-0" />
            اضغط على أي صف لعرض ملاحظة التنفيذ. لا نعتمد على أرقام تسويقية — الأرقام أعلاه أدلة إرشادية للاختيار.
          </p>
        </div>
      </section>

      {/* Measurement steps */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow="قبل التركيب"
          title="أربع خطوات قياس نقوم بها في الزيارة"
          description="الزيارة تشخيصية أولًا: نخرج بورقة فيها معدل التدفق وقراءة العسر و TDS، ثم نقترح النظام المناسب."
        />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-ink-100 bg-surface p-4">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-700 font-display text-[13px] font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 font-display text-[13.5px] font-bold text-ink-950">{step.title}</h3>
              <p className="mt-1.5 text-[12px] leading-6 text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4 rounded-xl border border-flow-200 bg-flow-50/60 p-5 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h3 className="font-display text-[16px] font-extrabold text-ink-950">فحص مياه المنزل قبل أي قرار</h3>
            <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
              الزيارة تشمل قياس TDS والعسر ودرجة الحموضة وضغط الشبكة، مع تقرير مكتوب بالقراءات والتوصية. تُخصم قيمة
              الفحص من تكلفة التركيب إذا أتممت المشروع معنا.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            <Link
              to="/services/book?type=water-test"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-5 text-[13px] font-bold text-white transition hover:bg-flow-700"
            >
              <Icon name="calendar" size={16} />
              احجز فحص مياه
            </Link>
            <Link
              to="/services/water-test"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
            >
              تفاصيل الخدمة
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="container-x pb-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-ink-100 bg-surface p-5">
            <h2 className="font-display text-[15px] font-extrabold text-ink-950">فلترة مركزية للمنزل</h2>
            <ul className="mt-3 space-y-2">
              {[
                "تعالج كل نقاط المياه: الحمام، المطبخ، الغسالة",
                "تقلل الرواسب وأثر الكلور على مستوى المنزل",
                "تحتاج مساحة عند المدخل ونقطة تصريف",
                "تكلفتها الأولية أعلى، وتخدم كل أفراد المنزل",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                  <Icon name="check" size={13} className="mt-1 shrink-0 text-flow-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/c/whole-house" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white">
              تصفّح أنظمة المنزل الكامل
            </Link>
          </article>

          <article className="rounded-xl border border-ink-100 bg-surface p-5">
            <h2 className="font-display text-[15px] font-extrabold text-ink-950">جهاز تحت المغسلة</h2>
            <ul className="mt-3 space-y-2">
              {[
                "يخدم نقطة شرب واحدة (أو نقطتين بصنبور إضافي)",
                "مناسب لمياه الشرب والطبخ فقط",
                "تركيبه أسرع ومساحته أصغر",
                "يمكن جمعه مع فلترة مركزية للحصول على الاثنين",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-600">
                  <Icon name="check" size={13} className="mt-1 shrink-0 text-aqua-600" />
                  {item}
                </li>
              ))}
            </ul>
            {guide && (
              <Link
                to={`/guides/${guide.slug}`}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50"
              >
                اقرأ المقارنة الكاملة
                <Icon name="arrowLeft" size={14} />
              </Link>
            )}
          </article>
        </div>
      </section>

      {/* Products */}
      <section className="container-x pb-10">
        <SectionHeading
          eyebrow="من المتجر"
          title="أنظمة وقطع المنزل بالكامل"
          description="الأسعار والمواصفات على كل منتج، ويمكن إضافة التركيب أو باقة الصيانة من صفحة المنتج."
          action={{ label: "كل منتجات القسم", href: "/c/whole-house" }}
        />
        {products.loading && !products.data ? (
          <ProductGridSkeleton count={4} />
        ) : (
          products.data && <ProductGrid items={products.data.items} />
        )}
      </section>

      {/* FAQs */}
      {waterFaqs.length > 0 && (
        <section className="container-x pb-10">
          <SectionHeading eyebrow="أسئلة متكررة" title="أسئلة عن جودة مياه المنزل" />
          <Accordion
            allowMultiple={false}
            items={waterFaqs.map((faq) => ({ id: faq.id, title: faq.question, content: <p>{faq.answer}</p> }))}
          />
          <Link to="/faq" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-700 hover:underline">
            كل الأسئلة الشائعة
            <Icon name="arrowLeft" size={13} />
          </Link>
        </section>
      )}
    </div>
  );
}

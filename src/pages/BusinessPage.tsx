import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { track } from "@/services/analytics";
import { captureMessage } from "@/services/monitoring";
import { Icon } from "@/components/ui/Icon";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { SelectField, TextArea, TextField } from "@/components/common/FormField";
import { contentApi } from "@/services/contentApi";
import { businessApi } from "@/services/businessApi";
import { cities } from "@/data/catalog/support";
import { guides } from "@/data/content/guides";
import { useAsync } from "@/hooks/useAsync";
import { breadcrumbSchema, organizationSchema, usePageSeo } from "@/lib/seo";
import { useStore } from "@/store/StoreProvider";
import { hasErrors, required } from "@/lib/validation";
import { placeholderNote } from "@/lib/placeholder-note";
import { contact, whatsappLink } from "@/config/site";
import { cn } from "@/utils/cn";
import type { QuoteRequest } from "@/types/service";

const STEPS = ["بيانات المنشأة", "الاحتياج", "مراجعة وإرسال"] as const;

/** B2B landing + RFQ — `/business`. */
export function BusinessPage() {
  const profile = useAsync(() => contentApi.getCommercialProfile(), []);
  const { pushToast } = useStore();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company: "",
    industry: "",
    cityName: "",
    contactPerson: "",
    jobTitle: "",
    phone: "",
    email: "",
    dailyConsumption: "",
    projectType: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<QuoteRequest | null>(null);

  usePageSeo({
    title: "حلول المياه للمنشآت والمشاريع | رواء للأعمال",
    description:
      "حلول معالجة المياه للمطاعم والمقاهي والفنادق والمصانع والمدارس: دراسة احتياج، عرض فني، توريد، تركيب وعقود صيانة.",
    canonical: "/business",
    jsonLd: [
      organizationSchema(),
      breadcrumbSchema([
        { label: "الرئيسية", href: "/" },
        { label: "حلول المنشآت", href: "/business" },
      ]),
    ],
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateStep = (current: number) => {
    const next: Record<string, string> = {};
    if (current === 0) {
      const company = required(form.company, "اسم المنشأة");
      if (company) next.company = company;
      if (!form.industry) next.industry = "اختر نشاط المنشأة";
      if (!form.cityName) next.cityName = "اختر المدينة";
      const person = required(form.contactPerson, "اسم مسؤول التواصل");
      if (person) next.contactPerson = person;
      const phone = required(form.phone, "رقم الجوال");
      if (phone) next.phone = phone;
    }
    if (current === 1) {
      if (!form.dailyConsumption) next.dailyConsumption = "اختر الاستهلاك التقديري";
      if (form.notes.trim().length < 10) next.notes = "اكتب وصفًا موجزًا للاحتياج (10 أحرف على الأقل)";
    }
    setErrors(next);
    return !hasErrors(next);
  };

  const submit = async () => {
    if (!validateStep(1)) {
      setStep(form.company && form.industry && form.cityName && form.contactPerson && form.phone ? 1 : 0);
      return;
    }
    setSubmitting(true);
    try {
      const city = cities.find((item) => item.name === form.cityName);
      const created = await businessApi.createQuoteRequest({
        company: form.company,
        industry: form.industry,
        cityId: city?.id ?? "riyadh",
        cityName: form.cityName,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        estimatedConsumption: form.dailyConsumption,
        requiredSolution: form.projectType || "غير محدد",
        notes: form.notes,
      });
      setQuote(created);
      track("business_lead", {
        reference: created.reference,
        industry: form.industry,
        city: form.cityName,
        estimated_consumption: form.dailyConsumption,
      });
      captureMessage("business lead submitted", "info", { reference: created.reference });
      pushToast({ tone: "success", title: "تم إرسال طلب العرض", description: `الرقم المرجعي ${created.reference}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "تعذّر إرسال الطلب",
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "حلول المنشآت", href: "/business" }]} />
        </div>
      </div>

      {/* Hero */}
      <section className="bg-ink-950 text-white">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(760px_300px_at_15%_-20%,rgba(34,169,224,0.25),transparent_70%),radial-gradient(600px_260px_at_90%_10%,rgba(34,181,115,0.18),transparent_70%)]" />
          <div className="container-x relative grid gap-8 py-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <Badge tone="aqua" solid icon="building">
                قسم المشاريع والمنشآت
              </Badge>
              <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-[36px]">
                معالجة مياه بمستوى تشغيلي، لا حلول عشوائية
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-8 text-ink-200">
                نبدأ بزيارة وقياس، ثم عرض فني واضح بالسعات والتكاليف، وبعد التوريد نُسلّم مع تقرير تشغيل. عقود الصيانة
                متاحة للمنشآت التي تحتاج استمرارية بلا توقف.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href="#rfq"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-aqua-400 px-6 text-[13.5px] font-bold text-ink-950 transition hover:bg-aqua-300"
                >
                  <Icon name="clipboard" size={17} />
                  اطلب عرض سعر
                </a>
                <a
                  href={whatsappLink("أحتاج عرضًا لمنشأة تجارية. النشاط:")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-6 text-[13.5px] font-bold text-white transition hover:bg-white/10"
                >
                  <Icon name="whatsapp" size={17} />
                  تواصل مع فريق المشاريع
                </a>
              </div>
              <p className="mt-4 text-[12px] text-ink-300">
                للاستفسارات التجارية: <span className="font-semibold text-white">{contact.commercialEmail}</span>
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: "scale" as const, title: "قياس قبل التوصية", body: "نقيس TDS والعسر ومعدل الاستهلاك قبل ترشيح أي نظام." },
                { icon: "file" as const, title: "عرض فني مكتوب", body: "سعات، مواصفات، جدول كميات، ومدة تنفيذ واضحة." },
                { icon: "shield" as const, title: "تشغيل مدعوم", body: "عقد صيانة يحدد زمن الاستجابة وعدد الزيارات وقطع الغيار." },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <Icon name={item.icon} size={19} className="text-aqua-300" />
                  <h2 className="mt-2.5 font-display text-[13.5px] font-bold">{item.title}</h2>
                  <p className="mt-1 text-[12px] leading-6 text-ink-300">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Industries */}
      {profile.data && (
        <section className="container-x py-10">
          <SectionHeading
            eyebrow="القطاعات"
            title="نخدم قطاعات تحتاج مياهًا مستقرة"
            description="لكل قطاع احتياج مختلف في الجودة والكمية؛ اختر قطاعك لترى التحدي والحل المقترح."
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.data.industries.map((industry) => (
              <li key={industry.id} className="rounded-xl border border-ink-100 bg-surface p-4">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={industry.icon as never} size={18} />
                </span>
                <h3 className="mt-3 font-display text-[13.5px] font-bold text-ink-950">{industry.name}</h3>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                  <span className="font-bold text-ink-700">التحدي:</span> {industry.problem}
                </p>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                  <span className="font-bold text-ink-700">الحل المقترح:</span> {industry.solution}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {industry.recommendedSystems.map((system) => (
                    <span key={system} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                      {system}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink-400">{industry.capacityHint}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Solutions + workflow */}
      {profile.data && (
        <section className="border-y border-ink-100 bg-paper py-10">
          <div className="container-x">
            <SectionHeading
              eyebrow="الحلول"
              title="ما نقدّمه للمنشآت"
              description="حلول جاهزة يمكن تعديل سعاتها بحسب نتيجة القياس والاستهلاك اليومي."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {profile.data.solutions.map((solution) => (
                <article key={solution.id} className="rounded-xl border border-ink-100 bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-[15px] font-extrabold text-ink-950">{solution.name}</h3>
                      <p className="mt-1 text-[12px] font-semibold text-brand-700">{solution.capacity}</p>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aqua-50 text-aqua-700">
                      <Icon name={solution.icon as never} size={19} />
                    </span>
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-7 text-ink-600">{solution.description}</p>
                  <p className="mt-2 text-[12px] text-ink-500">
                    <span className="font-bold text-ink-700">الأنسب لـ:</span> {solution.bestFor}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {solution.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] leading-6 text-ink-600">
                        <Icon name="check" size={13} className="mt-1 shrink-0 text-flow-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-10">
              <SectionHeading eyebrow="منهجية العمل" title="كيف يسير المشروع من أول اتصال للتشغيل" />
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {profile.data.workflow.map((step, index) => (
                <li key={step.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand-700 font-display text-[13px] font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-2.5 font-display text-[13.5px] font-bold text-ink-950">{step.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-6 text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Case studies */}
      {profile.data && (
        <section className="container-x py-10">
          <SectionHeading
            eyebrow="أمثلة تطبيقية"
            title="حالات توضيحية لمشاريع مشابهة"
            description="هذه الحالات توضيحية بُنيت على أنماط مشاريع متكررة، والأرقام المعروضة مؤشرات قياس وليست نتائج تعاقدية."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {profile.data.caseStudies.map((study) => (
              <article key={study.id} className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-5">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{study.sector}</Badge>
                  <Badge tone="info" icon="mapPin">
                    {study.city}
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-[14px] font-extrabold text-ink-950">التحدي</h3>
                <p className="mt-1 text-[12.5px] leading-6 text-ink-600">{study.challenge}</p>
                <h3 className="mt-3 font-display text-[14px] font-extrabold text-ink-950">الحل المنفّذ</h3>
                <p className="mt-1 text-[12.5px] leading-6 text-ink-600">{study.solution}</p>
                <h3 className="mt-3 font-display text-[14px] font-extrabold text-ink-950">المؤشرات</h3>
                <ul className="mt-1.5 space-y-1.5">
                  {study.metrics.map((metric) => (
                    <li key={metric.label} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-[12px]">
                      <span className="text-ink-600">{metric.label}</span>
                      <span className="font-bold text-ink-900 tabular-nums">{metric.value}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {study.equipment.map((item) => (
                    <span key={item} className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-ink-400">{placeholderNote}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* RFQ */}
      <section id="rfq" className="container-x scroll-mt-28 pb-4">
        <div className="rounded-xl border border-ink-100 bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge tone="brand" icon="clipboard">
                طلب عرض سعر
              </Badge>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-950">اطلب عرضًا فنيًا لمنشأتك</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-7 text-ink-600">
                املأ البيانات، وسيتواصل معك فريق المشاريع خلال 24 ساعة عمل لتحديد موعد الزيارة والقياس. الطلب لا يُلزمك
                بأي التزام.
              </p>
            </div>
            {profile.data && (
              <div className="text-[12px] text-ink-500">
                استجابة مبدئية: <span className="font-bold text-ink-900">24 ساعة عمل</span>
              </div>
            )}
          </div>

          {quote ? (
            <div className="mt-6 rounded-xl border border-flow-200 bg-flow-50 p-5">
              <div className="flex items-start gap-3">
                <Icon name="checkCircle" size={22} className="mt-0.5 shrink-0 text-flow-600" />
                <div>
                  <h3 className="font-display text-[15px] font-extrabold text-flow-900">استلمنا طلبك</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-flow-800">
                    الرقم المرجعي <span className="font-mono font-bold">{quote.reference}</span> — سيتواصل معك فريق
                    المشاريع خلال {quote.expectedResponseHours} ساعة عمل على الرقم المسجّل.
                  </p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-flow-200 bg-surface p-3">
                      <dt className="text-[11px] font-bold text-ink-500">المنشأة</dt>
                      <dd className="mt-0.5 text-[12.5px] font-semibold text-ink-900">{form.company}</dd>
                    </div>
                    <div className="rounded-lg border border-flow-200 bg-surface p-3">
                      <dt className="text-[11px] font-bold text-ink-500">المدينة</dt>
                      <dd className="mt-0.5 text-[12.5px] font-semibold text-ink-900">{form.cityName}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <a
                      href={whatsappLink(`متابعة طلب العرض ${quote.reference}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white"
                    >
                      <Icon name="whatsapp" size={15} />
                      متابعة على واتساب
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setQuote(null);
                        setStep(0);
                        setForm({
                          company: "",
                          industry: "",
                          cityName: "",
                          contactPerson: "",
                          jobTitle: "",
                          phone: "",
                          email: "",
                          dailyConsumption: "",
                          projectType: "",
                          notes: "",
                        });
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700"
                    >
                      طلب آخر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (step === 0) {
                  if (validateStep(0)) setStep(1);
                  return;
                }
                if (step === 1) {
                  if (validateStep(1)) setStep(2);
                  return;
                }
                void submit();
              }}
            >
              <ol className="mb-5 flex flex-wrap gap-2">
                {STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold",
                      index === step
                        ? "border-brand-700 bg-brand-700 text-white"
                        : index < step
                          ? "border-flow-200 bg-flow-50 text-flow-700"
                          : "border-ink-200 bg-paper text-ink-400"
                    )}
                  >
                    {index < step ? <Icon name="check" size={13} strokeWidth={3} /> : <span>{index + 1}</span>}
                    {label}
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="اسم المنشأة"
                    name="company"
                    required
                    value={form.company}
                    onChange={(value) => update("company", value)}
                    error={errors.company}
                    placeholder="مثال: مطعم البيت الشامي"
                  />
                  <SelectField
                    label="نشاط المنشأة"
                    name="industry"
                    required
                    value={form.industry}
                    onChange={(value) => update("industry", value)}
                    error={errors.industry}
                    options={(profile.data?.industries ?? []).map((industry) => ({
                      value: industry.name,
                      label: industry.name,
                    }))}
                    placeholder="اختر النشاط"
                  />
                  <SelectField
                    label="المدينة"
                    name="cityName"
                    required
                    value={form.cityName}
                    onChange={(value) => update("cityName", value)}
                    error={errors.cityName}
                    options={cities.map((city) => ({ value: city.name, label: city.name }))}
                    placeholder="اختر المدينة"
                  />
                  <TextField
                    label="مسؤول التواصل"
                    name="contactPerson"
                    required
                    value={form.contactPerson}
                    onChange={(value) => update("contactPerson", value)}
                    error={errors.contactPerson}
                    placeholder="الاسم الكامل"
                  />
                  <TextField
                    label="المسمى الوظيفي (اختياري)"
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={(value) => update("jobTitle", value)}
                    placeholder="مدير تشغيل، مشتريات…"
                  />
                  <TextField
                    label="رقم الجوال"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    value={form.phone}
                    onChange={(value) => update("phone", value)}
                    error={errors.phone}
                    placeholder="05XXXXXXXX"
                  />
                  <TextField
                    label="البريد الإلكتروني (اختياري)"
                    name="email"
                    type="email"
                    className="sm:col-span-2"
                    value={form.email}
                    onChange={(value) => update("email", value)}
                    placeholder="purchasing@example.com"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="الاستهلاك اليومي التقديري"
                    name="dailyConsumption"
                    required
                    value={form.dailyConsumption}
                    onChange={(value) => update("dailyConsumption", value)}
                    error={errors.dailyConsumption}
                    options={[
                      { value: "حتى 500 لتر", label: "حتى 500 لتر" },
                      { value: "500 – 2000 لتر", label: "500 – 2000 لتر" },
                      { value: "2000 – 10000 لتر", label: "2000 – 10000 لتر" },
                      { value: "أكثر من 10000 لتر", label: "أكثر من 10000 لتر" },
                      { value: "لا أعرف", label: "لا أعرف — أحتاج مساعدة في التقدير" },
                    ]}
                    placeholder="اختر نطاقًا تقديريًا"
                  />
                  <SelectField
                    label="نوع الطلب (اختياري)"
                    name="projectType"
                    value={form.projectType}
                    onChange={(value) => update("projectType", value)}
                    options={[
                      { value: "توريد فقط", label: "توريد معدات" },
                      { value: "توريد وتركيب", label: "توريد وتركيب" },
                      { value: "عقد صيانة", label: "عقد صيانة دورية" },
                      { value: "دراسة وتحليل", label: "دراسة مياه وتحليل" },
                      { value: "مشروع متكامل", label: "مشروع متكامل (تصميم وتنفيذ)" },
                    ]}
                    placeholder="اختر نوع الطلب"
                  />
                  <TextArea
                    label="وصف الاحتياج"
                    name="notes"
                    required
                    rows={5}
                    maxLength={800}
                    className="sm:col-span-2"
                    value={form.notes}
                    onChange={(value) => update("notes", value)}
                    error={errors.notes}
                    placeholder="اذكر: نوع المياه الحالي، المشكلة (طعم/رواسب/توقف متكرر)، عدد نقاط الاستخدام، وهل يوجد خزان أرضي."
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "المنشأة", value: form.company },
                      { label: "النشاط", value: form.industry },
                      { label: "المدينة", value: form.cityName },
                      { label: "مسؤول التواصل", value: `${form.contactPerson}${form.jobTitle ? ` — ${form.jobTitle}` : ""}` },
                      { label: "الجوال", value: form.phone },
                      { label: "البريد", value: form.email || "—" },
                      { label: "الاستهلاك اليومي", value: form.dailyConsumption },
                      { label: "نوع الطلب", value: form.projectType || "—" },
                    ].map((row) => (
                      <div key={row.label} className="rounded-lg border border-ink-150 bg-paper p-3">
                        <dt className="text-[11px] font-bold text-ink-500">{row.label}</dt>
                        <dd className="mt-0.5 text-[12.5px] font-semibold text-ink-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="rounded-lg border border-ink-150 bg-paper p-3.5">
                    <p className="text-[11px] font-bold text-ink-500">وصف الاحتياج</p>
                    <p className="mt-1 whitespace-pre-line text-[12.5px] leading-6 text-ink-700">{form.notes}</p>
                  </div>
                  <p className="text-[11.5px] leading-5 text-ink-500">
                    بإرسال الطلب، يتواصل معك فريق المشاريع لتحديد موعد الزيارة. لا توجد أي رسوم على طلب العرض.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  disabled={step === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
                >
                  <Icon name="chevronRight" size={15} />
                  السابق
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-lg px-6 text-[13px] font-bold text-white shadow-brand transition disabled:opacity-60",
                    step === 2 ? "bg-flow-600 hover:bg-flow-700" : "bg-brand-700 hover:bg-brand-800"
                  )}
                >
                  {submitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      جارٍ الإرسال…
                    </>
                  ) : step === 2 ? (
                    <>
                      <Icon name="check" size={16} />
                      إرسال طلب العرض
                    </>
                  ) : (
                    <>
                      التالي
                      <Icon name="chevronLeft" size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Related reading */}
      <section className="container-x pt-10">
        <SectionHeading eyebrow="للقراءة" title="مقالات تفيد فرق التشغيل" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {guides.slice(0, 3).map((guide) => (
            <li key={guide.id}>
              <Link
                to={`/guides/${guide.slug}`}
                className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-brand-200 hover:shadow-hair"
              >
                <h3 className="font-display text-[13.5px] font-bold leading-6 text-ink-950">{guide.title}</h3>
                <p className="mt-2 line-clamp-2 flex-1 text-[12px] leading-6 text-ink-600">{guide.excerpt}</p>
                <span className="mt-3 flex items-center gap-1 text-[12px] font-bold text-brand-700">
                  اقرأ
                  <Icon name="arrowLeft" size={13} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

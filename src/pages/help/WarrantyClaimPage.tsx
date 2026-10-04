import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { track } from "@/services/analytics";
import { Icon } from "@/components/ui/Icon";
import { CheckboxField, RadioCardGroup, TextArea, TextField } from "@/components/common/FormField";
import { warrantyApi, warrantyIssueOptions } from "@/services/helpApi";
import { cities } from "@/data/catalog/support";
import { useStore } from "@/store/StoreProvider";
import { useAuth } from "@/store/AuthProvider";
import { usePageSeo } from "@/lib/seo";
import { hasErrors, required } from "@/lib/validation";
import { SelectField } from "@/components/common/FormField";
import type { WarrantyClaim, WarrantyIssueType } from "@/types/service";

interface FormState {
  orderNumber: string;
  productLabel: string;
  serialNumber: string;
  purchaseDate: string;
  issueType: WarrantyIssueType | "";
  description: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  attachmentName: string;
  acceptedTerms: boolean;
}

/** Warranty claim form — `/help/warranty-claim`. */
export function WarrantyClaimPage() {
  const { pushToast } = useStore();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState<FormState>({
    orderNumber: "",
    productLabel: "",
    serialNumber: "",
    purchaseDate: "",
    issueType: "",
    description: "",
    customerName: isAuthenticated && user ? user.name : "",
    phone: isAuthenticated && user ? user.phone : "",
    email: isAuthenticated && user ? user.email : "",
    city: "",
    attachmentName: "",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [claim, setClaim] = useState<WarrantyClaim | null>(null);

  usePageSeo({
    title: "طلب ضمان | رواء",
    description:
      "قدّم طلب ضمان لمنتج من رواء: أدخل رقم الطلب والرقم التسلسلي ووصف المشكلة، وسيصلك رقم مطالبة لمتابعتها.",
    canonical: "/help/warranty-claim",
    robots: "noindex, follow",
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    const orderError = required(form.orderNumber, "رقم الطلب");
    if (orderError) next.orderNumber = orderError;
    const serialError = required(form.serialNumber, "الرقم التسلسلي");
    if (serialError) next.serialNumber = serialError;
    else if (form.serialNumber.trim().length < 4) next.serialNumber = "الرقم التسلسلي قصير — تحقق من الملصق على الجهاز";
    if (!form.issueType) next.issueType = "اختر نوع المشكلة";
    if (form.description.trim().length < 15) next.description = "اشرح المشكلة بتفصيل أكبر (15 حرفًا على الأقل)";
    const nameError = required(form.customerName, "الاسم");
    if (nameError) next.customerName = nameError;
    const phoneError_ = required(form.phone, "رقم الجوال");
    if (phoneError_) next.phone = phoneError_;
    if (!form.city) next.city = "اختر المدينة";
    if (!form.acceptedTerms) next.acceptedTerms = "يجب الإقرار بشروط الضمان";

    setErrors(next);
    if (hasErrors(next)) {
      pushToast({ tone: "warning", title: "راجع الحقول المطلوبة", description: Object.values(next)[0] });
      return;
    }

    setSubmitting(true);
    try {
      const created = await warrantyApi.create({
        orderNumber: form.orderNumber.trim(),
        productLabel: form.productLabel.trim() || "غير مذكور",
        serialNumber: form.serialNumber.trim(),
        purchaseDate: form.purchaseDate,
        issueType: form.issueType as WarrantyIssueType,
        description: form.description.trim(),
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city,
        attachmentName: form.attachmentName || undefined,
        acceptedTerms: form.acceptedTerms,
      });
      setClaim(created);
      track("submit_warranty", { reference: created.reference, issue_type: created.issueLabel });
      pushToast({ tone: "success", title: "تم إنشاء طلب الضمان", description: `رقم المطالبة ${created.reference}` });
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

  if (claim) {
    return (
      <div className="pb-16">
        <div className="border-b border-ink-100 bg-paper">
          <div className="container-x py-4">
            <Breadcrumbs
              items={[
                { label: "الرئيسية", href: "/" },
                { label: "مركز المساعدة", href: "/faq" },
                { label: "طلب ضمان", href: "/help/warranty-claim" },
              ]}
            />
          </div>
        </div>
        <div className="container-x py-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-flow-50 text-flow-600 ring-1 ring-flow-200">
              <Icon name="badgeCheck" size={30} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">تم تسجيل طلب الضمان</h1>
            <p className="mt-2 text-[13.5px] leading-7 text-ink-600">
              راجع فريق خدمة ما بعد البيع الطلب وسيتواصل معك خلال {claim.expectedResponseHours} ساعة عمل. ستحتاج رقم
              المطالبة في أي متابعة.
            </p>

            <div className="mt-5 rounded-xl border border-ink-100 bg-surface p-5">
              <p className="text-[11.5px] font-bold text-ink-500">رقم المطالبة</p>
              <p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-ink-950">{claim.reference}</p>
              <dl className="mt-4 grid gap-3 text-start sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold text-ink-500">نوع المشكلة</dt>
                  <dd className="mt-0.5 text-[12.5px] font-semibold text-ink-900">{claim.issueLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-ink-500">رقم الطلب</dt>
                  <dd className="mt-0.5 font-mono text-[12.5px] font-semibold text-ink-900">{claim.orderNumber}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-ink-500">الرقم التسلسلي</dt>
                  <dd className="mt-0.5 font-mono text-[12.5px] font-semibold text-ink-900">{claim.serialNumber}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-ink-500">المدينة</dt>
                  <dd className="mt-0.5 text-[12.5px] font-semibold text-ink-900">{claim.city}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link
                to="/contact/whatsapp"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-5 text-[13px] font-bold text-white transition hover:bg-flow-700"
              >
                <Icon name="whatsapp" size={16} />
                إرفاق صور المشكلة
              </Link>
              <Link
                to="/account?tab=warranty"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
              >
                مطالباتي
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "مركز المساعدة", href: "/faq" },
              { label: "طلب ضمان", href: "/help/warranty-claim" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-950">طلب ضمان</h1>
            <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
              املأ الحقول التالية بدقة. البيانات الصحيحة تسرّع فحص الطلب وتحديد ما إذا كانت الحالة مشمولة بالضمان أم
              خارج نطاقه.
            </p>

            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <fieldset className="space-y-4 rounded-xl border border-ink-100 bg-surface p-5">
                <legend className="px-1 font-display text-[14px] font-extrabold text-ink-950">بيانات الطلب والجهاز</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="رقم الطلب"
                    name="orderNumber"
                    required
                    value={form.orderNumber}
                    onChange={(value) => update("orderNumber", value)}
                    error={errors.orderNumber}
                    placeholder="RWA-20260101-1001"
                    hint="تجد الرقم في رسالة التأكيد أو في صفحة طلباتك."
                  />
                  <TextField
                    label="الرقم التسلسلي للجهاز"
                    name="serial"
                    required
                    value={form.serialNumber}
                    onChange={(value) => update("serialNumber", value)}
                    error={errors.serialNumber}
                    placeholder="مثال: RP7-24-018845"
                    hint="ملصق على جسم الجهاز أو أسفله."
                  />
                  <TextField
                    label="وصف المنتج (اختياري)"
                    name="productLabel"
                    value={form.productLabel}
                    onChange={(value) => update("productLabel", value)}
                    placeholder="رواء برو RO-7"
                  />
                  <TextField
                    label="تاريخ الشراء (اختياري)"
                    name="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(value) => update("purchaseDate", value)}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-ink-100 bg-surface p-5">
                <legend className="px-1 font-display text-[14px] font-extrabold text-ink-950">وصف المشكلة</legend>
                <RadioCardGroup
                  legend="نوع المشكلة"
                  name="issueType"
                  columns={2}
                  value={form.issueType}
                  onChange={(value) => update("issueType", value as WarrantyIssueType)}
                  error={errors.issueType}
                  options={warrantyIssueOptions.map((option) => ({ id: option.id, label: option.label }))}
                />
                <TextArea
                  label="تفاصيل المشكلة"
                  name="description"
                  required
                  rows={5}
                  maxLength={800}
                  value={form.description}
                  onChange={(value) => update("description", value)}
                  error={errors.description}
                  placeholder="مثال: الجهاز يعمل لكن التدفق ضعيف جدًا منذ أسبوع، وقراءة TDS خرجت 220 بعد الفلتر. لم يتغير شيء في التمديدات."
                  hint="اذكر متى بدأت المشكلة وهل جرّبت أي إجراء (تنظيف، تغيير شمعة…)."
                />
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-ink-300 bg-paper px-4 py-3 text-[12.5px] font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50/40">
                  <Icon name="camera" size={18} className="text-ink-400" />
                  {form.attachmentName || "إضافة اسم ملف توضيحي (اختياري)"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="sr-only"
                    onChange={(event) => update("attachmentName", event.target.files?.[0]?.name ?? "")}
                  />
                </label>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-ink-100 bg-surface p-5">
                <legend className="px-1 font-display text-[14px] font-extrabold text-ink-950">بيانات التواصل</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="الاسم الكامل"
                    name="customerName"
                    required
                    value={form.customerName}
                    onChange={(value) => update("customerName", value)}
                    error={errors.customerName}
                    autoComplete="name"
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
                    autoComplete="tel"
                    placeholder="05XXXXXXXX"
                  />
                  <TextField
                    label="البريد الإلكتروني (اختياري)"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(value) => update("email", value)}
                    autoComplete="email"
                  />
                  <SelectField
                    label="المدينة"
                    name="city"
                    required
                    value={form.city}
                    onChange={(value) => update("city", value)}
                    error={errors.city}
                    options={cities.map((city) => ({ value: city.name, label: city.name }))}
                    placeholder="اختر المدينة"
                  />
                </div>

                <CheckboxField
                  checked={form.acceptedTerms}
                  onChange={(checked) => update("acceptedTerms", checked)}
                  error={errors.acceptedTerms}
                  label={
                    <>
                      أقرّ بأن البيانات صحيحة، وأعلم أن الضمان لا يشمل الشمعات الاستهلاكية ولا الأعطال الناتجة عن سوء
                      الاستخدام أو التركيب من طرف غير معتمد.{" "}
                      <Link to="/legal/warranty" className="font-bold text-brand-700 underline decoration-dotted">
                        اقرأ سياسة الضمان
                      </Link>
                    </>
                  }
                />
              </fieldset>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {submitting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    جارٍ الإرسال…
                  </>
                ) : (
                  <>
                    <Icon name="shield" size={17} />
                    إرسال طلب الضمان
                  </>
                )}
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">ما يحدث بعد الإرسال</h2>
              <ol className="mt-3 space-y-3">
                {[
                  { title: "استلام الطلب", body: "يُسجَّل الطلب ويصلك رقم مطالبة فوري على الشاشة." },
                  { title: "فحص أولي", body: "يراجع الفريق البيانات والصور لتحديد نوع العطل." },
                  { title: "زيارة أو تشخيص عن بعد", body: "قد يطلب الفني زيارة، أو يشرح خطوات الفحص عبر واتساب." },
                  { title: "القرار والتنفيذ", body: "تُبلَّغ بالنتيجة: إصلاح مشمول بالضمان، أو عرض إصلاح مدفوع." },
                ].map((step, index) => (
                  <li key={step.title} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[12.5px] font-bold text-ink-900">{step.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-6 text-ink-600">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-xl border border-ink-100 bg-paper p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">قبل أن ترسل</h2>
              <ul className="mt-3 space-y-2">
                {[
                  "جرّب إعادة تشغيل الجهاز وفصل التيار 5 دقائق ثم وصله مرة أخرى.",
                  "إن كان البلاغ عن تسريب، أغلق محبس التغذية أولًا لتجنب تلف الأرضيات.",
                  "رقم الطلب والرقم التسلسلي يسرّعان التحقق من مدة الضمان.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-[12px] leading-6 text-ink-600">
                    <Icon name="info" size={13} className="mt-1 shrink-0 text-aqua-600" />
                    {tip}
                  </li>
                ))}
              </ul>
              <Link to="/help/contact" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                أو تواصل معنا مباشرة
                <Icon name="arrowLeft" size={13} />
              </Link>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}

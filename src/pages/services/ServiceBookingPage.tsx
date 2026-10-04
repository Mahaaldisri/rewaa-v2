import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { track } from "@/services/analytics";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { CheckboxField, RadioCardGroup, SelectField, TextArea, TextField } from "@/components/common/FormField";
import { bookableServiceTypes, preferredSlots } from "@/data/content/services";
import { cities } from "@/data/catalog/support";
import { serviceApi } from "@/services/serviceApi";
import { useStore } from "@/store/StoreProvider";
import { useAuth } from "@/store/AuthProvider";
import { usePageSeo } from "@/lib/seo";
import { ServiceAvailabilityPanel } from "@/components/services/ServiceAvailabilityPanel";
import { firstError, hasErrors, phoneError, required } from "@/lib/validation";
import { readJSON, writeJSON, removeKey } from "@/lib/localStore";
import { cn } from "@/utils/cn";
import type { ServiceRequest, ServiceRequestAttachment, ServiceRequestType } from "@/types/service";

const DRAFT_KEY = "rewaa_service_draft";

interface Draft {
  type: ServiceRequestType | "";
  productLabel: string;
  deviceDescription: string;
  cityId: string;
  district: string;
  customerName: string;
  phone: string;
  email: string;
  preferredDate: string;
  preferredSlot: string;
  description: string;
  attachments: ServiceRequestAttachment[];
  planId: string;
  accepted: boolean;
}

const EMPTY_DRAFT: Draft = {
  type: "",
  productLabel: "",
  deviceDescription: "",
  cityId: "",
  district: "",
  customerName: "",
  phone: "",
  email: "",
  preferredDate: "",
  preferredSlot: "",
  description: "",
  attachments: [],
  planId: "",
  accepted: false,
};

const STEPS = [
  { id: 1, title: "نوع الخدمة", hint: "حدّد ما تحتاجه بالضبط" },
  { id: 2, title: "الجهاز", hint: "نوع النظام أو المنتج" },
  { id: 3, title: "الموقع", hint: "المدينة والحي" },
  { id: 4, title: "بيانات التواصل", hint: "من سنتواصل معه" },
  { id: 5, title: "الموعد المفضل", hint: "اليوم والفترة" },
  { id: 6, title: "تفاصيل الحالة", hint: "وصف مختصر وصور" },
  { id: 7, title: "مراجعة وتأكيد", hint: "تأكد من البيانات" },
  { id: 8, title: "تم الحجز", hint: "رقم الطلب وخطواته" },
] as const;

export function ServiceBookingPage() {
  const [params] = useSearchParams();
  const { pushToast } = useStore();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => readJSON<Draft>(DRAFT_KEY, EMPTY_DRAFT));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ServiceRequest | null>(null);

  usePageSeo({
    title: "حجز موعد فني | رواء",
    description:
      "احجز زيارة فني لتركيب نظام تنقية، تغيير شمعات، صيانة دورية، فحص مياه أو معالجة تسريب — مع رقم طلب للمتابعة.",
    canonical: "/services/book",
    robots: "noindex, follow",
  });

  // Prefill from the query string (?type=maintenance&product=…) or the session user.
  useEffect(() => {
    const presetType = params.get("type") as ServiceRequestType | null;
    const presetProduct = params.get("product");
    const presetPlan = params.get("plan");
    setDraft((prev) => ({
      ...prev,
      type: (presetType && bookableServiceTypes.some((item) => item.id === presetType) ? presetType : prev.type) ?? "",
      productLabel: presetProduct ?? prev.productLabel,
      planId: presetPlan ?? prev.planId,
      customerName: prev.customerName || (isAuthenticated && user ? user.name : ""),
      phone: prev.phone || (isAuthenticated && user ? user.phone : ""),
      email: prev.email || (isAuthenticated && user ? user.email : ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isAuthenticated, user?.id]);

  useEffect(() => {
    if (step < 8) writeJSON(DRAFT_KEY, draft);
  }, [draft, step]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validateStep = (current: number): boolean => {
    const next: Record<string, string> = {};
    if (current === 1 && !draft.type) next.type = "اختر نوع الخدمة المطلوبة";
    if (current === 2) {
      if (!draft.productLabel.trim() && !draft.deviceDescription.trim()) {
        next.deviceDescription = "اكتب وصفًا موجزًا للجهاز أو اختره من قائمة المنتجات";
      }
    }
    if (current === 3) {
      if (!draft.cityId) next.cityId = "اختر المدينة";
      if (!draft.district.trim()) next.district = "اكتب اسم الحي";
    }
    if (current === 4) {
      const nameError = required(draft.customerName, "الاسم");
      if (nameError) next.customerName = nameError;
      const phone = phoneError(draft.phone);
      if (phone) next.phone = phone;
    }
    if (current === 5) {
      if (!draft.preferredDate) next.preferredDate = "اختر التاريخ المفضل";
      else {
        const chosen = new Date(draft.preferredDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (chosen.getTime() < today.getTime()) next.preferredDate = "لا يمكن اختيار تاريخ سابق";
      }
      if (!draft.preferredSlot) next.preferredSlot = "اختر الفترة المفضلة";
    }
    if (current === 6) {
      if (draft.description.trim().length < 10) next.description = "اكتب وصفًا أوضح للحالة (10 أحرف على الأقل)";
    }
    if (current === 7 && !draft.accepted) next.accepted = "يجب الإقرار بصحة البيانات قبل التأكيد";

    setErrors(next);
    return !hasErrors(next);
  };

  const goNext = () => {
    if (!validateStep(step)) {
      pushToast({ tone: "warning", title: "راجع الحقول المطلوبة", description: firstError(errors) });
      return;
    }
    setStep((value) => Math.min(8, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((value) => Math.max(1, value - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!validateStep(7)) return;
    if (!draft.type) return;
    setSubmitting(true);
    try {
      const city = cities.find((item) => item.id === draft.cityId);
      const request = await serviceApi.create({
        type: draft.type,
        productLabel: draft.productLabel.trim() || undefined,
        deviceDescription: draft.deviceDescription.trim() || undefined,
        cityId: draft.cityId,
        cityName: city?.name ?? "",
        district: draft.district.trim(),
        customerName: draft.customerName.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim() || undefined,
        preferredDate: draft.preferredDate,
        preferredSlot: draft.preferredSlot,
        description: draft.description.trim(),
        attachments: draft.attachments,
        planId: draft.planId || undefined,
        userId: isAuthenticated ? user?.id : undefined,
      });
      setCreated(request);
      track("book_service", {
        service_type: request.type,
        city: request.cityName,
        reference: request.reference,
        preferred_date: request.preferredDate,
      });
      setStep(8);
      removeKey(DRAFT_KEY);
      pushToast({
        tone: "success",
        title: "تم إنشاء طلب الخدمة",
        description: `رقم طلبك ${request.reference} — سيتواصل معك فريق التنسيق.`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "تعذّر إنشاء الطلب",
        description: error instanceof Error ? error.message : "حاول مرة أخرى بعد قليل.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).slice(0, 3);
    accepted.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        pushToast({ tone: "warning", title: "صيغة غير مدعومة", description: `${file.name} — الصيغ المدعومة: صور فقط.` });
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        pushToast({ tone: "warning", title: "الملف كبير", description: `${file.name} يتجاوز 3 ميجابايت.` });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setDraft((prev) => {
          if (prev.attachments.length >= 3) return prev;
          return {
            ...prev,
            attachments: [
              ...prev.attachments,
              {
                id: `att-${Date.now()}-${prev.attachments.length}`,
                name: file.name,
                previewUrl: String(reader.result),
                sizeLabel: `${(file.size / 1024).toFixed(0)} ك.ب`,
              },
            ],
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const selectedCity = cities.find((city) => city.id === draft.cityId);

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "خدمات الصيانة", href: "/services/maintenance" },
              { label: "حجز موعد", href: "/services/book" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-7">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-extrabold text-ink-950">حجز موعد فني</h1>
          <p className="mt-1.5 text-[13px] text-ink-500">
            ثمانِ خطوات قصيرة، وفي النهاية يصلك رقم طلب تتابع به الزيارة من صفحة تتبّع الخدمات.
          </p>

          {/* Coverage, fees and the nearest window — from the availability service only. */}
          <ServiceAvailabilityPanel className="mt-5" city={selectedCity?.name} />

          {/* Stepper */}
          <ol className="mt-6 flex flex-wrap gap-2" aria-label="خطوات الحجز">
            {STEPS.map((item) => {
              const state = step === item.id ? "current" : step > item.id ? "done" : "todo";
              return (
                <li key={item.id} className="min-w-0">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition",
                      state === "current" && "border-brand-700 bg-brand-700 text-white",
                      state === "done" && "border-flow-200 bg-flow-50 text-flow-700",
                      state === "todo" && "border-ink-200 bg-surface text-ink-400"
                    )}
                  >
                    {state === "done" ? <Icon name="check" size={13} strokeWidth={3} /> : <span>{item.id}</span>}
                    <span className="hidden sm:inline">{item.title}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-xl border border-ink-100 bg-surface p-5 sm:p-6">
            {step < 8 && (
              <header className="mb-5">
                <p className="text-[11.5px] font-bold text-aqua-600">الخطوة {step} من 7</p>
                <h2 className="mt-1 font-display text-lg font-extrabold text-ink-950">{STEPS[step - 1].title}</h2>
                <p className="mt-1 text-[12.5px] text-ink-500">{STEPS[step - 1].hint}</p>
              </header>
            )}

            {step === 1 && (
              <RadioCardGroup
                legend="ما نوع الخدمة التي تحتاجها؟"
                name="service-type"
                columns={2}
                value={draft.type}
                onChange={(value) => update("type", value as ServiceRequestType)}
                error={errors.type}
                options={bookableServiceTypes.map((item) => ({
                  id: item.id,
                  label: item.label,
                  description: item.hint,
                  icon: item.icon as never,
                }))}
              />
            )}

            {step === 2 && (
              <div className="space-y-4">
                <TextField
                  label="اسم الجهاز أو الموديل (اختياري)"
                  name="productLabel"
                  value={draft.productLabel}
                  onChange={(value) => update("productLabel", value)}
                  placeholder="مثال: رواء برو RO-7 أو موديل WFR-10"
                  hint="إن لم تعرف الموديل، اكتب وصفًا للجهاز بالأسفل."
                />
                <TextArea
                  label="وصف الجهاز"
                  name="deviceDescription"
                  required
                  value={draft.deviceDescription}
                  onChange={(value) => update("deviceDescription", value)}
                  error={errors.deviceDescription}
                  placeholder="مثال: نظام بسبع مراحل تحت المغسلة، مركّب قبل سنة تقريبًا، ونوع الصنبور عادي."
                  hint="اذكر عدد المراحل، مكان التركيب، وهل الجهاز يشمل مضخة أو خزان."
                />
                <div className="rounded-lg border border-ink-150 bg-paper p-3.5 text-[12px] leading-6 text-ink-600">
                  لا تعرف الموديل؟{" "}
                  <Link to="/product-finder" className="font-bold text-brand-700 underline decoration-dotted">
                    استخدم أداة تحديد المنتج
                  </Link>{" "}
                  أو أرسل صورة الجهاز على واتساب وسنساعدك.
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="المدينة"
                  name="cityId"
                  required
                  value={draft.cityId}
                  onChange={(value) => update("cityId", value)}
                  error={errors.cityId}
                  options={cities.map((city) => ({ value: city.id, label: `${city.name} — ${city.region}` }))}
                  placeholder="اختر المدينة"
                />
                <TextField
                  label="الحي"
                  name="district"
                  required
                  value={draft.district}
                  onChange={(value) => update("district", value)}
                  error={errors.district}
                  placeholder="مثال: حي الملقا"
                />
                {selectedCity && (
                  <p className="sm:col-span-2 rounded-lg border border-flow-200 bg-flow-50 p-3.5 text-[12px] leading-6 text-flow-800">
                    <Icon name="check" size={14} className="me-1.5 inline" />
                    {selectedCity.name} ضمن نطاق الخدمة. موعد الزيارة المتوقع:{" "}
                    <strong>{selectedCity.standardEta[0]}–{selectedCity.standardEta[1]} يوم عمل</strong> حسب جدول الفنيين.
                  </p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="الاسم الكامل"
                  name="customerName"
                  required
                  value={draft.customerName}
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
                  value={draft.phone}
                  onChange={(value) => update("phone", value)}
                  error={errors.phone}
                  placeholder="05XXXXXXXX"
                  autoComplete="tel"
                  hint="سيصل عليه تأكيد الموعد واسم الفني."
                />
                <TextField
                  label="البريد الإلكتروني (اختياري)"
                  name="email"
                  type="email"
                  className="sm:col-span-2"
                  value={draft.email}
                  onChange={(value) => update("email", value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                {!isAuthenticated && (
                  <p className="sm:col-span-2 text-[12px] text-ink-500">
                    هل لديك حساب؟{" "}
                    <Link to="/login" className="font-bold text-brand-700 underline decoration-dotted">
                      سجّل الدخول
                    </Link>{" "}
                    لتظهر طلباتك في حسابك مباشرة.
                  </p>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <TextField
                  label="التاريخ المفضل"
                  name="preferredDate"
                  type="date"
                  required
                  value={draft.preferredDate}
                  onChange={(value) => update("preferredDate", value)}
                  error={errors.preferredDate}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <RadioCardGroup
                  legend="الفترة المفضلة للزيارة"
                  name="preferredSlot"
                  columns={2}
                  value={draft.preferredSlot}
                  onChange={(value) => update("preferredSlot", value)}
                  error={errors.preferredSlot}
                  options={preferredSlots.map((slot) => ({ id: slot, label: slot }))}
                />
                <p className="rounded-lg border border-ink-150 bg-paper p-3.5 text-[12px] leading-6 text-ink-600">
                  الموعد النهائي يُثبَّت بعد اتصال فريق التنسيق. في الحالات العاجلة (تسريب نشط) اختر «تسريب مياه»
                  في الخطوة الأولى وسنتعامل معها كأولوية.
                </p>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <TextArea
                  label="وصف الحالة"
                  name="description"
                  required
                  rows={5}
                  maxLength={700}
                  value={draft.description}
                  onChange={(value) => update("description", value)}
                  error={errors.description}
                  placeholder="مثال: تدفق المياه ضعيف منذ أسبوعين، وقراءة TDS ارتفعت من 40 إلى 120. لم أستبدل الشمعات منذ 10 أشهر."
                />
                <div>
                  <p className="mb-2 text-[12.5px] font-semibold text-ink-700">صور توضيحية (حتى 3 صور)</p>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 bg-paper px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                    <Icon name="camera" size={22} className="text-ink-400" />
                    <span className="text-[12.5px] font-semibold text-ink-700">اضغط لاختيار صور من جهازك</span>
                    <span className="text-[11px] text-ink-500">JPG أو PNG · بحد أقصى 3 ميجابايت للصورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => handleFiles(event.target.files)}
                    />
                  </label>

                  {draft.attachments.length > 0 && (
                    <ul className="mt-3 grid grid-cols-3 gap-2.5">
                      {draft.attachments.map((attachment) => (
                        <li key={attachment.id} className="relative overflow-hidden rounded-lg border border-ink-150">
                          <img src={attachment.previewUrl} alt={attachment.name} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              update(
                                "attachments",
                                draft.attachments.filter((item) => item.id !== attachment.id)
                              )
                            }
                            aria-label={`إزالة ${attachment.name}`}
                            className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-surface/90 text-ink-600 shadow-hair"
                          >
                            <Icon name="close" size={12} strokeWidth={2.4} />
                          </button>
                          <span className="block truncate px-1.5 py-1 text-[10px] text-ink-500">{attachment.sizeLabel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-[11px] text-ink-500">
                    الصور تبقى على جهازك فقط في هذا العرض التجريبي ولا تُرسل إلى أي خادم.
                  </p>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "نوع الخدمة", value: bookableServiceTypes.find((item) => item.id === draft.type)?.label ?? "—" },
                    { label: "الجهاز", value: draft.productLabel || draft.deviceDescription || "—" },
                    { label: "المدينة والحي", value: `${selectedCity?.name ?? "—"} · ${draft.district || "—"}` },
                    { label: "الاسم", value: draft.customerName || "—" },
                    { label: "الجوال", value: draft.phone || "—" },
                    {
                      label: "الموعد المفضل",
                      value:
                        draft.preferredDate && draft.preferredSlot
                          ? `${new Date(draft.preferredDate).toLocaleDateString("ar-SA-u-nu-latn", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })} · ${draft.preferredSlot}`
                          : "—",
                    },
                    { label: "البريد", value: draft.email || "—" },
                    { label: "الصور المرفقة", value: draft.attachments.length > 0 ? `${draft.attachments.length} صورة` : "بدون" },
                  ].map((row) => (
                    <div key={row.label} className="rounded-lg border border-ink-150 bg-paper p-3">
                      <dt className="text-[11px] font-bold text-ink-500">{row.label}</dt>
                      <dd className="mt-1 text-[13px] font-semibold text-ink-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="rounded-lg border border-ink-150 bg-paper p-3.5">
                  <p className="text-[11px] font-bold text-ink-500">وصف الحالة</p>
                  <p className="mt-1 whitespace-pre-line text-[12.5px] leading-6 text-ink-700">{draft.description}</p>
                </div>

                <CheckboxField
                  checked={draft.accepted}
                  onChange={(checked) => update("accepted", checked)}
                  error={errors.accepted}
                  label={
                    <>
                      أقرّ بأن البيانات صحيحة، وأعلم أن الموعد النهائي يُثبَّت بعد اتصال فريق التنسيق. رسوم الخدمة
                      تُحدَّد حسب نوع الزيارة والقطع المطلوبة ويتم إشعاري بها قبل التنفيذ.
                    </>
                  }
                />
              </div>
            )}

            {step === 8 && created && (
              <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-flow-50 text-flow-600 ring-1 ring-flow-200">
                  <Icon name="checkCircle" size={30} />
                </span>
                <h2 className="mt-4 font-display text-xl font-extrabold text-ink-950">تم استلام طلب الخدمة</h2>
                <p className="mt-2 text-[13px] leading-7 text-ink-600">
                  سيتواصل معك فريق التنسيق على الرقم {created.phone} خلال ساعات العمل لتأكيد الموعد وتحديد الفني.
                </p>

                <div className="mt-5 rounded-xl border border-ink-100 bg-paper p-4">
                  <p className="text-[11.5px] font-bold text-ink-500">رقم طلب الخدمة</p>
                  <p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-ink-950">{created.reference}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Badge tone="info" icon="clock">
                      {created.estimatedVisit}
                    </Badge>
                    <Badge tone="neutral" icon="layers">
                      {created.typeLabel}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Link
                    to={`/help/track?ref=${created.reference}`}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    <Icon name="truck" size={16} />
                    تتبّع الطلب
                  </Link>
                  {isAuthenticated && (
                    <Link
                      to="/account?tab=services"
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
                    >
                      طلباتي في الحساب
                    </Link>
                  )}
                  <Link
                    to="/"
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
                  >
                    متابعة التسوق
                  </Link>
                </div>
              </div>
            )}

            {step < 8 && (
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="chevronRight" size={15} />
                  السابق
                </button>

                {step < 7 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                  >
                    التالي
                    <Icon name="chevronLeft" size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={submitting}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-flow-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        جارٍ الإرسال…
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={16} />
                        تأكيد الحجز
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

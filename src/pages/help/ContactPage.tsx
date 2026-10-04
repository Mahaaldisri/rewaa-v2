import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { CheckboxField, RadioCardGroup, TextArea, TextField } from "@/components/common/FormField";
import { supportApi } from "@/services/helpApi";
import { branches } from "@/data/content/branches";
import { businessHours, contact, mailtoLink, telLink, whatsappLink, seo } from "@/config/site";
import { useStore } from "@/store/StoreProvider";
import { faqsByGroup } from "@/data/content/faqs";
import { Accordion } from "@/components/common/Accordion";
import { usePageSeo } from "@/lib/seo";
import { hasErrors, phoneError, required } from "@/lib/validation";
import { cn } from "@/utils/cn";
import type { ContactMessage, SupportCategory } from "@/types/service";

const CATEGORIES: { id: SupportCategory; label: string; description: string; icon: "headset" | "cart" | "building" | "truck" | "shield" | "message" }[] = [
  { id: "technical", label: "دعم فني", description: "أعطال، تركيب، صيانة، استفسار عن نظام", icon: "headset" },
  { id: "orders", label: "الطلبات والشحن", description: "متابعة طلب، تعديل عنوان، تأخر شحنة", icon: "truck" },
  { id: "sales", label: "استشارة قبل الشراء", description: "اختيار النظام أو القطعة المناسبة", icon: "cart" },
  { id: "commercial", label: "طلبات المنشآت", description: "مطاعم، فنادق، مصانع، عقود صيانة", icon: "building" },
  { id: "warranty", label: "الضمان", description: "مطالبة ضمان أو فحص ما بعد البيع", icon: "shield" },
  { id: "complaint", label: "شكوى أو اقتراح", description: "نطوّر خدمتنا بناءً على ملاحظاتك", icon: "message" },
];

/** Contact hub — `/help/contact`. */
export function ContactPage() {
  const { pushToast } = useStore();
  const [category, setCategory] = useState<SupportCategory | "">("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", orderNumber: "", subject: "", message: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<ContactMessage | null>(null);

  usePageSeo({
    title: "تواصل معنا | رواء",
    description:
      "طرق التواصل مع رواء: واتساب الدعم الفني، الهاتف الموحد، البريد الإلكتروني، وصفحة نموذج مراسلة مصنّف حسب نوع الطلب.",
    canonical: "/help/contact",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "تواصل مع رواء",
        url: `${seo.siteUrl}/help/contact`,
      },
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

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!category) next.category = "اختر نوع الطلب لنوجّهك للفريق الصحيح";
    const nameError = required(form.name, "الاسم");
    if (nameError) next.name = nameError;
    const phoneIssue = phoneError(form.phone);
    if (phoneIssue) next.phone = phoneIssue;
    const subjectError = required(form.subject, "الموضوع");
    if (subjectError) next.subject = subjectError;
    if (form.message.trim().length < 10) next.message = "اكتب تفاصيل أوضح (10 أحرف على الأقل)";
    if (!accepted) next.accepted = "يجب الموافقة على معالجة البيانات";

    setErrors(next);
    if (hasErrors(next)) {
      pushToast({ tone: "warning", title: "راجع الحقول", description: Object.values(next)[0] });
      return;
    }

    setSubmitting(true);
    try {
      const message = await supportApi.sendMessage({
        category: category as SupportCategory,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        orderNumber: form.orderNumber.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(message);
      pushToast({ tone: "success", title: "تم إرسال رسالتك", description: `الرقم المرجعي ${message.reference}` });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "تعذّر إرسال الرسالة",
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
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "مركز المساعدة", href: "/faq" },
              { label: "تواصل معنا", href: "/help/contact" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <h1 className="font-display text-2xl font-extrabold text-ink-950">تواصل معنا</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-ink-500">
          اختر القناة الأنسب لك. للاستفسارات العاجلة استخدم واتساب أو الهاتف، وللطلبات المفصّلة استعمل النموذج
          وسيصل ردّ مكتوب بالرقم المرجعي.
        </p>

        {/* Channels */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "whatsapp" as const,
              title: "واتساب الدعم الفني",
              value: contact.whatsappDisplay,
              href: whatsappLink("مرحبًا رواء، أحتاج مساعدة بخصوص"),
              external: true,
              tone: "flow",
            },
            { icon: "phone" as const, title: "الهاتف الموحد", value: contact.phoneDisplay, href: telLink(), external: true, tone: "brand" },
            { icon: "message" as const, title: "البريد الإلكتروني", value: contact.email, href: mailtoLink("استفسار من الموقع"), external: true, tone: "aqua" },
            { icon: "store" as const, title: "أقرب معرض", value: `${branches[0]?.city} · ${branches[0]?.district}`, href: "/stores", external: false, tone: "ink" },
          ].map((channel) => {
            const content = (
              <>
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-lg",
                    channel.tone === "flow" && "bg-flow-50 text-flow-700",
                    channel.tone === "brand" && "bg-brand-50 text-brand-700",
                    channel.tone === "aqua" && "bg-aqua-50 text-aqua-700",
                    channel.tone === "ink" && "bg-ink-100 text-ink-700"
                  )}
                >
                  <Icon name={channel.icon} size={19} />
                </span>
                <span className="mt-3 block text-[12px] font-bold text-ink-500">{channel.title}</span>
                <span className="mt-0.5 block text-[13px] font-extrabold text-ink-950" dir="auto">
                  {channel.value}
                </span>
              </>
            );
            return channel.external ? (
              <a
                key={channel.title}
                href={channel.href}
                target={channel.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-brand-200 hover:shadow-hair"
              >
                {content}
              </a>
            ) : (
              <Link
                key={channel.title}
                to={channel.href}
                className="rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-brand-200 hover:shadow-hair"
              >
                {content}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          {/* Form */}
          <section aria-labelledby="contact-form-title">
            <div className="rounded-xl border border-ink-100 bg-surface p-5 sm:p-6">
              <h2 id="contact-form-title" className="font-display text-[16px] font-extrabold text-ink-950">
                أرسل رسالة
              </h2>

              {sent ? (
                <div className="mt-5 rounded-xl border border-flow-200 bg-flow-50 p-5 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-xl bg-surface text-flow-600 ring-1 ring-flow-200">
                    <Icon name="checkCircle" size={26} />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-extrabold text-flow-900">وصلتنا رسالتك</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-flow-800">
                    رقمك المرجعي <span className="font-mono font-bold">{sent.reference}</span> — متوسط زمن الرد{" "}
                    {sent.expectedResponseHours} ساعة عمل. يمكنك تسريع المتابعة بإرسال صور على واتساب مع نفس الرقم المرجعي.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                    <a
                      href={whatsappLink(`متابعة الرسالة المرجعية ${sent.reference}`)}
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
                        setSent(null);
                        setForm({ name: "", phone: "", email: "", orderNumber: "", subject: "", message: "" });
                        setCategory("");
                        setAccepted(false);
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-bold text-ink-700"
                    >
                      إرسال رسالة أخرى
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  className="mt-4 space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <RadioCardGroup
                    legend="نوع الطلب"
                    name="category"
                    columns={2}
                    value={category}
                    onChange={(value) => {
                      setCategory(value as SupportCategory);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.category;
                        return next;
                      });
                    }}
                    error={errors.category}
                    options={CATEGORIES.map((item) => ({
                      id: item.id,
                      label: item.label,
                      description: item.description,
                      icon: item.icon,
                    }))}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="الاسم"
                      name="name"
                      required
                      value={form.name}
                      onChange={(value) => update("name", value)}
                      error={errors.name}
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
                      placeholder="05XXXXXXXX"
                      autoComplete="tel"
                    />
                    <TextField
                      label="البريد الإلكتروني (اختياري)"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={(value) => update("email", value)}
                      autoComplete="email"
                    />
                    <TextField
                      label="رقم الطلب (اختياري)"
                      name="orderNumber"
                      value={form.orderNumber}
                      onChange={(value) => update("orderNumber", value)}
                      placeholder="RWA-20260101-1001"
                    />
                  </div>

                  <TextField
                    label="موضوع الرسالة"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={(value) => update("subject", value)}
                    error={errors.subject}
                    placeholder="مثال: تسريب في وصلة التغذية بعد التركيب"
                  />

                  <TextArea
                    label="تفاصيل الرسالة"
                    name="message"
                    required
                    rows={5}
                    maxLength={900}
                    value={form.message}
                    onChange={(value) => update("message", value)}
                    error={errors.message}
                    placeholder="اشرح حالتك بالتفصيل: نوع الجهاز، متى بدأت المشكلة، وما جرّبته."
                  />

                  <CheckboxField
                    checked={accepted}
                    onChange={setAccepted}
                    error={errors.accepted}
                    label={
                      <>
                        أوافق على معالجة بياناتي للرد على طلبي وفق{" "}
                        <Link to="/legal/privacy" className="font-bold text-brand-700 underline decoration-dotted">
                          سياسة الخصوصية
                        </Link>
                        .
                      </>
                    }
                  />

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
                        <Icon name="message" size={17} />
                        إرسال الرسالة
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6">
              <h2 className="font-display text-[16px] font-extrabold text-ink-950">أسئلة تتكرر على خدمة العملاء</h2>
              <Accordion
                className="mt-3"
                items={faqsByGroup("shipping").slice(0, 4).map((faq) => ({
                  id: faq.id,
                  title: faq.question,
                  content: <p>{faq.answer}</p>,
                }))}
              />
            </div>
          </section>

          {/* Side info */}
          <aside className="space-y-4">
            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">أوقات العمل</h2>
              <ul className="mt-3 space-y-2">
                {businessHours.map((row) => (
                  <li key={row.day} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-600">{row.day}</span>
                    <span className="font-semibold text-ink-900">{row.hours}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] leading-5 text-ink-500">
                الرسائل الواردة خارج أوقات العمل تُسجَّل فورًا ويُردّ عليها في أول ساعة عمل تالية.
              </p>
            </article>

            <article className="rounded-xl border border-ink-100 bg-paper p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">البلاغات العاجلة</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                للتسريبات النشطة أو انقطاع المياه عن المنشأة، اتصل مباشرة أو اختر «دعم فني» وأضف كلمة «عاجل» في الموضوع.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={telLink()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink-950 text-[12.5px] font-bold text-white"
                >
                  <Icon name="phone" size={15} />
                  اتصل الآن
                </a>
                <Link
                  to="/services/book?type=leak"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-danger/25 bg-danger-soft/50 text-[12.5px] font-bold text-danger"
                >
                  <Icon name="alert" size={15} />
                  حجز زيارة طارئة
                </Link>
              </div>
            </article>

            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">قنوات أخرى</h2>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: "تتبّع طلب أو خدمة", href: "/help/track", icon: "truck" as const },
                  { label: "طلب ضمان", href: "/help/warranty-claim", icon: "shield" as const },
                  { label: "الإرجاع والاستبدال", href: "/help/returns", icon: "rotate" as const },
                  { label: "طلبات المنشآت (B2B)", href: "/business", icon: "building" as const },
                  { label: "الأسئلة الشائعة", href: "/faq", icon: "info" as const },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="flex items-center justify-between rounded-lg border border-ink-150 bg-paper px-3 py-2.5 text-[12.5px] font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-ink-50"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name={link.icon} size={15} className="text-brand-600" />
                        {link.label}
                      </span>
                      <Icon name="chevronLeft" size={15} className="text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <div className="rounded-xl border border-flow-200 bg-flow-50 p-5">
              <Badge tone="success" icon="whatsapp">
                الأسرع ردًا
              </Badge>
              <p className="mt-2.5 text-[12.5px] leading-6 text-flow-900">
                واتساب الدعم الفني هو القناة الأسرع للردود الفورية، ويمكنك إرسال صور الجهاز والملصقات مباشرة.
              </p>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-flow-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-flow-700"
              >
                <Icon name="whatsapp" size={15} />
                افتح المحادثة
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

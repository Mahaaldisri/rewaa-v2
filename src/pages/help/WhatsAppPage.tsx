import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { faqsByGroup } from "@/data/content/faqs";
import { branches } from "@/data/content/branches";
import { contact, businessHours, whatsappLink } from "@/config/site";
import { usePageSeo } from "@/lib/seo";

const FLOWS: { title: string; description: string; message: string; icon: "headset" | "cart" | "layers" | "alert" | "building" }[] = [
  {
    title: "اختيار النظام المناسب",
    description: "أرسل عدد أفراد الأسرة ونوع المياه، ونرشّح لك نظامًا بالمقارنة بين خيارين.",
    message: "أحتاج مساعدة في اختيار نظام تنقية مناسب. عدد أفراد الأسرة: 6، والاستخدام: شرب وطبخ.",
    icon: "cart",
  },
  {
    title: "متابعة طلب أو شحنة",
    description: "أرسل رقم الطلب (RWA-…) وسنخبرك بحالة الشحنة والموعد المتوقع.",
    message: "أرغب بمتابعة طلبي رقم: ",
    icon: "headset",
  },
  {
    title: "معرفة القطعة أو الشمعة",
    description: "أرسل صورة الملصق على الجهاز وسنحدد القطعة المناسبة والمقاس.",
    message: "أحتاج تحديد الشمعة المناسبة لجهازي، سأرسل صورة الملصق.",
    icon: "layers",
  },
  {
    title: "بلاغ عطل أو تسريب",
    description: "صِف المشكلة وأرسل صورة، وإن كان تسريبًا نشطًا أغلق المحبس أولًا.",
    message: "عندي مشكلة في النظام: ",
    icon: "alert",
  },
  {
    title: "عروض المنشآت (B2B)",
    description: "أرسل اسم المنشأة والنشاط والمدينة، وسيتواصل معك فريق المشاريع بعرض فني.",
    message: "أحتاج عرض سعر لمنشأة تجارية. النشاط: ",
    icon: "building",
  },
];

/** WhatsApp landing page — `/contact/whatsapp`. */
export function WhatsAppPage() {
  usePageSeo({
    title: "واتساب الدعم الفني | رواء",
    description:
      "تواصل مع رواء على واتساب لاختيار النظام المناسب، تحديد القطعة، متابعة الطلبات، أو طلبات المنشآت — مع رسائل جاهزة.",
    canonical: "/contact/whatsapp",
  });

  return (
    <div className="pb-16">
      <div className="border-b border-ink-100 bg-paper">
        <div className="container-x py-4">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "مركز المساعدة", href: "/faq" },
              { label: "واتساب", href: "/contact/whatsapp" },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="bg-flow-600 text-white">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(650px_240px_at_85%_-20%,rgba(255,255,255,0.22),transparent_70%)]" />
          <div className="container-x relative py-10">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Icon name="whatsapp" size={28} />
              </span>
              <div>
                <Badge tone="success" solid icon="clock">
                  متوسط الرد: دقائق
                </Badge>
                <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">الدعم الفني على واتساب</h1>
                <p className="mt-1.5 text-[13.5px] text-flow-50">
                  {businessHours[0].day} · {businessHours[0].hours} — والرسائل خارج الوقت تُردّ في أول ساعة عمل.
                </p>
              </div>
              <a
                href={whatsappLink("مرحبًا رواء، أحتاج مساعدة.")}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-[13.5px] font-extrabold text-flow-700 shadow-lift transition hover:bg-flow-50"
              >
                <Icon name="whatsapp" size={18} />
                افتح المحادثة الآن
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div>
            <h2 className="font-display text-[18px] font-extrabold text-ink-950">ابدأ من الرسالة الجاهزة المناسبة</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
              اضغط على أي بطاقة لتفتح واتساب برسالة مكتوبة مسبقًا. املأ الفراغات البسيطة (رقم الطلب أو وصف الحالة) ثم أرسل.
            </p>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {FLOWS.map((flow) => (
                <li key={flow.title}>
                  <a
                    href={whatsappLink(flow.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 transition hover:border-flow-300 hover:shadow-hair"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-flow-50 text-flow-700">
                      <Icon name={flow.icon} size={18} />
                    </span>
                    <h3 className="mt-3 font-display text-[14px] font-bold text-ink-950">{flow.title}</h3>
                    <p className="mt-1.5 flex-1 text-[12.5px] leading-6 text-ink-600">{flow.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-flow-700">
                      افتح واتساب
                      <Icon name="arrowLeft" size={13} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <section className="mt-8">
              <h2 className="font-display text-[17px] font-extrabold text-ink-950">جهّز معلوماتك قبل المراسلة</h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {[
                  "رقم الطلب أو رقم طلب الخدمة إن كانت الحالة مرتبطة بطلب قائم.",
                  "صورة واضحة للملصق الموجود على جسم الجهاز (يحتوي الموديل والرقم التسلسلي).",
                  "قياس TDS قبل وبعد الفلتر إن كان لديك جهاز قياس.",
                  "وصف مختصر: متى بدأت المشكلة وما الذي جرّبته.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 rounded-lg border border-ink-150 bg-paper p-3 text-[12.5px] leading-6 text-ink-600">
                    <Icon name="check" size={14} className="mt-1 shrink-0 text-flow-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="font-display text-[17px] font-extrabold text-ink-950">أسئلة عن خدمة واتساب</h2>
              <Accordion
                className="mt-3"
                items={faqsByGroup("shipping").slice(2, 6).map((faq) => ({
                  id: faq.id,
                  title: faq.question,
                  content: <p>{faq.answer}</p>,
                }))}
              />
            </section>
          </div>

          <aside className="space-y-4">
            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">بيانات التواصل</h2>
              <ul className="mt-3 space-y-3 text-[12.5px]">
                <li className="flex items-center gap-2.5">
                  <Icon name="whatsapp" size={16} className="text-flow-600" />
                  <span className="font-semibold text-ink-800" dir="ltr">
                    {contact.whatsappDisplay}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="phone" size={16} className="text-brand-600" />
                  <a href={`tel:${contact.phone}`} className="font-semibold text-ink-800">
                    {contact.phoneDisplay}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="message" size={16} className="text-aqua-600" />
                  <a href={`mailto:${contact.email}`} className="font-semibold text-ink-800">
                    {contact.email}
                  </a>
                </li>
              </ul>
              <p className="mt-3 text-[11.5px] leading-5 text-ink-500">
                لا نطلب أبدًا بيانات بطاقتك أو كلمات المرور عبر واتساب. أي رسالة تطلب ذلك ليست من رواء.
              </p>
            </article>

            <article className="rounded-xl border border-ink-100 bg-paper p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">تفضل الزيارة؟</h2>
              <ul className="mt-3 space-y-2.5">
                {branches.slice(0, 3).map((branch) => (
                  <li key={branch.id} className="rounded-lg border border-ink-150 bg-surface p-3">
                    <p className="text-[12.5px] font-bold text-ink-900">
                      {branch.city} — {branch.district}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-5 text-ink-500">{branch.address}</p>
                  </li>
                ))}
              </ul>
              <Link to="/stores" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                كل المعارض
                <Icon name="arrowLeft" size={13} />
              </Link>
            </article>

            <article className="rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[14px] font-extrabold text-ink-950">حالات تحتاج زيارة فني</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                بعض الحالات لا تُحل عن بُعد: تسريب نشط، تغيير ممبرين، تركيب نظام جديد، أو انقطاع تغذية كهربائية.
              </p>
              <Link
                to="/services/book"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
              >
                <Icon name="calendar" size={15} />
                احجز زيارة فني
              </Link>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}

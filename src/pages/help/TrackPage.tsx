import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { TextField } from "@/components/common/FormField";
import { EmptyState, ErrorState } from "@/components/common/States";
import { trackingApi } from "@/services/helpApi";
import { useStore } from "@/store/StoreProvider";
import { usePageSeo } from "@/lib/seo";
import { phoneError } from "@/lib/validation";
import { formatMoney } from "@/lib/format";
import { cn } from "@/utils/cn";
import type { TrackingRecord } from "@/types/service";

/** Order + service tracking — `/help/track`. */
export function TrackPage() {
  const [params, setParams] = useSearchParams();
  const { pushToast } = useStore();

  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [contact, setContact] = useState("");
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  usePageSeo({
    title: "تتبّع الطلب أو طلب الخدمة | رواء",
    description:
      "أدخل رقم الطلب (RWA-…) أو رقم طلب الخدمة (RWA-SRV-…) لمتابعة حالة الشحنة أو الزيارة الفنية خطوة بخطوة.",
    canonical: "/help/track",
    robots: "noindex, follow",
  });

  const lookup = async (value: string, phone: string) => {
    if (!value.trim()) {
      pushToast({ tone: "warning", title: "أدخل رقم الطلب", description: "مثال: RWA-SRV-2026-10001" });
      return;
    }
    if (phone.trim()) {
      const phoneIssue = phoneError(phone, false);
      if (phoneIssue) {
        pushToast({ tone: "warning", title: "رقم جوال غير صحيح", description: phoneIssue });
        return;
      }
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setRecord(null);
    try {
      const result = await trackingApi.lookup({ reference: value, contact: phone || undefined });
      setRecord(result);
      setParams({ ref: value.trim().toUpperCase() }, { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "تعذّر جلب حالة الطلب.";
      setError(message);
      setNotFound(!(caught instanceof Error) || message.includes("لم نعثر"));
    } finally {
      setLoading(false);
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
              { label: "تتبّع الطلب", href: "/help/track" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-extrabold text-ink-950">تتبّع الطلب أو طلب الخدمة</h1>
          <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
            اكتب رقم الطلب كما وصل في رسالة التأكيد. تبدأ أرقام الطلبات بـ <span className="font-mono">RWA-</span> وأرقام
            الخدمات بـ <span className="font-mono">RWA-SRV-</span>.
          </p>

          <form
            className="mt-6 grid gap-4 rounded-xl border border-ink-100 bg-surface p-5 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(reference, contact);
            }}
          >
            <TextField
              label="رقم الطلب / طلب الخدمة"
              name="reference"
              required
              icon="truck"
              value={reference}
              onChange={setReference}
              placeholder="RWA-20260101-1001"
              error={error ?? undefined}
            />
            <TextField
              label="آخر 4 أرقام من جوال الطلب (اختياري)"
              name="contact"
              inputMode="tel"
              value={contact}
              onChange={setContact}
              placeholder="4567"
              hint="يستخدم للتحقق من صاحب الطلب فقط."
            />
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    جارٍ البحث…
                  </>
                ) : (
                  <>
                    <Icon name="search" size={16} />
                    تتبّع الطلب
                  </>
                )}
              </button>
              <Link to="/account/orders" className="text-[12.5px] font-bold text-brand-700 underline decoration-dotted">
                أو اعرض طلبات حسابك
              </Link>
            </div>
          </form>

          {/* Result */}
          <div className="mt-7">
            {loading && (
              <div className="space-y-3" aria-hidden>
                <div className="skeleton h-24 rounded-xl" />
                <div className="skeleton h-64 rounded-xl" />
              </div>
            )}

            {!loading && error && !notFound && <ErrorState title="تعذّر التتبّع" description={error} onRetry={() => void lookup(reference, contact)} />}

            {!loading && notFound && (
              <EmptyState
                icon="search"
                title="لم نعثر على طلب بهذا الرقم"
                description="تأكد من كتابة الرقم كما ظهر في رسالة التأكيد. إن أدخلت رقم جوال، فسيتم التحقق من مطابقته لصاحب الطلب."
                action={{ label: "تواصل مع خدمة العملاء", href: "/contact/whatsapp" }}
              >
                <div className="mx-auto max-w-md space-y-2 text-start">
                  {[
                    "أرقام الطلبات تبدأ بـ RWA ورقم الخدمات بـ RWA-SRV.",
                    "إن كان الطلب قديمًا أكثر من 90 يومًا، تواصل معنا لنتحقق يدويًا.",
                    "تأكد من إدخال آخر 4 أرقام من جوال صاحب الطلب.",
                  ].map((tip) => (
                    <p key={tip} className="flex items-start gap-2 text-[12px] leading-6 text-ink-500">
                      <Icon name="info" size={13} className="mt-1 shrink-0 text-aqua-600" />
                      {tip}
                    </p>
                  ))}
                </div>
              </EmptyState>
            )}

            {!loading && record && <TrackingResult record={record} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingResult({ record }: { record: TrackingRecord }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone={record.kind === "service" ? "success" : "aqua"} icon={record.kind === "service" ? "headset" : "truck"}>
              {record.kind === "service" ? "طلب خدمة" : "طلب شراء"}
            </Badge>
            <p className="mt-2 font-mono text-[15px] font-extrabold tracking-wider text-ink-950">{record.reference}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink-700">{record.statusLabel}</p>
            {record.statusNote && <p className="mt-1 text-[12.5px] text-ink-500">{record.statusNote}</p>}
          </div>
          <div className="text-end">
            <p className="text-[11.5px] text-ink-500">تاريخ الإنشاء</p>
            <p className="text-[13px] font-bold text-ink-900">
              {new Date(record.createdAt).toLocaleDateString("ar-SA-u-nu-latn", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            {record.etaLabel && (
              <>
                <p className="mt-2 text-[11.5px] text-ink-500">الموعد المتوقع</p>
                <p className="text-[13px] font-bold text-brand-700">{record.etaLabel}</p>
              </>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {record.summary.map((row) => (
            <div key={row.label} className="rounded-lg border border-ink-150 bg-paper p-3">
              <dt className="text-[11px] font-bold text-ink-500">{row.label}</dt>
              <dd className="mt-1 text-[12.5px] font-semibold text-ink-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-ink-100 bg-surface p-5">
        <h2 className="font-display text-[15px] font-extrabold text-ink-950">مراحل الطلب</h2>
        <ol className="mt-4 space-y-0">
          {record.steps.map((step, index) => {
            const isLast = index === record.steps.length - 1;
            return (
              <li key={step.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2",
                      step.state === "done" && "border-flow-500 bg-flow-500 text-white",
                      step.state === "current" && "border-brand-600 bg-surface text-brand-700",
                      step.state === "pending" && "border-ink-200 bg-surface text-ink-300"
                    )}
                  >
                    {step.state === "done" ? (
                      <Icon name="check" size={13} strokeWidth={3} />
                    ) : (
                      <span className="size-2 rounded-full bg-current" />
                    )}
                  </span>
                  {!isLast && <span className={cn("w-0.5 flex-1", step.state === "done" ? "bg-flow-300" : "bg-ink-150")} />}
                </div>
                <div className={cn("pb-5", isLast && "pb-0")}>
                  <p
                    className={cn(
                      "text-[13px] font-bold",
                      step.state === "pending" ? "text-ink-400" : "text-ink-950"
                    )}
                  >
                    {step.label}
                    {step.state === "current" && (
                      <span className="ms-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                        الحالة الحالية
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-6 text-ink-500">{step.description}</p>
                  {step.at && (
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {new Date(step.at).toLocaleString("ar-SA-u-nu-latn", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {record.carrier && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-150 bg-paper p-3.5">
            <Icon name="truck" size={18} className="text-brand-700" />
            <p className="text-[12.5px] text-ink-700">
              شركة الشحن: <strong>{record.carrier.name}</strong> · رقم التتبع:{" "}
              <span className="font-mono font-bold">{record.carrier.trackingNumber}</span>
            </p>
            {record.carrier.phone && (
              <a
                href={`tel:${record.carrier.phone}`}
                className="ms-auto text-[12px] font-bold text-brand-700 underline decoration-dotted"
              >
                تواصل مع الشحن
              </a>
            )}
          </div>
        )}

        {record.technician && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-flow-200 bg-flow-50 p-3.5">
            <Icon name="user" size={18} className="text-flow-700" />
            <p className="text-[12.5px] text-flow-900">
              الفني المسؤول: <strong>{record.technician.name}</strong> · التقييم {record.technician.rating} / 5
            </p>
            <a
              href={`tel:${record.technician.phone}`}
              className="ms-auto text-[12px] font-bold text-flow-800 underline decoration-dotted"
            >
              اتصل بالفني
            </a>
          </div>
        )}
      </div>

      {/* Items */}
      {record.items && record.items.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-surface p-5">
          <h2 className="font-display text-[15px] font-extrabold text-ink-950">أصناف الطلب</h2>
          <ul className="mt-3 divide-y divide-ink-100">
            {record.items?.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-3 py-3">
                {item.image && (
                  <img src={item.image} alt={item.name} loading="lazy" className="size-12 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-ink-900">{item.name}</p>
                  {item.note && <p className="text-[11.5px] text-ink-500">{item.note}</p>}
                </div>
                <span className="ms-auto text-[12px] font-semibold text-ink-600 tabular-nums">× {item.quantity}</span>
              </li>
            ))}
          </ul>
          {record.address && (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-500">
              <Icon name="mapPin" size={14} className="text-ink-400" />
              عنوان التسليم/الزيارة: {record.address}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-paper p-4">
        <Icon name="headset" size={18} className="text-brand-700" />
        <p className="text-[12.5px] text-ink-600">
          هل بيانات الطلب غير دقيقة أو تحتاج تعديل العنوان؟
        </p>
        <Link
          to="/help/contact"
          className="ms-auto inline-flex h-10 items-center gap-2 rounded-lg bg-ink-950 px-4 text-[12.5px] font-bold text-white transition hover:bg-ink-800"
        >
          راسل خدمة العملاء
        </Link>
      </div>

      {record.kind === "order" && (
        <p className="text-center text-[12px] text-ink-500">
          الإجمالي المدفوع يظهر في تفاصيل الطلب داخل حسابك —{" "}
          <Link to="/account/orders" className="font-bold text-brand-700 underline decoration-dotted">
            عرض طلباتي
          </Link>
          {record.summary.find((row) => row.label === "الإجمالي") && (
            <> · {formatMoney(Number(record.summary.find((row) => row.label === "الإجمالي")?.value.replace(/[^\d.]/g, "") ?? 0))}</>
          )}
        </p>
      )}
    </div>
  );
}

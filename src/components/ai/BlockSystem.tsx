/**
 * كتل "الأنظمة" داخل المحادثة: نتيجة الحاسبة، بطاقة خدمة، حالة طلب، صيانة،
 * تسليم بشري، ملاحظة، مصادر، إجراء مقترح، ردود سريعة.
 *
 * مبدأ ثابت: كل رقم معروض يأتي من خدمة أو محرّك قائم في الموقع — لا حساب من
 * النموذج. ونتيجة الحاسبة تُعاد حسابيًا في المتصفح عبر `@/lib/calculator-logic`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { calculate, formatRiyals } from "@/lib/calculator-logic";
import { availabilityApi, type ServiceAvailability } from "@/services/serviceAvailability";
import { resolveSummary } from "@/services/ai/catalog-resolver";
import { useAuth } from "@/store/AuthProvider";
import type { CalculatorInput } from "@/types/calculator";
import type {
  AiActionBlock,
  AiCalculatorBlock,
  AiClientAction,
  AiHandoffBlock,
  AiMaintenanceBlock,
  AiNoticeBlock,
  AiOrderBlock,
  AiQuickRepliesBlock,
  AiServiceBlock,
  AiSourcesBlock,
} from "@/types/ai";

/* ------------------------------ نصوص عامة ------------------------------ */

export function TextBlock({ text }: { text: string }) {
  // `dir="auto"` يجعل الرد الإنجليزي يُعرض LTR داخل واجهة RTL بلا كسر التخطيط.
  return (
    <p dir="auto" className="whitespace-pre-line text-[13px] leading-7 text-ink-800">
      {text}
    </p>
  );
}

const NOTICE_STYLES: Record<AiNoticeBlock["tone"], { wrap: string; icon: "info" | "alert" | "checkCircle" | "xCircle" }> = {
  info: { wrap: "border-info/25 bg-info-soft text-info", icon: "info" },
  warning: { wrap: "border-warning/25 bg-warning-soft text-warning", icon: "alert" },
  success: { wrap: "border-success/25 bg-success-soft text-success", icon: "checkCircle" },
  danger: { wrap: "border-danger/25 bg-danger-soft text-danger", icon: "xCircle" },
};

export function NoticeBlock({ block }: { block: AiNoticeBlock }) {
  const style = NOTICE_STYLES[block.tone];
  return (
    <div className={cn("flex gap-2 rounded-lg border p-2.5", style.wrap)}>
      <Icon name={style.icon} size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0 text-[12px] leading-6">
        {block.title && <p className="font-bold">{block.title}</p>}
        <p className={cn(block.title ? "mt-0.5" : "", "text-ink-700")}>{block.text}</p>
      </div>
    </div>
  );
}

export function SourcesBlock({ block }: { block: AiSourcesBlock }) {
  const [open, setOpen] = useState(false);
  if (block.items.length === 0) return null;

  return (
    <div className="rounded-lg border border-ink-100 bg-paper">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-[11.5px] font-bold text-ink-700"
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon name="file" size={13} />
          المصادر ({block.items.length})
        </span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-ink-100 px-2.5 py-2">
          {block.items.map((source) => (
            <li key={source.id} className="text-[11.5px] leading-6">
              {source.href ? (
                <Link to={source.href} className="font-semibold text-brand-700 hover:underline">
                  {source.title}
                </Link>
              ) : (
                <span className="font-semibold text-ink-700">{source.title}</span>
              )}
              <span className="ms-1 text-ink-400">
                · {source.kind === "faq" ? "سؤال شائع" : source.kind === "guide" ? "دليل" : source.kind === "policy" ? "سياسة" : source.kind === "service" ? "خدمة" : "كتالوج"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- الإجراءات ------------------------------ */

export function ActionBlock({
  block,
  onAction,
}: {
  block: AiActionBlock;
  onAction: (action: AiClientAction, needsConfirm?: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(block.action, block.confirmRequired)}
      className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-brand-800"
    >
      {block.confirmRequired && <Icon name="shield" size={13} />}
      {block.label}
      <Icon name="arrowLeft" size={13} />
    </button>
  );
}

export function QuickRepliesBlock({
  block,
  onReply,
  onAction,
}: {
  block: AiQuickRepliesBlock;
  onReply: (text: string) => void;
  onAction: (action: AiClientAction) => void;
}) {
  const replies = block.replies.slice(0, 4);
  if (replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="ردود سريعة">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => {
            if (reply.send) onReply(reply.send);
            else if (reply.action) onAction(reply.action);
          }}
          className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11.5px] font-semibold text-brand-800 transition hover:bg-brand-100"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- الحاسبة -------------------------------- */

function toCalculatorInput(block: AiCalculatorBlock): CalculatorInput {
  const input = block.input;
  const ownership: CalculatorInput["ownership"] = {
    productSlug: input.productId ? resolveSummary(input.productId)?.slug : undefined,
    productName: input.productId ? resolveSummary(input.productId)?.name : undefined,
    devicePrice: input.devicePrice ?? 0,
    installationCost: input.installationCost ?? 0,
    initialAccessoriesCost: 0,
    replacementKitPrice: input.replacementKitPrice ?? 0,
    replacementIntervalMonths: input.replacementIntervalMonths ?? 0,
    maintenancePrice: input.maintenancePrice ?? 0,
    maintenanceIntervalMonths: input.maintenanceIntervalMonths ?? 0,
    extraMonthlyCost: 0,
    manual: !input.productId,
  };

  return {
    mode: input.mode,
    estimate: {
      people: input.people,
      litersPerPersonPerDay: input.litersPerPersonPerDay,
      extraMonthlyCost: 0,
    },
    purchases: {
      presetId: "custom",
      unitLiters: input.unitLiters,
      unitPrice: input.unitPrice,
      unitsPerPeriod: input.unitsPerPeriod,
      frequency: input.frequency,
    },
    ownership,
    months: input.months,
    waterPriceGrowthPercent: 0,
  };
}

export function CalculatorResultBlock({ block, onAction }: { block: AiCalculatorBlock; onAction: (action: AiClientAction) => void }) {
  const result = useMemo(() => calculate(toCalculatorInput(block)), [block]);
  const product = block.input.productId ? resolveSummary(block.input.productId) : undefined;

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-3" aria-label="نتيجة حاسبة التوفير">
      <header className="flex items-center gap-1.5">
        <Icon name="percent" size={14} className="text-aqua-600" />
        <p className="text-[12px] font-bold text-ink-800">نتيجة التوفير ({result.months} شهرًا)</p>
      </header>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-paper-deep px-2.5 py-2">
          <p className="text-[10.5px] text-ink-500">مياه القوارير</p>
          <p className="mt-0.5 font-display text-[13px] font-bold text-ink-900">{formatRiyals(result.bottledTotal)}</p>
        </div>
        <div className="rounded-md bg-paper-deep px-2.5 py-2">
          <p className="text-[10.5px] text-ink-500">مع جهاز التنقية</p>
          <p className="mt-0.5 font-display text-[13px] font-bold text-ink-900">{formatRiyals(result.filterTotal)}</p>
        </div>
        <div className="rounded-md bg-flow-50 px-2.5 py-2">
          <p className="text-[10.5px] text-flow-800">صافي الفرق</p>
          <p className="mt-0.5 font-display text-[13px] font-bold text-flow-800">{formatRiyals(result.savings)}</p>
        </div>
        <div className="rounded-md bg-paper-deep px-2.5 py-2">
          <p className="text-[10.5px] text-ink-500">بداية التوفير</p>
          <p className="mt-0.5 font-display text-[13px] font-bold text-ink-900">
            {result.breakEvenMonth ? `الشهر ${result.breakEvenMonth}` : "لم يتحقق"}
          </p>
        </div>
      </div>

      {result.missingData.length > 0 && (
        <p className="mt-2 rounded-md bg-warning-soft px-2.5 py-2 text-[11px] leading-6 text-warning">
          ناقص: {result.missingData.join(" · ")} — لن نعرض أرقامًا غير محسوبة.
        </p>
      )}

      {product && <p className="mt-2 text-[11.5px] text-ink-600">مبني على بيانات: {product.name}</p>}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() =>
            onAction({
              kind: "open_calculator",
              productId: block.input.productId,
              months: block.input.months,
              householdSize: block.input.people,
            })
          }
          className="inline-flex items-center gap-1 rounded-md bg-ink-950 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-ink-800"
        >
          افتح الحاسبة بكل التفاصيل
          <Icon name="arrowLeft" size={11} />
        </button>
        {product && (
          <Link
            to={`/p/${product.slug}`}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-bold text-ink-800 transition hover:border-brand-300"
          >
            عرض المنتج
          </Link>
        )}
      </div>

      {block.note && <p className="mt-2 text-[11px] text-ink-500">{block.note}</p>}
    </section>
  );
}

/* -------------------------------- الخدمة -------------------------------- */

export function ServiceBlock({ block, onAction }: { block: AiServiceBlock; onAction: (action: AiClientAction) => void }) {
  const [availability, setAvailability] = useState<ServiceAvailability | null>(null);
  const [loading, setLoading] = useState(Boolean(block.city));

  useEffect(() => {
    if (!block.city) return;
    let cancelled = false;
    setLoading(true);
    availabilityApi
      .forCity({ city: block.city, district: block.district })
      .then((result) => {
        if (!cancelled) setAvailability(result);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [block.city, block.district]);

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-3" aria-label="خدمة">
      <header className="flex items-center gap-1.5">
        <Icon name="wrench" size={14} className="text-brand-700" />
        <p className="text-[12px] font-bold text-ink-800">{block.serviceType ? `خدمة: ${block.serviceType}` : "خدمة رواء"}</p>
      </header>

      {block.city && (
        <div className="mt-2 text-[11.5px] leading-6 text-ink-700">
          {loading ? (
            <Skeleton className="h-4 w-40" />
          ) : availability ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={availability.covered ? "success" : "neutral"}>
                {availability.covered
                  ? "مدينتك ضمن نطاق الخدمة"
                  : availability.source === "unavailable"
                    ? "التغطية غير مؤكدة حاليًا"
                    : "خارج نطاق الخدمة المسجّل"}
              </Badge>
              <span className="text-ink-600">{block.city}</span>
              {availability.source === "sample" && <span className="text-ink-400">(بيانات عرض)</span>}
            </div>
          ) : (
            <p className="text-ink-600">تعذّر التحقق من التغطية الآن — يتأكدها فريق رواء معك.</p>
          )}
        </div>
      )}

      {!block.city && <p className="mt-2 text-[11.5px] text-ink-600">أخبرني بمدينتك لأتحقق من التغطية والمواعيد.</p>}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onAction({ kind: "open_booking", serviceType: block.serviceType })}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-800"
        >
          <Icon name="calendar" size={11} />
          افتح الحجز مع تعبئة مسبقة
        </button>
        {block.serviceSlug && (
          <Link
            to={`/services/${block.serviceSlug}`}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-bold text-ink-800 transition hover:border-brand-300"
          >
            تفاصيل الخدمة
          </Link>
        )}
      </div>

      {block.note && <p className="mt-2 text-[11px] text-ink-500">{block.note}</p>}
    </section>
  );
}

/* -------------------------------- الطلب --------------------------------- */

export function OrderStatusBlock({ block }: { block: AiOrderBlock }) {
  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-3" aria-label="حالة طلب">
      <header className="flex items-center gap-1.5">
        <Icon name="package" size={14} className="text-brand-700" />
        <p className="text-[12px] font-bold text-ink-800">طلب {block.orderNumber}</p>
      </header>
      <p className="mt-1.5 text-[11.5px] leading-6 text-ink-600">
        تُعرض حالة الطلب من سجل الطلبات الرسمي فقط. افتح الطلب لرؤية آخر تحديث.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link
          to={`/account/orders/${encodeURIComponent(block.orderNumber)}`}
          className="inline-flex items-center gap-1 rounded-md bg-ink-950 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-ink-800"
        >
          تفاصيل الطلب
          <Icon name="arrowLeft" size={11} />
        </Link>
        <Link
          to="/help/track"
          className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-bold text-ink-800 transition hover:border-brand-300"
        >
          تتبع برقم الطلب
        </Link>
      </div>
      {block.note && <p className="mt-2 text-[11px] text-ink-500">{block.note}</p>}
    </section>
  );
}

/* -------------------------------- الصيانة -------------------------------- */

export function MaintenanceBlock({ block }: { block: AiMaintenanceBlock }) {
  const fallback = block.fallback;
  const product = block.productId ? resolveSummary(block.productId) : undefined;

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-3" aria-label="بطاقة صيانة">
      <header className="flex items-center gap-1.5">
        <Icon name="recycle" size={14} className="text-flow-600" />
        <p className="text-[12px] font-bold text-ink-800">الصيانة والقطع</p>
      </header>

      <dl className="mt-2 space-y-1 text-[11.5px] text-ink-700">
        {fallback?.deviceName && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">الجهاز</dt>
            <dd className="font-semibold">{fallback.deviceName}</dd>
          </div>
        )}
        {fallback?.lastChange && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">آخر تغيير</dt>
            <dd>{fallback.lastChange}</dd>
          </div>
        )}
        {fallback?.nextChange && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">التغيير القادم</dt>
            <dd>{fallback.nextChange}</dd>
          </div>
        )}
        {typeof fallback?.percentRemaining === "number" && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">المتبقي</dt>
            <dd>{Math.max(0, Math.round(fallback.percentRemaining))}%</dd>
          </div>
        )}
        {fallback?.cartridgeSetName && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">طقم القطع</dt>
            <dd className="font-semibold">{fallback.cartridgeSetName}</dd>
          </div>
        )}
      </dl>

      {!fallback && (
        <p className="mt-2 text-[11.5px] leading-6 text-ink-600">
          سجّل جهازك في حسابك لتصلك تذكيرات الصيانة تلقائيًا، أو أخبرني برقم الموديل لأحدد الطقم المناسب.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {product && (
          <Link
            to={`/p/${product.slug}`}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-bold text-ink-800 transition hover:border-brand-300"
          >
            عرض المنتج
          </Link>
        )}
        <Link
          to="/account?tab=maintenance"
          className="inline-flex items-center gap-1 rounded-md bg-ink-950 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-ink-800"
        >
          مركز الصيانة
          <Icon name="arrowLeft" size={11} />
        </Link>
      </div>

      {block.note && <p className="mt-2 text-[11px] text-ink-500">{block.note}</p>}
    </section>
  );
}

/* ----------------------------- التسليم البشري ---------------------------- */

export function HandoffBlock({
  block,
  onPrepare,
}: {
  block: AiHandoffBlock;
  onPrepare: (reason: string) => void;
}) {
  const { user } = useAuth();
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50/60 p-3" aria-label="تحويل لفريق الدعم">
      <header className="flex items-center gap-1.5">
        <Icon name="headset" size={14} className="text-brand-700" />
        <p className="text-[12px] font-bold text-ink-900">{block.topic || "متابعة بشرية"}</p>
      </header>
      <p className="mt-1.5 text-[11.5px] leading-6 text-ink-700">{block.summary}</p>

      {!user && (
        <p className="mt-2 text-[11px] leading-6 text-ink-600">
          لأسرع متابعة يمكنك تسجيل الدخول ليربط الفريق طلباتك — أو تابع كزائر عبر القناة الرسمية.
        </p>
      )}

      <button
        type="button"
        onClick={() => onPrepare(block.topic)}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-2 text-[11.5px] font-bold text-white transition hover:bg-brand-800"
      >
        <Icon name="headset" size={12} />
        جهّز ملخص المحادثة
      </button>
      <p className="mt-1.5 text-[10.5px] text-ink-500">لا يُرسل أي شيء قبل موافقتك على الملخص.</p>
    </section>
  );
}

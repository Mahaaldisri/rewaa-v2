import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/format";
import { maintenanceApi, type DeviceWithPlan } from "@/services/maintenanceApi";
import { adviceFor, buyAgainLine, deviceOptions, reminderPreview } from "@/lib/maintenance";
import { useStore } from "@/store/StoreProvider";
import { productApi } from "@/services/api";
import { cn } from "@/utils/cn";

const STATE_TONE: Record<string, { tone: "success" | "brand" | "danger"; bar: string }> = {
  ok: { tone: "success", bar: "bg-flow-500" },
  due_soon: { tone: "brand", bar: "bg-warning" },
  overdue: { tone: "danger", bar: "bg-danger" },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Maintenance centre — the customer’s own devices, their cartridge schedule and
 * the next actions (buy the right set, record a change, book a technician).
 * Reminder channels are configured here; nothing is actually sent yet and the
 * UI says so instead of pretending.
 */
export function MaintenanceCenter() {
  const { addToCart, pushToast } = useStore();
  const [devices, setDevices] = useState<DeviceWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const options = useMemo(() => deviceOptions(), []);
  const [form, setForm] = useState({
    deviceSlug: options[0]?.slug ?? "",
    installedAt: todayISO(),
    lastCartridgeChange: todayISO(),
    serial: "",
    city: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      setDevices(await maintenanceApi.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.deviceSlug) {
      pushToast({ tone: "warning", title: "اختر الجهاز أولًا" });
      return;
    }
    setBusy("add");
    try {
      const created = await maintenanceApi.add(form);
      setDevices((current) => [created, ...current]);
      setAdding(false);
      pushToast({ tone: "success", title: "تمت إضافة الجهاز إلى مركز الصيانة" });
    } finally {
      setBusy(null);
    }
  };

  const recordChange = async (id: string) => {
    setBusy(id);
    try {
      const updated = await maintenanceApi.recordChange(id, todayISO());
      if (updated) {
        setDevices((current) => current.map((entry) => (entry.device.id === id ? updated : entry)));
        pushToast({ tone: "success", title: "تم تحديث تاريخ تغيير الشمعات", duration: 2400 });
      }
    } finally {
      setBusy(null);
    }
  };

  const toggleChannel = async (id: string, channel: "whatsapp" | "sms" | "email") => {
    const entry = devices.find((item) => item.device.id === id);
    if (!entry) return;
    setBusy(id);
    try {
      const updated = await maintenanceApi.updateChannels(id, {
        [channel]: !entry.device.reminderChannels[channel],
      });
      if (updated) setDevices((current) => current.map((item) => (item.device.id === id ? updated : item)));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await maintenanceApi.remove(id);
      setDevices((current) => current.filter((entry) => entry.device.id !== id));
      pushToast({ tone: "info", title: "تم حذف الجهاز", duration: 2000 });
    } finally {
      setBusy(null);
    }
  };

  const buyAgain = async (slug: string) => {
    setBusy(slug);
    try {
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
      if (ok) pushToast({ tone: "success", title: "تمت إضافة الطقم إلى السلة" });
    } finally {
      setBusy(null);
    }
  };

  const deliveryReady = maintenanceApi.reminderDeliveryConfigured();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-extrabold text-ink-950">مركز الصيانة</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-6 text-ink-600">
            سجّل أجهزتك وتواريخ تركيبها وآخر تغيير للشمعات، وسنحسب المتبقي التقريبي من عمر الشمعة وموعد الاستبدال التالي
            حسب دورة الاستبدال المنشورة لكل جهاز في الكتالوج.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
        >
          <Icon name={adding ? "close" : "plus"} size={15} />
          {adding ? "إلغاء" : "أضف جهازًا"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="grid gap-3 rounded-xl border border-ink-100 bg-paper p-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">الجهاز</span>
            <select
              value={form.deviceSlug}
              onChange={(event) => setForm((prev) => ({ ...prev, deviceSlug: event.target.value }))}
              className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">تاريخ التركيب</span>
            <input
              type="date"
              value={form.installedAt}
              max={todayISO()}
              onChange={(event) => setForm((prev) => ({ ...prev, installedAt: event.target.value }))}
              className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">آخر تغيير للشمعات</span>
            <input
              type="date"
              value={form.lastCartridgeChange}
              max={todayISO()}
              onChange={(event) => setForm((prev) => ({ ...prev, lastCartridgeChange: event.target.value }))}
              className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">الرقم التسلسلي (اختياري)</span>
            <input
              value={form.serial}
              onChange={(event) => setForm((prev) => ({ ...prev, serial: event.target.value }))}
              placeholder="مكتوب على لوحة الجهاز أو بطاقة الضمان"
              className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink-700">المدينة (اختياري)</span>
            <input
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="لربط الزيارات بأقرب فرع"
              className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy === "add"}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
            >
              <Icon name="check" size={16} />
              {busy === "add" ? "جارٍ الحفظ…" : "حفظ الجهاز"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-ink-100 bg-surface p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Icon name="settings" size={22} />
          </span>
          <p className="mt-3 font-display text-[14px] font-extrabold text-ink-950">لا توجد أجهزة مسجّلة بعد</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-6 text-ink-600">
            أضف جهازك لتعرف موعد تغيير الشمعات القادم والطقم الصحيح له، أو اطلب زيارة فني لتركيبه أولًا.
          </p>
          <Link
            to="/services/book"
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-paper px-4 text-[12.5px] font-bold text-ink-700"
          >
            <Icon name="calendar" size={15} />
            احجز زيارة تركيب
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {devices.map(({ device, plan }) => {
            const tone = STATE_TONE[plan.state];
            const buyLine = plan.recommendedSet ? buyAgainLine(plan.recommendedSet.summary.slug) : undefined;
            return (
              <li key={device.id} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/p/${device.deviceSlug}`}
                        className="font-display text-[14.5px] font-extrabold text-ink-950 hover:text-brand-700"
                      >
                        {device.deviceName}
                      </Link>
                      <Badge tone={tone.tone} icon={plan.state === "ok" ? "checkCircle" : "clock"}>
                        {plan.stateLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-5 text-ink-500">
                      تركيب: {formatDate(device.installedAt)} · آخر تغيير للشمعات: {formatDate(device.lastCartridgeChange)} · دورة
                      الاستبدال {device.intervalMonths} شهرًا
                      {device.serial && ` · تسلسلي: ${device.serial}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(device.id)}
                    disabled={busy === device.id}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-paper px-3 text-[11.5px] font-semibold text-ink-500 transition hover:border-danger/30 hover:text-danger disabled:opacity-50"
                  >
                    <Icon name="trash" size={13} />
                    حذف
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold text-ink-600">
                    <span>العمر المتبقي التقريبي للشمعات</span>
                    <span className="tabular-nums">{plan.percentRemaining}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={plan.percentRemaining}
                    aria-label="العمر المتبقي التقريبي للشمعات"
                  >
                    <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${plan.percentRemaining}%` }} />
                  </div>
                  <p className="mt-1.5 text-[12px] leading-6 text-ink-600">
                    الموعد التالي المتوقع: <strong className="font-bold text-ink-900">{formatDate(plan.nextChangeAt)}</strong> ·{" "}
                    {adviceFor(plan)}
                  </p>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg border border-ink-100 bg-paper p-3">
                    <p className="text-[11.5px] font-bold text-ink-900">الطقم الصحيح لهذا الجهاز</p>
                    {plan.recommendedSet ? (
                      <>
                        <Link
                          to={`/p/${plan.recommendedSet.summary.slug}`}
                          className="mt-1 block text-[12.5px] font-bold text-brand-700 hover:underline"
                        >
                          {plan.recommendedSet.summary.name} — {formatMoney(plan.recommendedSet.summary.price)}
                        </Link>
                        <p className="mt-0.5 text-[11px] leading-5 text-ink-500">{plan.recommendedSet.note}</p>
                        {plan.alternatives.length > 0 && (
                          <p className="mt-1 text-[11px] leading-5 text-ink-500">
                            بدائل متوافقة: {plan.alternatives.map((item) => item.name).join(" · ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-[11.5px] leading-5 text-ink-500">
                        لم تُسجّل بيانات الكتالوج طقمًا لهذا الجهاز. أرسل صورة لوحة الجهاز لفريق الدعم ليتأكد.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-ink-100 bg-paper p-3">
                    <p className="text-[11.5px] font-bold text-ink-900">تذكير الاستبدال</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(
                        [
                          { key: "whatsapp" as const, label: "واتساب" },
                          { key: "sms" as const, label: "رسالة نصية" },
                          { key: "email" as const, label: "بريد إلكتروني" },
                        ]
                      ).map((channel) => (
                        <button
                          key={channel.key}
                          type="button"
                          onClick={() => void toggleChannel(device.id, channel.key)}
                          disabled={busy === device.id}
                          aria-pressed={device.reminderChannels[channel.key]}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                            device.reminderChannels[channel.key]
                              ? "border-flow-300 bg-flow-50 text-flow-800"
                              : "border-ink-200 bg-surface text-ink-500"
                          )}
                        >
                          {channel.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-5 text-ink-500">{reminderPreview(device, plan)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void recordChange(device.id)}
                    disabled={busy === device.id}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-4 text-[12px] font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
                  >
                    <Icon name="refresh" size={14} />
                    سجّل تغيير الشمعات اليوم
                  </button>
                  {buyLine && (
                    <button
                      type="button"
                      onClick={() => void buyAgain(plan.recommendedSet!.summary.slug)}
                      disabled={busy === plan.recommendedSet!.summary.slug}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-[12px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
                    >
                      <Icon name="cart" size={14} />
                      إعادة الشراء
                    </button>
                  )}
                  <Link
                    to="/services/book"
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-4 text-[12px] font-bold text-brand-800 transition hover:bg-brand-100"
                  >
                    <Icon name="wrench" size={14} />
                    احجز فنيًا
                  </Link>
                  <Link
                    to="/compatibility"
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 bg-paper px-4 text-[12px] font-bold text-ink-600 transition hover:bg-ink-50"
                  >
                    <Icon name="search" size={14} />
                    تحقّق من توافق قطعة
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!deliveryReady && (
        <p className="rounded-lg border border-ink-150 bg-paper p-3.5 text-[11.5px] leading-6 text-ink-500">
          <Icon name="info" size={12} className="inline" /> إعداد قنوات التذكير متاح الآن، أما الإرسال الفعلي فيتطلب ربط مزوّد
          رسائل من الخلفية. لن تصلك أي رسالة قبل تفعيل ذلك، والواجهة لا تدّعي إرسالها.
        </p>
      )}
    </div>
  );
}

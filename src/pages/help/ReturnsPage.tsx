import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { track } from "@/services/analytics";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { Accordion } from "@/components/common/Accordion";
import { CheckboxField, RadioCardGroup, TextArea, TextField } from "@/components/common/FormField";
import { returnsApi, returnReasonOptions, refundMethodOptions } from "@/services/helpApi";
import { faqsByGroup } from "@/data/content/faqs";
import { findLegalDocument } from "@/data/content/legal";
import { useStore } from "@/store/StoreProvider";
import { useAuth } from "@/store/AuthProvider";
import { usePageSeo } from "@/lib/seo";
import { hasErrors, phoneError, required } from "@/lib/validation";
import { formatMoney } from "@/lib/format";
import { shipping } from "@/config/site";

const RETURN_WINDOW_DAYS = shipping.returnWindowDays;
import type { Order } from "@/types/order";
import type { ReturnReason, ReturnRequest } from "@/types/service";

type Step = "lookup" | "select" | "details" | "done";

/** Returns & exchange flow — `/help/returns`. */
export function ReturnsPage() {
  const { pushToast } = useStore();
  const { user, isAuthenticated } = useAuth();
  const policy = findLegalDocument("returns");

  const [step, setStep] = useState<Step>("lookup");
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [refundMethod, setRefundMethod] = useState<"original" | "wallet" | "bank" | "">("");
  const [description, setDescription] = useState("");
  const [customerName, setName] = useState(isAuthenticated && user ? user.name : "");
  const [phone, setPhone] = useState(isAuthenticated && user ? user.phone : "");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<ReturnRequest | null>(null);

  usePageSeo({
    title: "الإرجاع والاستبدال | رواء",
    description: `سياسة الإرجاع خلال ${RETURN_WINDOW_DAYS} يومًا، وخطوات إنشاء طلب إرجاع مرتبط برقم الطلب.`,
    canonical: "/help/returns",
    robots: "noindex, nofollow",
  });

  const lookup = async () => {
    if (!orderNumber.trim()) {
      pushToast({ tone: "warning", title: "أدخل رقم الطلب" });
      return;
    }
    setLoading(true);
    setLookupError(null);
    try {
      const found = await returnsApi.findOrder(orderNumber);
      setOrder(found);
      setStep("select");
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "تعذّر العثور على الطلب.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (sku: string, quantity: number) => {
    setSelected((prev) => {
      if (prev[sku] !== undefined) {
        const next = { ...prev };
        delete next[sku];
        return next;
      }
      return { ...prev, [sku]: quantity };
    });
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!reason) next.reason = "اختر سبب الإرجاع";
    if (!refundMethod) next.refundMethod = "اختر طريقة الاسترداد";
    if (description.trim().length < 10) next.description = "اشرح الحالة باختصار (10 أحرف على الأقل)";
    const nameError = required(customerName, "الاسم");
    if (nameError) next.customerName = nameError;
    const phoneIssue = phoneError(phone);
    if (phoneIssue) next.phone = phoneIssue;
    if (!accepted) next.accepted = "يجب الإقرار بسياسة الإرجاع";

    setErrors(next);
    if (hasErrors(next)) {
      pushToast({ tone: "warning", title: "راجع الحقول", description: Object.values(next)[0] });
      return;
    }

    setSubmitting(true);
    try {
      const items = Object.entries(selected).map(([sku, quantity]) => {
        const item = order?.items.find((orderItem) => orderItem.sku === sku);
        return { name: item?.name ?? sku, quantity, sku };
      });
      const created = await returnsApi.create({
        orderNumber: order?.number ?? orderNumber,
        reason: reason as ReturnReason,
        items,
        description: description.trim(),
        customerName: customerName.trim(),
        phone: phone.trim(),
        refundMethod: refundMethod as "original" | "wallet" | "bank",
      });
      setRequest(created);
      track("submit_return", { reference: created.reference, reason: created.reasonLabel, order_number: created.orderNumber });
      setStep("done");
      pushToast({ tone: "success", title: "تم إنشاء طلب الإرجاع", description: `رقم الطلب ${created.reference}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "تعذّر إنشاء طلب الإرجاع",
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
              { label: "الإرجاع والاستبدال", href: "/help/returns" },
            ]}
          />
        </div>
      </div>

      <div className="container-x py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-extrabold text-ink-950">الإرجاع والاستبدال</h1>
          <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
            يمكنك طلب الإرجاع خلال {RETURN_WINDOW_DAYS} يومًا من الاستلام للمنتجات غير المستخدمة بحالتها الأصلية، وفق
            الشروط أدناه. إنشاء الطلب لا يستغرق أكثر من دقيقتين.
          </p>

          {/* Steps */}
          <ol className="mt-5 flex flex-wrap gap-2" aria-label="خطوات الإرجاع">
            {(
              [
                { id: "lookup", label: "رقم الطلب" },
                { id: "select", label: "اختيار الأصناف" },
                { id: "details", label: "بيانات الإرجاع" },
                { id: "done", label: "التأكيد" },
              ] as const
            ).map((item, index) => {
              const order = ["lookup", "select", "details", "done"];
              const currentIndex = order.indexOf(step);
              const state = order.indexOf(item.id) === currentIndex ? "current" : order.indexOf(item.id) < currentIndex ? "done" : "todo";
              return (
                <li key={item.id}>
                  <div
                    className={
                      "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold " +
                      (state === "current"
                        ? "border-brand-700 bg-brand-700 text-white"
                        : state === "done"
                          ? "border-flow-200 bg-flow-50 text-flow-700"
                          : "border-ink-200 bg-surface text-ink-400")
                    }
                  >
                    {state === "done" ? <Icon name="check" size={13} strokeWidth={3} /> : <span>{index + 1}</span>}
                    {item.label}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Step 1 */}
          {step === "lookup" && (
            <div className="mt-6 rounded-xl border border-ink-100 bg-surface p-5">
              <h2 className="font-display text-[15px] font-extrabold text-ink-950">ابدأ برقم الطلب</h2>
              <p className="mt-1.5 text-[12.5px] text-ink-500">
                تجده في رسالة التأكيد أو في{" "}
                <Link to="/account/orders" className="font-bold text-brand-700 underline decoration-dotted">
                  صفحة طلباتك
                </Link>
                .
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <TextField
                  className="flex-1"
                  label="رقم الطلب"
                  name="orderNumber"
                  value={orderNumber}
                  onChange={setOrderNumber}
                  placeholder="RWA-20260101-1001"
                  error={lookupError ?? undefined}
                />
                <button
                  type="button"
                  onClick={() => void lookup()}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      جارٍ البحث…
                    </>
                  ) : (
                    "متابعة"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === "select" && order && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-ink-100 bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[13px] font-bold text-ink-900">{order.number}</p>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      تاريخ الطلب{" "}
                      {new Date(order.createdAt).toLocaleDateString("ar-SA-u-nu-latn", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge tone="info" icon="truck">
                    {order.shippingLabel}
                  </Badge>
                </div>

                <fieldset className="mt-4">
                  <legend className="mb-2 text-[13px] font-bold text-ink-800">اختر الأصناف المطلوب إرجاعها</legend>
                  <ul className="divide-y divide-ink-100 rounded-lg border border-ink-150">
                    {order.items.map((item) => {
                      const checked = selected[item.sku] !== undefined;
                      return (
                        <li key={item.sku} className="flex items-center gap-3 p-3">
                          <input
                            type="checkbox"
                            id={`return-${item.sku}`}
                            checked={checked}
                            onChange={() => toggleItem(item.sku, item.quantity)}
                            className="size-4 shrink-0 rounded-xs border-ink-300 text-brand-700 focus:ring-brand-300"
                          />
                          <label htmlFor={`return-${item.sku}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="size-12 rounded-lg object-cover" loading="lazy" />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-bold text-ink-900">{item.name}</span>
                              <span className="mt-0.5 block text-[11.5px] text-ink-500">
                                {item.selectionLabel} · الكمية: {item.quantity} · {formatMoney(item.unitPrice)}
                              </span>
                            </span>
                          </label>
                          {checked && (
                            <label className="flex items-center gap-1.5 text-[11.5px] text-ink-600">
                              الكمية
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={selected[item.sku]}
                                onChange={(event) =>
                                  setSelected((prev) => ({
                                    ...prev,
                                    [item.sku]: Math.min(item.quantity, Math.max(1, Number(event.target.value) || 1)),
                                  }))
                                }
                                className="h-8 w-16 rounded-md border border-ink-200 px-2 text-center text-[12px] tabular-nums"
                              />
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("lookup");
                    setOrder(null);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[13px] font-bold text-ink-700"
                >
                  <Icon name="chevronRight" size={15} />
                  تغيير رقم الطلب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (Object.keys(selected).length === 0) {
                      pushToast({ tone: "warning", title: "اختر صنفًا واحدًا على الأقل" });
                      return;
                    }
                    setStep("details");
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-6 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                >
                  التالي
                  <Icon name="chevronLeft" size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === "details" && order && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-ink-100 bg-surface p-5">
                <h2 className="font-display text-[15px] font-extrabold text-ink-950">بيانات طلب الإرجاع</h2>

                <div className="mt-4 space-y-5">
                  <RadioCardGroup
                    legend="سبب الإرجاع"
                    name="reason"
                    columns={2}
                    value={reason}
                    onChange={(value) => setReason(value as ReturnReason)}
                    error={errors.reason}
                    options={returnReasonOptions.map((option) => ({ id: option.id, label: option.label }))}
                  />

                  <TextArea
                    label="تفاصيل إضافية"
                    name="description"
                    rows={4}
                    maxLength={500}
                    value={description}
                    onChange={setDescription}
                    error={errors.description}
                    placeholder="مثال: المنتج وصل بعلبة ممزقة، والجهاز يعمل لكن الضغط مرتفع بشكل غير طبيعي."
                  />

                  <RadioCardGroup
                    legend="طريقة استرداد المبلغ"
                    name="refundMethod"
                    columns={2}
                    value={refundMethod}
                    onChange={(value) => setRefundMethod(value as "original" | "wallet" | "bank")}
                    error={errors.refundMethod}
                    options={refundMethodOptions.map((option) => ({ id: option.id, label: option.label }))}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="الاسم"
                      name="customerName"
                      required
                      value={customerName}
                      onChange={setName}
                      error={errors.customerName}
                    />
                    <TextField
                      label="رقم الجوال"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={setPhone}
                      error={errors.phone}
                      placeholder="05XXXXXXXX"
                    />
                  </div>

                  <CheckboxField
                    checked={accepted}
                    onChange={setAccepted}
                    error={errors.accepted}
                    label={
                      <>
                        أقرّ بأن الأصناف بحالتها الأصلية وبكامل محتوياتها، وأوافق على{" "}
                        <Link to="/legal/returns" className="font-bold text-brand-700 underline decoration-dotted">
                          سياسة الإرجاع
                        </Link>
                        .
                      </>
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-4 text-[13px] font-bold text-ink-700"
                >
                  <Icon name="chevronRight" size={15} />
                  السابق
                </button>
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
                      إرسال طلب الإرجاع
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === "done" && request && (
            <div className="mt-6 rounded-xl border border-ink-100 bg-surface p-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-flow-50 text-flow-600 ring-1 ring-flow-200">
                <Icon name="checkCircle" size={30} />
              </span>
              <h2 className="mt-4 font-display text-xl font-extrabold text-ink-950">تم إنشاء طلب الإرجاع</h2>
              <p className="mt-2 text-[13px] leading-7 text-ink-600">
                سنتواصل معك على {request.phone} لجدولة استلام الشحنة. بعد استلام القطع وفحصها يبدأ احتساب مدة
                الاسترداد المتوقعة {request.estimatedRefundDays} أيام عمل عبر: {request.refundLabel}.
              </p>
              <p className="mt-4 font-mono text-[15px] font-extrabold tracking-wider text-ink-950">{request.reference}</p>

              <ul className="mx-auto mt-5 max-w-md space-y-2 text-start">
                {request.items.map((item) => (
                  <li key={item.sku} className="flex items-center justify-between rounded-lg border border-ink-150 bg-paper px-3 py-2">
                    <span className="text-[12.5px] font-semibold text-ink-800">{item.name}</span>
                    <span className="text-[12px] text-ink-500 tabular-nums">× {item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <Link
                  to="/contact/whatsapp"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-flow-600 px-5 text-[13px] font-bold text-white transition hover:bg-flow-700"
                >
                  <Icon name="whatsapp" size={16} />
                  تابع الطلب على واتساب
                </Link>
                <Link
                  to="/account"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
                >
                  طلباتي
                </Link>
              </div>
            </div>
          )}

          {/* Policy */}
          <section className="mt-10">
            <h2 className="font-display text-[16px] font-extrabold text-ink-950">سياسة الإرجاع باختصار</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { title: "المدة", body: `${RETURN_WINDOW_DAYS} يومًا من تاريخ الاستلام.` },
                { title: "الحالة المطلوبة", body: "المنتج غير مستخدم وبكامل محتوياته وملحقاته وتغليفه الأصلي." },
                { title: "الاستثناءات", body: "الشمعات والقطع الاستهلاكية بعد فتح الغلاف لا تُقبل لأسباب صحية." },
                { title: "مصاريف الشحن", body: "عيب مصنعي: على حسابنا. إرجاع بسبب تغيير الرأي: على العميل." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-ink-100 bg-surface p-4">
                  <h3 className="font-display text-[13px] font-bold text-ink-950">{item.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-6 text-ink-600">{item.body}</p>
                </div>
              ))}
            </div>

            {policy && (
              <Link
                to={`/legal/${policy.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-700 underline decoration-dotted"
              >
                اقرأ السياسة الكاملة ({policy.sections.length} بنودًا)
                <Icon name="arrowLeft" size={13} />
              </Link>
            )}
          </section>

          {/* FAQs */}
          <section className="mt-8">
            <h2 className="font-display text-[16px] font-extrabold text-ink-950">أسئلة عن الإرجاع</h2>
            <Accordion
              className="mt-3"
              items={faqsByGroup("returns").map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

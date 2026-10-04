import { useMemo, useState } from "react";
import type { PaymentMethodId } from "@/types/order";
import { ApiError } from "@/types/product";
import { authApi } from "@/services/api";
import { payments, DEMO_TEST_CARDS, type PaymentToken } from "@/services/payments";
import { useStore } from "@/store/StoreProvider";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { PaymentGlyph } from "@/components/product/PaymentMethods";
import { cn } from "@/utils/cn";

/* ------------------------------- Helpers -------------------------------- */

function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectBrand(number: string): "visa" | "mastercard" | "mada" | "unknown" {
  const first = number.replace(/\D/g, "")[0];
  if (first === "4") return "visa";
  if (first === "5" || first === "2") return "mastercard";
  return "unknown";
}

function expiryValid(expiry: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiryDate = new Date(year, month, 0);
  return expiryDate >= new Date(now.getFullYear(), now.getMonth(), 1);
}

/* ------------------------------ Method list ------------------------------ */

interface MethodDef {
  id: PaymentMethodId;
  label: string;
  group: "card" | "wallet" | "bnpl" | "cod" | "bank";
  note?: string;
}

const ALL_METHODS: MethodDef[] = [
  { id: "mada", label: "مدى", group: "card" },
  { id: "visa", label: "فيزا / ماستركارد", group: "card" },
  { id: "applepay", label: "Apple Pay", group: "wallet", note: "دفع بلمسة واحدة" },
  { id: "stcpay", label: "stc pay", group: "wallet", note: "عبر رقم جوالك" },
  { id: "tabby", label: "تابي — قسّمها على 4", group: "bnpl", note: "بدون فوائد" },
  { id: "tamara", label: "تمارا — قسّمها على 3", group: "bnpl", note: "بدون فوائد" },
  { id: "cod", label: "الدفع عند الاستلام", group: "cod", note: "رسوم 20 ر.س" },
  { id: "bank", label: "تحويل بنكي", group: "bank", note: "للمنشآت والفواتير" },
];

interface Props {
  total: number;
  onBack: () => void;
  /** Receives an opaque token + a safe label. Raw card data never leaves this component. */
  onContinue: (methodId: PaymentMethodId, label: string, token: PaymentToken) => void;
}

export function PaymentStep({ total, onBack, onContinue }: Props) {
  const { pushToast } = useStore();
  const provider = payments.current();
  const usableMethods = useMemo(() => payments.status().methods, []);
  const cardEnabled = provider.cardFormMode !== "none";
  const [method, setMethod] = useState<PaymentMethodId>(usableMethods[0] ?? "cod");
  const [tokenizing, setTokenizing] = useState(false);

  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [cardErrors, setCardErrors] = useState<Partial<typeof card>>({});

  const [walletConfirmed, setWalletConfirmed] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const [stcPhone, setStcPhone] = useState("");
  const [stcCode, setStcCode] = useState("");
  const [stcSentCode, setStcSentCode] = useState<string | null>(null);
  const [stcVerified, setStcVerified] = useState(false);
  const [stcSending, setStcSending] = useState(false);
  const [stcVerifying, setStcVerifying] = useState(false);

  const [bnplAgreed, setBnplAgreed] = useState(false);
  const [codAgreed, setCodAgreed] = useState(false);
  const [bankAgreed, setBankAgreed] = useState(false);

  const METHODS = useMemo(
    () => ALL_METHODS.filter((m) => usableMethods.includes(m.id)).filter((m) => m.group !== "card" || cardEnabled),
    [usableMethods, cardEnabled]
  );
  const activeDef = METHODS.find((m) => m.id === method) ?? METHODS[0];
  const brand = detectBrand(card.number);

  const changeMethod = (id: PaymentMethodId) => {
    setMethod(id);
    setWalletConfirmed(false);
  };

  const validateCard = (): boolean => {
    const next: Partial<typeof card> = {};
    const digits = card.number.replace(/\D/g, "");

    if (provider.id === "demo") {
      // Sandbox: only documented test numbers are accepted, so a real card can
      // never be typed into a demo build.
      const known = DEMO_TEST_CARDS.some((entry) => entry.number === digits);
      if (!known) next.number = "أدخل رقم بطاقة اختبار موضح أعلاه — لا تستخدم بطاقة حقيقية";
    } else if (!luhnValid(card.number)) {
      next.number = "رقم البطاقة غير صحيح";
    }

    if (card.name.trim().length < 3) next.name = "أدخل الاسم كما يظهر على البطاقة";
    if (!expiryValid(card.expiry)) next.expiry = "تاريخ الانتهاء غير صحيح";
    if (!/^\d{3,4}$/.test(card.cvv)) next.cvv = "رمز الأمان غير صحيح";
    setCardErrors(next);
    return Object.keys(next).length === 0;
  };

  const confirmWallet = () => {
    setWalletLoading(true);
    window.setTimeout(() => {
      setWalletLoading(false);
      setWalletConfirmed(true);
      pushToast({
        tone: "success",
        title: activeDef.label + " جاهز",
        description: "تم تأكيد وسيلة الدفع بنجاح.",
        duration: 2400,
      });
    }, 1100);
  };

  const sendStcOtp = async () => {
    if (!/^0?5\d{8}$/.test(stcPhone.replace(/\s/g, ""))) {
      pushToast({ tone: "warning", title: "أدخل رقم جوال صحيح أولًا" });
      return;
    }
    setStcSending(true);
    try {
      const res = await authApi.sendOtp(stcPhone);
      setStcSentCode(res.demoCode);
      pushToast({
        tone: "info",
        title: "تم إرسال رمز التحقق",
        description: `(تجريبي) الرمز: ${res.demoCode}`,
        duration: 6000,
      });
    } finally {
      setStcSending(false);
    }
  };

  const verifyStcOtp = async () => {
    setStcVerifying(true);
    try {
      await authApi.verifyOtp(stcPhone, stcCode);
      setStcVerified(true);
      pushToast({ tone: "success", title: "تم ربط stc pay بنجاح", duration: 2400 });
    } catch {
      pushToast({ tone: "error", title: "رمز التحقق غير صحيح" });
    } finally {
      setStcVerifying(false);
    }
  };

  const canContinue = useMemo(() => {
    switch (activeDef.group) {
      case "card":
        return true; // validated on submit
      case "wallet":
        return method === "stcpay" ? stcVerified : walletConfirmed;
      case "bnpl":
        return bnplAgreed;
      case "cod":
        return codAgreed;
      case "bank":
        return bankAgreed;
      default:
        return false;
    }
  }, [activeDef.group, method, stcVerified, walletConfirmed, bnplAgreed, codAgreed, bankAgreed]);

  const handleContinue = async () => {
    const labels: Partial<Record<PaymentMethodId, string>> = {
      applepay: "Apple Pay",
      stcpay: `stc pay — ${stcPhone}`,
      tabby: "تابي — 4 دفعات",
      tamara: "تمارا — 3 دفعات",
      cod: "الدفع عند الاستلام",
      bank: "تحويل بنكي",
    };

    try {
      setTokenizing(true);

      if (activeDef.group === "card") {
        if (!validateCard()) return;
        // Card values are handed to the provider and immediately forgotten —
        // we only keep the opaque token it returns.
        const token = await payments.tokenizeCard(
          { cardNumber: card.number, holderName: card.name, expiry: card.expiry, cvv: card.cvv },
          method
        );
        setCard({ number: "", name: "", expiry: "", cvv: "" });
        onContinue(method, token.label, token);
        return;
      }

      if (!canContinue) {
        pushToast({ tone: "warning", title: "أكمل خطوات الدفع أولًا" });
        return;
      }

      if (activeDef.group === "wallet") {
        const reference = method === "stcpay" ? `stc pay — ${stcPhone}` : labels[method] ?? activeDef.label;
        const token = await payments.tokenizeWallet(method, reference);
        onContinue(method, reference, token);
        return;
      }

      // Cash on delivery / bank transfer need no token; the method itself is the reference.
      const token = await payments.tokenizeWallet(method, labels[method] ?? activeDef.label);
      onContinue(method, labels[method] ?? activeDef.label, token);
    } catch (error) {
      pushToast({
        tone: "error",
        title: error instanceof ApiError ? error.message : "تعذّر تجهيز عملية الدفع",
      });
    } finally {
      setTokenizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment provider status — wording matches reality: no gateway claim unless one is connected. */}
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border p-3.5 text-[12px] leading-5",
          provider.live
            ? "border-flow-200 bg-flow-50 text-flow-900"
            : provider.id === "demo"
              ? "border-warning/25 bg-warning-soft text-ink-800"
              : "border-ink-150 bg-paper text-ink-600"
        )}
      >
        <Icon name={provider.live ? "shield" : provider.id === "demo" ? "alert" : "info"} size={15} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">
            {provider.live ? "بوابة دفع متصلة" : provider.id === "demo" ? "وضع تجريبي — لا يوجد تحصيل" : "الدفع الإلكتروني غير مفعّل"}
          </p>
          <p className="mt-0.5">{provider.notice}</p>
          {provider.id === "demo" && (
            <p className="mt-1 font-mono text-[11px]" dir="ltr">
              {DEMO_TEST_CARDS.map((card) => card.number).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="طريقة الدفع">
        {METHODS.map((def) => {
          const isSelected = method === def.id;
          return (
            <button
              key={def.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => changeMethod(def.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-start transition",
                isSelected ? "border-brand-600 bg-brand-50/50 shadow-hair" : "border-ink-100 bg-surface hover:border-ink-300"
              )}
            >
              <PaymentGlyph id={def.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-ink-900">{def.label}</span>
                {def.note && <span className="block text-[10.5px] text-ink-400">{def.note}</span>}
              </span>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2",
                  isSelected ? "border-brand-700 bg-brand-700" : "border-ink-300"
                )}
              >
                {isSelected && <span className="size-2 rounded-full bg-white" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------- Card form ------------------------------- */}
      {activeDef.group === "card" && provider.cardFormMode === "hosted-fields" && (
        <div className="rounded-xl border border-ink-100 bg-surface p-4">
          <h3 className="font-display text-[13.5px] font-bold text-ink-900">بيانات البطاقة</h3>
          <p className="mt-1 text-[12px] leading-5 text-ink-600">
            تُدخل بيانات البطاقة داخل حقول بوابة الدفع المستضافة، ولا تمر عبر خوادم المتجر.
          </p>
          {/* The gateway SDK mounts its own iframes into this container. */}
          <div id="rewaa-payment-fields" data-testid="payment-fields" className="mt-3 min-h-[120px] rounded-lg border border-dashed border-ink-200 bg-paper" />
        </div>
      )}

      {activeDef.group === "card" && provider.cardFormMode === "app-form" && (
        <div className="rounded-xl border border-ink-100 bg-surface p-4 animate-fade">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[13.5px] font-bold text-ink-900">بيانات البطاقة</h3>
            {brand !== "unknown" && <PaymentGlyph id={brand} />}
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">رقم البطاقة</span>
              <input
                value={card.number}
                onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                dir="ltr"
                className={cn(
                  "h-11 w-full rounded-md border bg-surface px-3 font-mono text-[14px] tracking-wider focus:outline-none focus:ring-2",
                  cardErrors.number ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                )}
              />
              {cardErrors.number && <p className="mt-1 text-[11px] text-danger">{cardErrors.number}</p>}
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">الاسم على البطاقة</span>
              <input
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                placeholder="AHMAD ALI"
                dir="ltr"
                className={cn(
                  "h-11 w-full rounded-md border bg-surface px-3 text-[13px] uppercase focus:outline-none focus:ring-2",
                  cardErrors.name ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                )}
              />
              {cardErrors.name && <p className="mt-1 text-[11px] text-danger">{cardErrors.name}</p>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-700">تاريخ الانتهاء</span>
                <input
                  value={card.expiry}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  dir="ltr"
                  className={cn(
                    "h-11 w-full rounded-md border bg-surface px-3 font-mono text-[13px] focus:outline-none focus:ring-2",
                    cardErrors.expiry ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                  )}
                />
                {cardErrors.expiry && <p className="mt-1 text-[11px] text-danger">{cardErrors.expiry}</p>}
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-ink-700">
                  رمز الأمان CVV
                  <Icon name="info" size={11} className="text-ink-400" />
                </span>
                <input
                  value={card.cvv}
                  onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="•••"
                  inputMode="numeric"
                  dir="ltr"
                  type="password"
                  className={cn(
                    "h-11 w-full rounded-md border bg-surface px-3 font-mono text-[13px] focus:outline-none focus:ring-2",
                    cardErrors.cvv ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                  )}
                />
                {cardErrors.cvv && <p className="mt-1 text-[11px] text-danger">{cardErrors.cvv}</p>}
              </label>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
            <Icon name="info" size={12} className="text-warning" />
            هذه حقول تجريبية لاختبار التدفق فقط: لا توجد بوابة دفع متصلة، ولا يُرسل أي رقم بطاقة حقيقي أو يُخزَّن.
          </p>
        </div>
      )}

      {/* ------------------------------ Apple / Google ---------------------------- */}
      {activeDef.group === "wallet" && method === "applepay" && (
        <div className="rounded-xl border border-ink-100 bg-surface p-5 text-center animate-fade">
          {walletConfirmed ? (
            <p className="flex items-center justify-center gap-2 font-semibold text-success">
              <Icon name="check" size={18} strokeWidth={2.6} />
              {provider.live ? "تم تأكيد الدفع عبر Apple Pay" : "تمت محاكاة الدفع عبر Apple Pay"}
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12.5px] text-ink-500">
                {provider.live
                  ? "سيُطلب منك تأكيد الدفع داخل نافذة المحفظة الرسمية."
                  : "محاكاة تأكيد المحفظة في الوضع التجريبي — لا تتم أي عملية دفع حقيقية."}
              </p>
              <button
                type="button"
                onClick={confirmWallet}
                disabled={walletLoading}
                className="mx-auto flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-black px-5 font-bold text-white transition hover:bg-ink-900 disabled:opacity-70"
              >
                {walletLoading ? <Icon name="refresh" size={16} className="animate-spin-slow" /> : <PaymentGlyph id="applepay" />}
                {walletLoading ? "جارٍ التأكيد…" : provider.live ? `ادفع ${formatMoney(total)}` : "محاكاة الدفع"}
              </button>
            </>
          )}
        </div>
      )}

      {/* --------------------------------- stc pay -------------------------------- */}
      {activeDef.group === "wallet" && method === "stcpay" && (
        <div className="space-y-3 rounded-xl border border-ink-100 bg-surface p-4 animate-fade">
          {stcVerified ? (
            <p className="flex items-center gap-2 font-semibold text-success">
              <Icon name="check" size={18} strokeWidth={2.6} />
              تم ربط رقم {stcPhone} عبر stc pay بنجاح
            </p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-700">رقم الجوال المسجَّل في stc pay</span>
                <div className="flex gap-2">
                  <input
                    value={stcPhone}
                    onChange={(e) => setStcPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    inputMode="numeric"
                    className="h-11 flex-1 rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <button
                    type="button"
                    onClick={sendStcOtp}
                    disabled={stcSending}
                    className="h-11 shrink-0 rounded-md bg-ink-950 px-4 text-[12.5px] font-bold text-aqua-200 transition hover:bg-ink-900 disabled:opacity-70"
                  >
                    {stcSending ? "جارٍ الإرسال…" : "إرسال الرمز"}
                  </button>
                </div>
              </label>
              {stcSentCode && (
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-700">رمز التحقق (OTP)</span>
                  <div className="flex gap-2">
                    <input
                      value={stcCode}
                      onChange={(e) => setStcCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="XXXX"
                      dir="ltr"
                      inputMode="numeric"
                      className="h-11 w-32 rounded-md border border-ink-200 bg-surface px-3 text-center font-mono text-[15px] tracking-[0.4em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                    <button
                      type="button"
                      onClick={verifyStcOtp}
                      disabled={stcVerifying || stcCode.length < 4}
                      className="h-11 flex-1 rounded-md bg-brand-700 text-[12.5px] font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
                    >
                      {stcVerifying ? "جارٍ التحقق…" : "تأكيد الرمز"}
                    </button>
                  </div>
                </label>
              )}
            </>
          )}
        </div>
      )}

      {/* --------------------------------- BNPL ----------------------------------- */}
      {activeDef.group === "bnpl" && (
        <div className="space-y-3 rounded-xl border border-aqua-200 bg-aqua-50/40 p-4 animate-fade">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: method === "tabby" ? 4 : 3 }).map((_, i) => (
              <div key={i} className="rounded-md bg-surface p-2.5 text-center shadow-hair">
                <p className="text-[10px] text-ink-400">دفعة {i + 1}</p>
                <p className="font-display text-[13px] font-extrabold tabular-nums text-ink-900">
                  {formatMoney(total / (method === "tabby" ? 4 : 3))}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] leading-5 text-ink-600">
            الدفعة الأولى تُخصم اليوم، والباقي يُخصم تلقائيًا من البطاقة المسجّلة لديك شهريًا بدون أي فوائد أو رسوم
            إضافية. تخضع الموافقة لتقييم {method === "tabby" ? "تابي" : "تمارا"} الفوري.
          </p>
          <label className="flex items-center gap-2 text-[12px] text-ink-700">
            <input
              type="checkbox"
              checked={bnplAgreed}
              onChange={(e) => setBnplAgreed(e.target.checked)}
              className="size-4 accent-[var(--color-brand-700)]"
            />
            أوافق على شروط {method === "tabby" ? "تابي" : "تمارا"} لتقسيط المبلغ
          </label>
        </div>
      )}

      {/* --------------------------------- COD ------------------------------------ */}
      {activeDef.group === "cod" && (
        <div className="space-y-3 rounded-xl border border-warning/25 bg-warning-soft/40 p-4 animate-fade">
          <p className="flex items-start gap-2 text-[12.5px] leading-5 text-ink-700">
            <Icon name="info" size={15} className="mt-0.5 shrink-0 text-warning" />
            يُضاف رسم 20 ر.س على الدفع عند الاستلام. يُرجى تجهيز المبلغ نقدًا أو عبر جهاز الدفع مع المندوب.
          </p>
          <label className="flex items-center gap-2 text-[12px] text-ink-700">
            <input
              type="checkbox"
              checked={codAgreed}
              onChange={(e) => setCodAgreed(e.target.checked)}
              className="size-4 accent-[var(--color-brand-700)]"
            />
            موافق على رسوم الدفع عند الاستلام
          </label>
        </div>
      )}

      {/* -------------------------------- Bank transfer ----------------------------- */}
      {activeDef.group === "bank" && (
        <div className="space-y-3 rounded-xl border border-ink-100 bg-surface p-4 animate-fade">
          <div className="space-y-1.5 rounded-md bg-ink-50 p-3 font-mono text-[12.5px] text-ink-700" dir="ltr">
            <p>IBAN: SA03 8000 0000 6080 1016 7519</p>
            <p>Bank: Al Rajhi Bank</p>
            <p>Account name: Rewaa Water Technologies Est.</p>
          </div>
          <p className="text-[11.5px] leading-5 text-ink-500">
            يُرجى تحويل المبلغ خلال 24 ساعة وإرسال صورة الإيصال عبر واتساب 920001234 مع رقم الطلب لتفعيل الشحن.
          </p>
          <label className="flex items-center gap-2 text-[12px] text-ink-700">
            <input
              type="checkbox"
              checked={bankAgreed}
              onChange={(e) => setBankAgreed(e.target.checked)}
              className="size-4 accent-[var(--color-brand-700)]"
            />
            سأقوم بالتحويل خلال 24 ساعة
          </label>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          <Icon name="arrowRight" size={16} />
          رجوع
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={tokenizing}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60"
        >
          {tokenizing ? (
            <>
              <Icon name="refresh" size={16} className="animate-spin-slow" />
              جارٍ تجهيز الدفع…
            </>
          ) : (
            <>
              مراجعة الطلب
              <Icon name="arrowLeft" size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

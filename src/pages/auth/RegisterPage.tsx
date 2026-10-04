import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { authApi } from "@/services/api";
import { ApiError } from "@/types/product";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

type Stage = "form" | "otp";

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/account";
  const { register } = useAuth();
  const { pushToast } = useStore();

  const [stage, setStage] = useState<Stage>("form");
  const [fields, setFields] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<typeof fields>>({});
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const set = <K extends keyof typeof fields>(key: K, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<typeof fields> = {};
    if (fields.name.trim().length < 3) next.name = "أدخل اسمك الكامل";
    if (!/\S+@\S+\.\S+/.test(fields.email)) next.email = "بريد إلكتروني غير صحيح";
    if (!/^0?5\d{8}$/.test(fields.phone.replace(/\s/g, ""))) next.phone = "رقم جوال سعودي غير صحيح";
    if (fields.password.length < 6) next.password = "6 أحرف على الأقل";
    if (fields.confirm !== fields.password) next.confirm = "كلمتا المرور غير متطابقتين";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.sendOtp(fields.phone);
      setDemoCode(res.demoCode);
      setStage("otp");
      pushToast({
        tone: "info",
        title: "تم إرسال رمز التحقق إلى جوالك",
        description: `(تجريبي) الرمز: ${res.demoCode}`,
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setVerifying(true);
    try {
      await authApi.verifyOtp(fields.phone, otp);
      const user = await register({
        name: fields.name,
        email: fields.email,
        phone: fields.phone,
        password: fields.password,
      });
      pushToast({ tone: "success", title: `مرحبًا بك في رواء، ${user.name.split(" ")[0]} 🎉`, duration: 3000 });
      navigate(redirect, { replace: true });
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : "تعذّر إتمام التسجيل.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-ambient flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-lift sm:p-8">
          {stage === "form" ? (
            <>
              <h1 className="font-display text-xl font-extrabold text-ink-950">إنشاء حساب جديد</h1>
              <p className="mt-1.5 text-[12.5px] text-ink-500">
                انضم إلى رواء لتتبّع طلباتك، حفظ عناوينك، وإدارة باقات الصيانة بسهولة.
              </p>

              <form onSubmit={handleSubmitForm} className="mt-5 space-y-3.5" noValidate>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-700">الاسم الكامل</span>
                  <input
                    value={fields.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={cn(
                      "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
                      errors.name ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                    )}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name}</p>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-700">البريد الإلكتروني</span>
                  <input
                    type="email"
                    value={fields.email}
                    onChange={(e) => set("email", e.target.value)}
                    dir="ltr"
                    className={cn(
                      "h-11 w-full rounded-md border bg-surface px-3 text-end text-[13px] focus:outline-none focus:ring-2",
                      errors.email ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                    )}
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-danger">{errors.email}</p>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-700">رقم الجوال</span>
                  <input
                    value={fields.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    inputMode="numeric"
                    className={cn(
                      "h-11 w-full rounded-md border bg-surface px-3 text-end text-[13px] focus:outline-none focus:ring-2",
                      errors.phone ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                    )}
                  />
                  {errors.phone && <p className="mt-1 text-[11px] text-danger">{errors.phone}</p>}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-ink-700">كلمة المرور</span>
                    <input
                      type="password"
                      value={fields.password}
                      onChange={(e) => set("password", e.target.value)}
                      dir="ltr"
                      className={cn(
                        "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
                        errors.password ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                      )}
                    />
                    {errors.password && <p className="mt-1 text-[11px] text-danger">{errors.password}</p>}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-ink-700">تأكيد كلمة المرور</span>
                    <input
                      type="password"
                      value={fields.confirm}
                      onChange={(e) => set("confirm", e.target.value)}
                      dir="ltr"
                      className={cn(
                        "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
                        errors.confirm ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                      )}
                    />
                    {errors.confirm && <p className="mt-1 text-[11px] text-danger">{errors.confirm}</p>}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:opacity-70"
                >
                  {loading && <Icon name="refresh" size={16} className="animate-spin-slow" />}
                  {loading ? "جارٍ إرسال الرمز…" : "متابعة"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStage("form")}
                className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-brand-700"
              >
                <Icon name="arrowRight" size={14} />
                تعديل البيانات
              </button>
              <h1 className="font-display text-xl font-extrabold text-ink-950">تحقّق من رقم جوالك</h1>
              <p className="mt-1.5 text-[12.5px] leading-5 text-ink-500">
                أرسلنا رمزًا مكوّنًا من 4 أرقام إلى <bdi className="font-semibold text-ink-800">{fields.phone}</bdi>
              </p>
              {demoCode && (
                <p className="mt-2 flex items-center gap-1.5 rounded-md bg-aqua-50 px-3 py-2 text-[11.5px] text-aqua-800">
                  <Icon name="info" size={13} />
                  رمز تجريبي للعرض فقط: <span className="font-mono font-bold">{demoCode}</span>
                </p>
              )}

              <form onSubmit={handleVerify} className="mt-4 space-y-3.5">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="XXXX"
                  dir="ltr"
                  inputMode="numeric"
                  autoFocus
                  className="h-14 w-full rounded-md border border-ink-200 bg-surface text-center font-mono text-2xl tracking-[0.5em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                {otpError && (
                  <p className="flex items-center gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-[12px] text-danger">
                    <Icon name="alert" size={14} />
                    {otpError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={verifying || otp.length < 4}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:opacity-50"
                >
                  {verifying && <Icon name="refresh" size={16} className="animate-spin-slow" />}
                  {verifying ? "جارٍ إنشاء الحساب…" : "تأكيد وإنشاء الحساب"}
                </button>
              </form>
            </>
          )}

          {stage === "form" && (
            <p className="mt-5 text-center text-[12.5px] text-ink-500">
              لديك حساب بالفعل؟{" "}
              <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-brand-700 hover:underline">
                سجّل الدخول
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/services/api";
import { ApiError } from "@/types/product";
import { useStore } from "@/store/StoreProvider";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/common/FormField";
import { emailError, passwordStrength, phoneError } from "@/lib/validation";
import { usePageSeo } from "@/lib/seo";
import { cn } from "@/utils/cn";

type Step = "identifier" | "code" | "password" | "done";

interface Props {
  /** `reset` opens directly on the code step (used by `/reset-password` links). */
  mode?: "request" | "reset";
}

/** Mock password recovery — 3 steps with real validation, never fakes security. */
export function ForgotPasswordPage({ mode = "request" }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pushToast } = useStore();

  const [step, setStep] = useState<Step>(() => (mode === "reset" && params.get("id") ? "code" : "identifier"));
  const [identifier, setIdentifier] = useState(() => params.get("id") ?? "");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(password);

  usePageSeo({
    title: "استعادة كلمة المرور | رواء",
    description: "استعد كلمة مرور حسابك في رواء عبر رمز تحقق يُرسل إلى جوالك المسجّل.",
    canonical: mode === "reset" ? "/reset-password" : "/forgot-password",
    robots: "noindex, follow",
  });

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const looksLikeEmail = identifier.includes("@");
    const problem = looksLikeEmail ? emailError(identifier) : phoneError(identifier);
    if (!identifier.trim()) {
      setError("أدخل بريدك الإلكتروني أو رقم جوالك");
      return;
    }
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.requestPasswordReset(identifier);
      setDemoCode(result.demoCode);
      setSentTo(result.sentTo);
      setStep("code");
      pushToast({
        tone: "info",
        title: "تم إرسال رمز التحقق",
        description: "الرمز صالح لهذه الجلسة فقط، ولا يظهر في النسخة الحقيقية.",
        duration: 3200,
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "تعذّر إرسال الرمز، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (code.length < 4) {
      setError("أدخل الرمز المكوّن من 4 أرقام");
      return;
    }
    setStep("password");
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (strength.score < 2) {
      setError("اختر كلمة مرور أقوى: 8 أحرف على الأقل مع أرقام وحروف.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setBusy(true);
    try {
      await authApi.resetPassword(identifier, code, password);
      setStep("done");
      pushToast({ tone: "success", title: "تم تحديث كلمة المرور", duration: 2600 });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "تعذّر تحديث كلمة المرور.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-ambient">
      <div className="container-x py-10 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-center">
            <Logo />
          </div>

          <div className="mt-6 rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair sm:p-6">
            <ol className="mb-5 flex items-center gap-1.5" aria-label="خطوات الاستعادة">
              {(["identifier", "code", "password"] as Step[]).map((item, index) => {
                const order = { identifier: 0, code: 1, password: 2, done: 3 } as Record<Step, number>;
                const done = order[step] > index || step === "done";
                const active = step === item;
                return (
                  <li key={item} className="flex flex-1 items-center gap-1.5">
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                        done ? "bg-flow-600 text-white" : active ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-400"
                      )}
                    >
                      {done ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}
                    </span>
                    {index < 2 && <span className={cn("h-0.5 flex-1 rounded", done ? "bg-flow-500" : "bg-ink-150")} />}
                  </li>
                );
              })}
            </ol>

            {step === "identifier" && (
              <form onSubmit={sendCode} noValidate>
                <h1 className="font-display text-xl font-extrabold text-ink-950">نسيت كلمة المرور؟</h1>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  أدخل البريد الإلكتروني أو رقم الجوال المسجّل، وسنرسل رمز تحقق من 4 أرقام.
                </p>
                <div className="mt-4">
                  <TextField
                    label="البريد الإلكتروني أو رقم الجوال"
                    name="identifier"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(value) => {
                      setIdentifier(value);
                      setError(null);
                    }}
                    error={error ?? undefined}
                    placeholder="name@example.com أو 05XXXXXXXX"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      جارٍ الإرسال…
                    </>
                  ) : (
                    <>
                      <Icon name="message" size={16} />
                      إرسال رمز التحقق
                    </>
                  )}
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={verifyCode} noValidate>
                <h1 className="font-display text-xl font-extrabold text-ink-950">أدخل رمز التحقق</h1>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  أرسلنا رمزًا مكوّنًا من 4 أرقام إلى <span className="font-bold text-ink-900" dir="ltr">{sentTo || "جوالك المسجّل"}</span>.
                </p>

                {demoCode && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-aqua-300 bg-aqua-50 px-3 py-2 text-[12px] text-aqua-800">
                    <Icon name="info" size={14} className="shrink-0" />
                    نسخة تجريبية — الرمز هو <span className="font-mono font-extrabold" dir="ltr">{demoCode}</span>
                  </p>
                )}

                <div className="mt-4">
                  <label htmlFor="otp-code" className="mb-1.5 block text-[12px] font-semibold text-ink-700">
                    رمز التحقق
                  </label>
                  <input
                    id="otp-code"
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                      setError(null);
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    aria-invalid={Boolean(error)}
                    className={cn(
                      "h-14 w-full rounded-lg border bg-surface text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:ring-2",
                      error ? "border-danger focus:ring-danger/30" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
                    )}
                  />
                  {error && (
                    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-danger">
                      <Icon name="alert" size={12} strokeWidth={2.2} />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                >
                  <Icon name="check" size={16} />
                  تأكيد الرمز
                </button>

                <div className="mt-3 flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      void authApi.requestPasswordReset(identifier).then((result) => {
                        setDemoCode(result.demoCode);
                        setSentTo(result.sentTo);
                        pushToast({ tone: "info", title: "تم إرسال رمز جديد", duration: 2400 });
                      });
                    }}
                    className="font-bold text-brand-700 hover:underline"
                  >
                    إعادة إرسال الرمز
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("identifier");
                      setCode("");
                      setError(null);
                    }}
                    className="text-ink-500 hover:text-ink-800"
                  >
                    تغيير البريد أو الجوال
                  </button>
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={savePassword} noValidate>
                <h1 className="font-display text-xl font-extrabold text-ink-950">كلمة المرور الجديدة</h1>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  اختر كلمة مرور لا تستخدمها في مواقع أخرى. لا نحتفظ بكلمات المرور بصيغة قابلة للقراءة.
                </p>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <div className="relative">
                      <TextField
                        label="كلمة المرور"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(value) => {
                          setPassword(value);
                          setError(null);
                        }}
                        placeholder="8 أحرف على الأقل"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        className="absolute bottom-2.5 end-2.5 grid size-8 place-items-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <span
                              key={level}
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition",
                                strength.score >= level
                                  ? strength.tone === "danger"
                                    ? "bg-danger"
                                    : strength.tone === "warning"
                                      ? "bg-warning"
                                      : "bg-flow-500"
                                  : "bg-ink-150"
                              )}
                            />
                          ))}
                        </div>
                        <p className="mt-1.5 text-[11.5px] text-ink-500">
                          قوة كلمة المرور: <span className="font-bold text-ink-800">{strength.label}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <TextField
                    label="تأكيد كلمة المرور"
                    name="confirm"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(value) => {
                      setConfirm(value);
                      setError(null);
                    }}
                    error={error ?? undefined}
                    placeholder="أعد كتابة كلمة المرور"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      جارٍ الحفظ…
                    </>
                  ) : (
                    <>
                      <Icon name="lock" size={16} />
                      تحديث كلمة المرور
                    </>
                  )}
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-flow-50 text-flow-600 ring-1 ring-flow-200">
                  <Icon name="checkCircle" size={28} />
                </span>
                <h1 className="mt-4 font-display text-xl font-extrabold text-ink-950">تم تحديث كلمة المرور</h1>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-600">
                  يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة. إن لم تكن أنت من طلب التغيير، تواصل معنا فورًا.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-[13.5px] font-bold text-white shadow-brand transition hover:bg-brand-800"
                >
                  <Icon name="user" size={16} />
                  الانتقال لتسجيل الدخول
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[12.5px]">
            <Link to="/login" className="font-bold text-brand-700 hover:underline">
              رجوع لتسجيل الدخول
            </Link>
            <span className="text-ink-300">·</span>
            <Link to="/help/contact" className="text-ink-600 hover:text-brand-700">
              تحتاج مساعدة؟
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

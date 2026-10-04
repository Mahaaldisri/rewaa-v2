import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { ApiError } from "@/types/product";
import { env } from "@/config/env";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

/**
 * Demo login shortcut, development-only.
 * The credentials are duplicated here on purpose: the auth service keeps them in
 * its mock layer, and importing that layer from a page would break the rule that
 * UI components never read mock data directly.
 */
const DEMO_LOGIN = { email: "demo@rewaa.sa", password: "123456" } as const;

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/account";
  const { login } = useAuth();
  const { pushToast } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Demo shortcut — development builds only. The demo account lives in the mock
   * auth layer, which is never active in a production deployment, so the button
   * (and the credentials it reveals) is hidden there entirely.
   */
  const fillDemo = () => {
    if (!env.devTools || !env.mock.enabled) return;
    setEmail(DEMO_LOGIN.email);
    setPassword(DEMO_LOGIN.password);
  };
  const showDemo = env.devTools && env.mock.enabled;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login({ email, password });
      pushToast({ tone: "success", title: `أهلًا بعودتك، ${user.name.split(" ")[0]} 👋`, duration: 2600 });
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر تسجيل الدخول، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ambient flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-lift sm:p-8">
          <h1 className="font-display text-xl font-extrabold text-ink-950">تسجيل الدخول</h1>
          <p className="mt-1.5 text-[12.5px] text-ink-500">
            سجّل الدخول لمتابعة طلباتك، عناوينك المحفوظة، وباقات الصيانة الخاصة بك.
          </p>

          {showDemo && (
            <button
              type="button"
              onClick={fillDemo}
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-aqua-300 bg-aqua-50/60 px-3.5 py-2.5 text-start transition hover:bg-aqua-50"
            >
              <span className="text-[11.5px] text-aqua-800">
                <strong className="font-bold">حساب تجريبي (بيئة تطوير):</strong> {DEMO_LOGIN.email}
              </span>
              <span className="shrink-0 text-[11px] font-bold text-aqua-700 underline">تعبئة تلقائية</span>
            </button>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">البريد الإلكتروني</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-end text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="example@email.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-700">كلمة المرور</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 pe-10 text-end text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400 transition hover:text-ink-700"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
            </label>

            {error && (
              <p className="flex items-center gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-[12px] text-danger">
                <Icon name="alert" size={14} />
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-[12px]">
              <label className="flex items-center gap-1.5 text-ink-600">
                <input type="checkbox" defaultChecked className="size-3.5 accent-[var(--color-brand-700)]" />
                تذكّرني
              </label>
              <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98]",
                loading && "cursor-wait opacity-80"
              )}
            >
              {loading && <Icon name="refresh" size={16} className="animate-spin-slow" />}
              {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-ink-500">
            ليس لديك حساب؟{" "}
            <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-brand-700 hover:underline">
              أنشئ حسابًا جديدًا
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[11.5px] text-ink-400">
          بالمتابعة فإنك توافق على{" "}
          <Link to="/legal/terms" className="underline">
            الشروط والأحكام
          </Link>{" "}
          و{" "}
          <Link to="/legal/privacy" className="underline">
            سياسة الخصوصية
          </Link>
        </p>
      </div>
    </div>
  );
}

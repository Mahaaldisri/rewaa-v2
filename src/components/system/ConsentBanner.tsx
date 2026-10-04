import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { env } from "@/config/env";
import { consent, type ConsentState } from "@/services/consent";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

/**
 * Cookie / measurement consent banner.
 *
 * Shown only when measurement is actually configured AND consent is required.
 * Until the visitor decides, no analytics script loads; declining is a single
 * click and keeps every shopping feature working (consent only affects
 * analytics and marketing, never checkout or service requests).
 */

export function consentIsRequired(): boolean {
  return env.analytics.requireConsent && env.analytics.provider !== "none";
}

export function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(() => consent.read());
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => consent.subscribe(setState), []);

  if (!consentIsRequired() || state || hidden) return null;

  const decide = (next: { analytics: boolean; marketing: boolean }) => {
    consent.save(next);
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-label="إعدادات ملفات التخزين والقياس"
      className="fixed inset-x-0 bottom-0 z-[95] border-t border-ink-150 bg-surface/98 shadow-pop backdrop-blur"
    >
      <div className="container-x py-3.5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon name="shield" size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-ink-900">نستخدم تخزينًا ضروريًا لتشغيل المتجر</p>
            <p className="mt-1 text-[11.5px] leading-5 text-ink-600">
              السلة والمفضلة وجلسة الدخول تعمل دائمًا. أما أدوات القياس والتسويق فلا تُحمَّل قبل موافقتك، ويمكنك سحبها في
              أي وقت. التفاصيل في{" "}
              <Link to="/legal/cookies" className="font-bold text-brand-700 underline decoration-dotted">
                سياسة ملفات التخزين
              </Link>{" "}
              و
              <Link to="/legal/privacy" className="font-bold text-brand-700 underline decoration-dotted">
                سياسة الخصوصية
              </Link>
              .
            </p>

            {expanded && (
              <div className="mt-3 space-y-2 rounded-lg border border-ink-150 bg-paper p-3">
                <label className="flex items-start gap-2.5 text-[12px] text-ink-700">
                  <input type="checkbox" checked disabled className="mt-0.5 size-4 accent-brand-700" />
                  <span>
                    <span className="block font-bold text-ink-900">ضروري للتشغيل (إلزامي)</span>
                    <span className="mt-0.5 block text-[11.5px] leading-5 text-ink-500">
                      حفظ السلة والمفضلة ورمز الطلب بدون حساب.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-[12px] text-ink-700">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                    className="mt-0.5 size-4 accent-brand-700"
                  />
                  <span>
                    <span className="block font-bold text-ink-900">القياس والتحليلات</span>
                    <span className="mt-0.5 block text-[11.5px] leading-5 text-ink-500">
                      أحداث مجهولة الهوية (مشاهدة منتج، بحث، إتمام طلب) لتحسين المتجر.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-[12px] text-ink-700">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(event) => setMarketing(event.target.checked)}
                    className="mt-0.5 size-4 accent-brand-700"
                  />
                  <span>
                    <span className="block font-bold text-ink-900">التسويق والإعلانات</span>
                    <span className="mt-0.5 block text-[11.5px] leading-5 text-ink-500">
                      قياس أداء الحملات. لا يُفعَّل حاليًا أي وسيط تسويقي في هذا البناء.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {expanded ? (
              <>
                <button
                  type="button"
                  onClick={() => decide({ analytics, marketing })}
                  className="h-10 flex-1 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 sm:flex-none"
                >
                  حفظ اختياري
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="h-10 rounded-lg border border-ink-200 px-3 text-[12.5px] font-semibold text-ink-600"
                >
                  رجوع
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => decide({ analytics: true, marketing: true })}
                  className="h-10 flex-1 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand transition hover:bg-brand-800 sm:flex-none"
                >
                  قبول الكل
                </button>
                <button
                  type="button"
                  onClick={() => decide({ analytics: false, marketing: false })}
                  className="h-10 flex-1 rounded-lg border border-ink-200 px-4 text-[12.5px] font-bold text-ink-700 transition hover:bg-ink-50 sm:flex-none"
                >
                  الضروري فقط
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className={cn(
                    "h-10 rounded-lg px-3 text-[12.5px] font-semibold text-brand-700 transition hover:bg-brand-50"
                  )}
                >
                  تخصيص
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

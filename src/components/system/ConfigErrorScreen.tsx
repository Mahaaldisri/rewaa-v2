import type { ConfigIssue } from "@/config/config-checks";
import { env } from "@/config/env";
import { brand, contact } from "@/config/site";
import { Icon } from "@/components/ui/Icon";

/**
 * Blocking screen shown when the build cannot reach a backend and is not allowed
 * to fall back to mock data. It replaces the whole storefront on purpose: an
 * empty catalogue with no explanation is worse than an honest configuration error.
 */
export function ConfigErrorScreen({ issues }: { issues: ConfigIssue[] }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-ink-950 text-aqua-300">
            <Icon name="alert" size={22} />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-950">{brand.name}</p>
            <p className="text-[11px] font-bold tracking-[0.28em] text-ink-400">{brand.nameEn}</p>
          </div>
        </div>

        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink-950">
          المتجر غير مهيأ لهذه البيئة
        </h1>
        <p className="mt-3 text-[13.5px] leading-7 text-ink-600">
          البناء الحالي مضبوط على بيئة <span className="font-bold text-ink-900">{env.appEnv}</span> بدون عنوان API
          صالح، وطبقة بيانات العرض معطّلة. لن نعرض بيانات تجريبية على أنها حقيقية، لذلك تم إيقاف الواجهة هنا.
        </p>

        <ul className="mt-5 space-y-2.5">
          {issues.map((issue) => (
            <li key={issue.id} className="rounded-xl border border-danger/20 bg-danger-soft/40 p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-bold text-ink-900">
                <Icon name="alert" size={15} className="text-danger" />
                {issue.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-6 text-ink-700">{issue.detail}</p>
              {issue.hint && <p className="mt-1 text-[12px] leading-6 text-ink-500">↳ {issue.hint}</p>}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl border border-ink-150 bg-surface p-4">
          <p className="text-[12px] font-bold text-ink-700">ما الذي يجب ضبطه؟</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-6 text-ink-600">
            <li>
              <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11.5px]" dir="ltr">
                VITE_API_URL
              </code>{" "}
              — عنوان بوابة الـAPI (مثال: <span dir="ltr">https://api.rewaa.sa</span>).
            </li>
            <li>
              <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11.5px]" dir="ltr">
                VITE_APP_ENV
              </code>{" "}
              — development أو staging أو production.
            </li>
            <li>
              للعرض التجريبي فقط:{" "}
              <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11.5px]" dir="ltr">
                VITE_ENABLE_MOCK=true
              </code>
              .
            </li>
          </ul>
        </div>

        <div className="mt-6 border-t border-ink-100 pt-5 text-[12.5px] text-ink-500">
          <p>تحتاج مساعدة فنية؟ تواصل مع فريق التشغيل:</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={`mailto:${contact.email}`} className="font-bold text-brand-700 hover:underline" dir="ltr">
              {contact.email}
            </a>
            <span className="text-ink-300">·</span>
            <span>{contact.supportHours}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

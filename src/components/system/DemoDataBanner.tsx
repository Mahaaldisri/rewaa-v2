import { useState } from "react";
import { env } from "@/config/env";
import { Icon } from "@/components/ui/Icon";

/**
 * Visible notice for builds that serve mock data outside development.
 * It exists so a demo/staging URL can never be mistaken for a live store.
 */
export function DemoDataBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (!env.mock.forced || dismissed) return null;

  return (
    <div className="border-b border-warning/25 bg-warning-soft text-ink-900">
      <div className="container-x flex items-center gap-2.5 py-2 text-[11.5px]">
        <Icon name="alert" size={14} className="shrink-0 text-warning" />
        <p className="flex-1 leading-5">
          <span className="font-bold">وضع بيانات تجريبية ({env.appEnv}).</span> الأسعار والمخزون والمواعيد المعروضة
          محتوى عرض وليست بيانات متجر حقيقي.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="إخفاء التنبيه"
          className="shrink-0 rounded-md p-1 text-ink-500 transition hover:bg-white/40 hover:text-ink-800"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}

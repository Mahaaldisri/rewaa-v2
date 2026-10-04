/**
 * نقطة تركيب المساعد في الموقع: زر صغير غير مُلحّ + اللوحة عند الطلب.
 *
 * - لا يفتح تلقائيًا، ولا نوافذ منبثقة، ولا إلحاح على الشراء.
 * - إذا لم تكن البوابة مهيّأة (وضع الإنتاج بلا خادم) لا يظهر أي شيء: الموقع
 *   يعمل كاملًا بدون المساعد، ولا نوهم العميل بمساعد غير موجود.
 */
import { useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { useAiAssistant } from "@/hooks/useAiAssistant";

const AiChatPanel = lazy(() =>
  import("@/components/ai/AiChatPanel").then((module) => ({ default: module.AiChatPanel })),
);

/** مسارات لا نُظهر فيها المساعد (إتمام الشراء يحتاج تركيزًا كاملًا). */
const HIDDEN_PREFIXES = ["/checkout"];

export function AiAssistant() {
  const assistant = useAiAssistant();
  const location = useLocation();

  if (assistant.status.mode === "disabled") return null;
  if (HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  const { open, openChat, closeChat, status } = assistant;

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <AiChatPanel assistant={assistant} path={location.pathname} />
        </Suspense>
      )}

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] start-4 z-[68] print:hidden">
        <button
          type="button"
          onClick={() => (open ? closeChat() : openChat("launcher"))}
          aria-expanded={open}
          aria-label={open ? "إغلاق مساعد رواء" : "افتح مساعد رواء الذكي"}
          className={cn(
            "group flex items-center gap-2 rounded-full bg-brand-700 py-2.5 text-white shadow-lift transition",
            "hover:bg-brand-800 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400",
            open ? "ps-3.5 pe-3.5" : "ps-3.5 pe-3.5",
          )}
        >
          <Icon name={open ? "close" : "sparkles"} size={19} className={open ? "" : "text-aqua-300"} />
          <span className="text-[12.5px] font-bold">{open ? "إغلاق" : "مساعد رواء"}</span>
          {!open && status.demo && (
            <span className="rounded-full bg-white/15 px-1.5 py-[1px] text-[10px] font-semibold">تجريبي</span>
          )}
        </button>
      </div>
    </>
  );
}

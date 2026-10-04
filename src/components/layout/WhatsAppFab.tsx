import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { contact, whatsappLink } from "@/config/site";
import { cn } from "@/utils/cn";

const QUICK_PROMPTS = [
  "أحتاج مساعدة في اختيار فلتر مناسب لمنزلي",
  "أريد معرفة موعد وصول طلبي",
  "عندي تسريب في نظام التنقية",
  "أرغب بحجز زيارة فني لصيانة دورية",
  "أحتاج عرض سعر لمنشأة تجارية",
];

/**
 * Floating support launcher.
 * Sits above the mobile sticky bars and offers quick WhatsApp starters so the
 * visitor never has to type a first message from scratch.
 */
export function WhatsAppFab() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close when the route changes (avoids a stuck panel after navigation).
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] end-4 z-[70] flex flex-col items-end gap-2.5 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="تواصل سريع على واتساب"
          className="w-[min(84vw,320px)] overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-lift"
        >
          <div className="flex items-start justify-between gap-3 bg-flow-600 px-4 py-3 text-white">
            <div>
              <p className="font-display text-[13.5px] font-bold">الدعم الفني على واتساب</p>
              <p className="mt-0.5 text-[11.5px] text-flow-50">{contact.supportHours}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
              className="grid size-7 shrink-0 place-items-center rounded-md bg-white/15 transition hover:bg-white/25"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto p-2 thin-scrollbar">
            {QUICK_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <a
                  href={whatsappLink(prompt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12.5px] leading-6 text-ink-700 transition hover:bg-ink-50"
                >
                  <Icon name="message" size={14} className="mt-1 shrink-0 text-flow-600" />
                  {prompt}
                </a>
              </li>
            ))}
          </ul>
          <div className="border-t border-ink-100 p-2">
            <Link
              to="/help/contact"
              className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2.5 text-[12.5px] font-bold text-ink-800 transition hover:bg-ink-100"
            >
              كل قنوات التواصل
              <Icon name="arrowLeft" size={14} />
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "إغلاق قائمة التواصل" : "تواصل على واتساب"}
        className={cn(
          "group flex size-13 items-center justify-center rounded-full shadow-lift transition",
          "size-[52px] bg-flow-600 text-white hover:bg-flow-700 active:scale-95"
        )}
      >
        <Icon name={open ? "close" : "whatsapp"} size={24} />
      </button>
    </div>
  );
}

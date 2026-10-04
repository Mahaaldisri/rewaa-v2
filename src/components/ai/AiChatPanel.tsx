/**
 * لوحة المحادثة.
 *
 * سطح المكتب: لوحة عائمة صغيرة في الزاوية.
 * الجوال: ورقة سفلية بارتفاع شبه كامل (بلا قفزات ولا نوافذ مزعجة).
 * لا تُفتح تلقائيًا أبدًا، ويمكن إغلاقها بمفتاح Escape، والتركيز يبدأ في الحقل.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { startersFor } from "@/services/ai/starters";
import { attachmentRefFromFile, validateAttachmentFile } from "@/lib/ai/attachment";
import { formatRelativeDate } from "@/lib/format";
import { AI_MAX_USER_MESSAGE } from "@/lib/ai/sanitize";
import { AiMessage, type AiMessageHandlers } from "@/components/ai/AiMessage";
import type { UseAiAssistantValue } from "@/hooks/useAiAssistant";
import { AI_DEMO_BADGE, type AiAttachmentRef } from "@/types/ai";

interface Props {
  assistant: UseAiAssistantValue;
  path: string;
}

export function AiChatPanel({ assistant, path }: Props) {
  const {
    status,
    messages,
    busy,
    activeTools,
    history,
    sendMessage,
    stopGenerating,
    retryLast,
    newConversation,
    openConversation,
    submitFeedback,
    runClientAction,
    prepareHandoff,
    confirmHandoff,
    closeChat,
    canUpload,
  } = assistant;

  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<AiAttachmentRef | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [handoff, setHandoff] = useState<{ text: string; reason: string } | null>(null);
  const [handoffSent, setHandoffSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  const starters = useMemo(() => startersFor(path), [path]);

  /* التركيز على الحقل عند الفتح — مع احترام تفضيل تقليل الحركة. */
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(timer);
  }, []);

  /* Escape يغلق اللوحة (أو نافذة الملخص أولًا)، وTab يبقى داخل اللوحة. */
  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (handoff) setHandoff(null);
        else if (showHistory) setShowHistory(false);
        else closeChat();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const previous = restoreFocusRef.current;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [closeChat, handoff, showHistory]);

  /* تمرير تلقائي لآخر رسالة أثناء البثّ. */
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    // `scrollTo` غير متاح في بعض بيئات الاختبار/العرض المحدودة — نتدرّج بأمان.
    if (typeof node.scrollTo === "function") node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    else node.scrollTop = node.scrollHeight;
  }, [messages]);

  /* حجم الحقل يتمدد مع الكتابة. */
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 128)}px`;
  }, [draft]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setDraft("");
    const ref = attachment;
    setAttachment(null);
    void sendMessage(value, ref ?? undefined);
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const check = validateAttachmentFile(file);
    if (!check.ok) {
      setAttachmentError(check.reason ?? "تعذّر قبول الملف.");
      setAttachment(null);
      return;
    }
    setAttachmentError(null);
    setAttachment(attachmentRefFromFile(file, file.name.toLowerCase().includes("label") ? "label" : "device"));
  };

  const handlers: AiMessageHandlers = {
    onAction: () => undefined,
    onClientAction: (action, meta) => void runClientAction(action, meta),
    onQuickReply: (text) => send(text),
    onFeedback: submitFeedback,
    onRetry: retryLast,
    onPrepareHandoff: (reason) => {
      const payload = prepareHandoff(reason);
      setHandoff({ text: payload.text, reason });
      setHandoffSent(false);
    },
  };

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="مساعد رواء الذكي"
      className={cn(
        "fixed z-[75] flex flex-col overflow-hidden border border-ink-200 bg-surface shadow-pop",
        "inset-x-0 bottom-0 top-[6vh] rounded-t-2xl",
        "sm:inset-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:start-4 sm:top-auto sm:h-[min(78vh,660px)] sm:w-[min(92vw,412px)] sm:rounded-xl",
      )}
    >
      {/* الرأس */}
      <header className="flex items-start justify-between gap-2 bg-brand-700 px-3.5 py-2.5 text-white">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-[13.5px] font-bold">
            <Icon name="sparkles" size={15} className="text-aqua-300" />
            مساعد رواء
          </p>
          <p className="mt-0.5 truncate text-[11px] text-brand-100">{status.label === "مساعد رواء" ? "يجيب من بيانات المتجر" : status.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={newConversation}
            aria-label="محادثة جديدة"
            title="محادثة جديدة"
            className="grid size-7 place-items-center rounded-md bg-white/10 transition hover:bg-white/20"
          >
            <Icon name="refresh" size={14} />
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              aria-label="المحادثات السابقة"
              aria-expanded={showHistory}
              className="grid size-7 place-items-center rounded-md bg-white/10 transition hover:bg-white/20"
            >
              <Icon name="history" size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={closeChat}
            aria-label="إغلاق المساعد"
            className="grid size-7 place-items-center rounded-md bg-white/10 transition hover:bg-white/20"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </header>

      {/* شريط حالة الوضع */}
      {status.demo ? (
        <p className="flex items-center gap-1.5 border-b border-warning/20 bg-warning-soft px-3.5 py-1.5 text-[10.5px] leading-5 text-warning">
          <Icon name="alert" size={12} className="shrink-0" />
          {AI_DEMO_BADGE} — ردود مبنية على قواعد ثابتة وبيانات المتجر، وليست من نموذج ذكاء اصطناعي.
        </p>
      ) : (
        <p className="border-b border-ink-100 bg-paper px-3.5 py-1.5 text-[10.5px] leading-5 text-ink-500">
          الردود تُبنى من بيانات المتجر عبر بوابة رواء — وقد تُخطئ، تحقق دائمًا من صفحة المنتج.
        </p>
      )}

      {/* المحادثات السابقة */}
      {showHistory && (
        <div className="border-b border-ink-100 bg-paper px-3 py-2">
          <p className="mb-1.5 text-[11px] font-bold text-ink-700">محادثاتك السابقة (محفوظة على جهازك)</p>
          <ul className="space-y-1">
            {history.slice(0, 3).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => {
                    openConversation(entry.id);
                    setShowHistory(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-ink-100 bg-surface px-2.5 py-1.5 text-start text-[11.5px] text-ink-700 transition hover:border-brand-300"
                >
                  <span className="line-clamp-1">{entry.messages[0]?.text ?? "محادثة"}</span>
                  <span className="shrink-0 text-[10px] text-ink-400">{formatRelativeDate(new Date(entry.updatedAt).toISOString())}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* الرسائل */}
      <div
        ref={bodyRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="سجل المحادثة"
        className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3 thin-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-ink-100 bg-paper px-3 py-3">
              <p className="text-[13px] font-bold text-ink-900">أهلًا بك في رواء 👋</p>
              <p className="mt-1 text-[12px] leading-6 text-ink-600">
                أساعدك في اختيار النظام المناسب، مقارنة المنتجات، حساب التوفير مقابل مياه القوارير، التأكد من توافق القطع مع
                جهازك، ومتابعة الصيانة والطلبات.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-ink-500">ابدأ من هنا</p>
              {starters.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => send(starter.send)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-start text-[12px] text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
                >
                  {starter.label}
                  <Icon name="arrowLeft" size={13} className="shrink-0 text-ink-300" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <AiMessage key={message.id} message={message} handlers={handlers} />)
        )}

        {busy && activeTools.length > 0 && (
          <p className="text-[11px] text-ink-500">
            أتحقق الآن من: {activeTools.slice(-2).map((name) => name).join(" · ")}
          </p>
        )}
      </div>

      {/* نافذة ملخص التسليم */}
      {handoff && (
        <div className="border-t border-ink-100 bg-brand-50/70 px-3.5 py-2.5">
          <p className="text-[11.5px] font-bold text-ink-800">ملخص سيُشارك مع فريق رواء بعد موافقتك</p>
          <pre className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-brand-200 bg-surface p-2 text-[11px] leading-5 text-ink-700 thin-scrollbar">
            {handoff.text}
          </pre>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {handoffSent ? (
              <Badge tone="success" icon="check">
                تم إرسال الملخص لفريق رواء
              </Badge>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void confirmHandoff({
                    reason: handoff.reason,
                    summary: handoff.text,
                    products: [],
                    orderNumbers: [],
                    steps: [],
                    keyMessages: [],
                    text: handoff.text,
                    channels: { whatsapp: "", contact: "/help/contact" },
                  });
                  setHandoffSent(true);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-800"
              >
                <Icon name="check" size={12} strokeWidth={3} />
                أوافق، شارك الملخص
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(handoff.text).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-brand-300"
            >
              <Icon name="copy" size={12} />
              {copied ? "تم النسخ" : "انسخ الملخص"}
            </button>
            <Link
              to="/help/contact"
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-brand-300"
            >
              كل قنوات التواصل
            </Link>
            <button
              type="button"
              onClick={() => setHandoff(null)}
              className="text-[11px] font-semibold text-ink-500 underline"
            >
              لاحقًا
            </button>
          </div>
        </div>
      )}

      {/* المحرّر */}
      <footer className="border-t border-ink-100 bg-surface px-3 py-2.5 safe-bottom">
        {attachment && (
          <div className="mb-1.5 flex items-center justify-between gap-2 rounded-md border border-ink-100 bg-paper px-2 py-1.5 text-[11px] text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="image" size={12} />
              {attachment.kind === "label" ? "صورة الملصق جاهزة للإرسال" : "صورة الجهاز جاهزة للإرسال"}
            </span>
            <button type="button" onClick={() => setAttachment(null)} aria-label="إزالة المرفق" className="text-ink-400 hover:text-danger">
              <Icon name="close" size={12} />
            </button>
          </div>
        )}

        {attachmentError && (
          <p className="mb-1.5 rounded-md bg-danger-soft px-2 py-1.5 text-[11px] text-danger">{attachmentError}</p>
        )}

        <div className="flex items-end gap-1.5">
          {canUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="إرفاق صورة الجهاز أو الملصق"
                title="أرفق صورة (اختياري)"
                className="grid size-9 shrink-0 place-items-center rounded-md border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:text-brand-700"
              >
                <Icon name="paperclip" size={15} />
              </button>
            </>
          )}

          <label className="sr-only" htmlFor="ai-composer">
            اكتب رسالتك لمساعد رواء
          </label>
          <textarea
            id="ai-composer"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, AI_MAX_USER_MESSAGE))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            dir="auto"
            placeholder={lastUserMessage ? "اكتب رسالتك…" : "مثال: عندي عائلة من 5 أفراد، أي فلتر يناسبني؟"}
            className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-ink-200 bg-surface px-2.5 py-2 text-[12.5px] leading-6 text-ink-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />

          {busy ? (
            <button
              type="button"
              onClick={stopGenerating}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-ink-200 text-ink-600 transition hover:border-danger/40 hover:text-danger"
              aria-label="إيقاف الرد"
              title="إيقاف الرد"
            >
              <Icon name="stop" size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => send(draft)}
              disabled={draft.trim().length === 0}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200"
              aria-label="إرسال"
            >
              <Icon name="send" size={16} />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-[10px] leading-5 text-ink-400">
          لا تشارك أرقام البطاقات أو كلمات المرور أو رموز التحقق — المساعد لا يطلبها ولا يحفظها.{" "}
          <Link to="/legal/privacy" className="underline">
            الخصوصية
          </Link>
        </p>
      </footer>
    </section>
  );
}

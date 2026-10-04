/**
 * عرض رسالة واحدة في المحادثة (نص + كتل منظّمة).
 *
 * كل كتلة تُمرَّر عبر مُوزِّع واحد يتحقق من وجود بياناتها قبل الرسم، وكل إجراء
 * يُنفَّذ في المتصفح عبر خدمات الموقع الرسمية.
 */
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { AI_TOOL_LABELS, type AiBlock, type AiClientAction, type AiToolName } from "@/types/ai";
import {
  ComparisonBlock,
  ImageBlock,
  ProductCardBlock,
  ProductCarouselBlock,
  type ProductBlockHandlers,
} from "@/components/ai/BlockCatalog";
import {
  ActionBlock,
  CalculatorResultBlock,
  HandoffBlock,
  MaintenanceBlock,
  NoticeBlock,
  OrderStatusBlock,
  QuickRepliesBlock,
  ServiceBlock,
  SourcesBlock,
  TextBlock,
} from "@/components/ai/BlockSystem";
import type { AiChatMessage } from "@/hooks/useAiAssistant";

export interface AiMessageHandlers extends ProductBlockHandlers {
  onClientAction: (action: AiClientAction, meta?: { position?: number; source?: AiBlock["type"] }) => void;
  onQuickReply: (text: string) => void;
  onFeedback: (messageId: string, rating: "up" | "down", reason?: string) => void;
  onRetry: () => void;
  onPrepareHandoff: (reason: string) => void;
}

const DOWN_REASONS = ["المعلومة غير دقيقة", "لم تجب على سؤالي", "الرد طويل", "أخرى"];

/** يُرسم فقط ما مرّ من تحقق المخطط في `coerceBlock`. */
function BlockView({ block, handlers }: { block: AiBlock; handlers: AiMessageHandlers }) {
  switch (block.type) {
    case "text":
      return <TextBlock text={block.text} />;
    case "product_card":
      return <ProductCardBlock block={block} handlers={handlers} />;
    case "product_carousel":
      return <ProductCarouselBlock block={block} handlers={handlers} />;
    case "image":
      return <ImageBlock block={block} />;
    case "comparison":
      return <ComparisonBlock block={block} handlers={handlers} />;
    case "quick_replies":
      return <QuickRepliesBlock block={block} onReply={handlers.onQuickReply} onAction={handlers.onClientAction} />;
    case "action":
      return <ActionBlock block={block} onAction={(action) => handlers.onClientAction(action, { source: "action" })} />;
    case "calculator_result":
      return <CalculatorResultBlock block={block} onAction={handlers.onClientAction} />;
    case "service_card":
      return <ServiceBlock block={block} onAction={handlers.onClientAction} />;
    case "order_status":
      return <OrderStatusBlock block={block} />;
    case "maintenance_card":
      return <MaintenanceBlock block={block} />;
    case "human_handoff":
      return <HandoffBlock block={block} onPrepare={handlers.onPrepareHandoff} />;
    case "notice":
      return <NoticeBlock block={block} />;
    case "sources":
      return <SourcesBlock block={block} />;
    default:
      return null;
  }
}

function ToolChips({ tools, live }: { tools: AiChatMessage["tools"]; live: boolean }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.slice(-4).map((tool) => (
        <span
          key={`${tool.name}-${tool.state}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold",
            tool.state === "failed"
              ? "border-danger/20 bg-danger-soft text-danger"
              : tool.state === "started"
                ? "border-aqua-200 bg-aqua-50 text-aqua-800"
                : "border-ink-200 bg-ink-50 text-ink-600",
          )}
        >
          {tool.state === "started" ? (
            <span className="size-2.5 animate-spin rounded-full border-2 border-aqua-300 border-t-aqua-700" />
          ) : (
            <Icon name={tool.state === "failed" ? "alert" : "check"} size={10} strokeWidth={3} />
          )}
          {AI_TOOL_LABELS[tool.name as AiToolName] ?? tool.name}
        </span>
      ))}
      {live && <span className="sr-only">جارٍ تنفيذ أدوات للتحقق من البيانات</span>}
    </div>
  );
}

export function AiMessage({ message, handlers }: { message: AiChatMessage; handlers: AiMessageHandlers }) {
  const [askReason, setAskReason] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[86%] rounded-xl rounded-ss-sm bg-brand-700 px-3 py-2 text-[13px] leading-7 text-white">
          {message.attachment && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[10.5px]">
              <Icon name="image" size={11} />
              مرفق: {message.attachment.kind === "label" ? "صورة الملصق" : message.attachment.kind === "device" ? "صورة الجهاز" : "صورة"}
            </span>
          )}
          <p dir="auto" className="whitespace-pre-line">{message.text}</p>
        </div>
      </div>
    );
  }

  const hasBody = message.text.trim().length > 0 || message.blocks.length > 0;

  return (
    <div className="space-y-2">
      {message.text && (
        <div className="max-w-[92%] rounded-xl rounded-ss-sm border border-ink-100 bg-surface px-3 py-2 shadow-hair">
          <TextBlock text={message.text} />
        </div>
      )}

      {message.blocks.map((block, index) =>
        block.type === "text" ? null : (
          <div key={`${message.id}-${block.type}-${index}`} className="max-w-full">
            <BlockView block={block} handlers={handlers} />
          </div>
        ),
      )}

      {message.tools.length > 0 && <ToolChips tools={message.tools} live={Boolean(message.streaming)} />}

      {message.streaming && !hasBody && (
        <div className="flex items-center gap-2 text-[11.5px] text-ink-500">
          <span className="flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:240ms]" />
          </span>
          جارٍ التحقق من بيانات المتجر…
        </div>
      )}

      {message.stopped && !message.streaming && (
        <p className="text-[11px] font-semibold text-ink-500">تم إيقاف الرد بناءً على طلبك.</p>
      )}

      {message.error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft px-2.5 py-2 text-[11.5px] text-danger">
          <Icon name="alert" size={13} />
          <span className="text-ink-700">{message.error.message}</span>
          {message.error.retryable && (
            <button
              type="button"
              onClick={handlers.onRetry}
              className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-2 py-1 font-bold text-danger transition hover:bg-danger-soft"
            >
              <Icon name="refresh" size={11} />
              أعد المحاولة
            </button>
          )}
        </div>
      )}

      {!message.streaming && hasBody && (
        <div className="flex items-center gap-2">
          {message.feedback ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-flow-700">
              <Icon name="check" size={11} strokeWidth={3} />
              شكرًا لتقييمك
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handlers.onFeedback(message.id, "up")}
                aria-label="رد مفيد"
                className="grid size-6 place-items-center rounded-md border border-ink-200 text-ink-500 transition hover:border-flow-300 hover:text-flow-700"
              >
                <Icon name="thumbUp" size={12} />
              </button>
              <button
                type="button"
                onClick={() => (askReason ? setAskReason(false) : setAskReason(true))}
                aria-label="رد غير مفيد"
                aria-expanded={askReason}
                className="grid size-6 place-items-center rounded-md border border-ink-200 text-ink-500 transition hover:border-danger/40 hover:text-danger"
              >
                <Icon name="thumbDown" size={12} />
              </button>
              {askReason && (
                <div className="flex flex-wrap items-center gap-1">
                  {DOWN_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        handlers.onFeedback(message.id, "down", reason);
                        setAskReason(false);
                      }}
                      className="rounded-full border border-ink-200 px-2 py-[3px] text-[10.5px] text-ink-600 transition hover:border-danger/40 hover:text-danger"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

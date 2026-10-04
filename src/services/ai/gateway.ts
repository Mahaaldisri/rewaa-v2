/**
 * بوابة المساعد (AI Gateway client).
 *
 * الواجهة **لا تتصل بأي مزوّد ذكاء اصطناعي** ولا تحمل أي مفتاح. كل شيء يمر عبر
 * `POST {VITE_AI_URL}/api/ai/chat` ببروتوكول SSE، والخادم هو المسؤول عن:
 * المصادقة، حدود المعدّل، اختيار المزوّد، تنفيذ الأدوات، الاسترجاع، التحقق من
 * المخطط، والتسجيل.
 *
 * ثلاث حالات فقط، ولا توجد حالة رابعة:
 *  - `server`   بوابة خادم مهيّأة (مسار الإنتاج).
 *  - `dev`      مساعد تطويري قائم على قواعد، موسوم بوضوح، بلا أي ادعاء ذكاء.
 *  - `disabled` لا شيء — تُعاد رسالة صريحة بدل واجهة توهم بمساعد يعمل.
 */
import { env } from "@/config/env";
import {
  isAiToolName,
  type AiBlock,
  type AiChatRequest,
  type AiErrorInfo,
  type AiSourceRef,
  type AiStreamEvent,
} from "@/types/ai";
import { coerceBlock, coerceSources } from "@/lib/ai/blocks";
import { sanitizeText } from "@/lib/ai/sanitize";
import { catalogResolver } from "@/services/ai/catalog-resolver";
import type { DevConversationState } from "@/services/ai/devAssistant";
import type { ToolContext } from "@/services/ai/tools";

export type AiGatewayMode = "server" | "dev" | "disabled";

export interface AiGatewayStatus {
  mode: AiGatewayMode;
  /** نص قصير يظهر في الواجهة. */
  label: string;
  detail: string;
  /** الردود الحالية ليست من نموذج ذكاء اصطناعي (وضع التطوير). */
  demo: boolean;
}

export function gatewayStatus(): AiGatewayStatus {
  if (!env.ai.enabled || env.ai.mode === "disabled") {
    return {
      mode: "disabled",
      label: "المساعد غير مهيّأ",
      detail: env.ai.reason || "لم يتم ضبط بوابة المساعد الذكي في هذه البيئة.",
      demo: false,
    };
  }
  if (env.ai.configured) {
    return {
      mode: "server",
      label: "مساعد رواء",
      detail: "الردود تأتي من بوابة رواء الذكية على الخادم.",
      demo: false,
    };
  }
  if (!env.ai.allowDevAssistant) {
    // بوابة غير مهيّأة ولا يُسمح بالمساعد التطويري ⇒ لا واجهة توهم بمساعد يعمل.
    return {
      mode: "disabled",
      label: "المساعد غير مهيّأ",
      detail: "لم يتم ضبط بوابة المساعد الذكي (VITE_AI_URL) في هذه البيئة.",
      demo: false,
    };
  }
  return {
    mode: "dev",
    label: "مساعد رواء — وضع تجريبي",
    detail:
      "يعمل مساعد تجريبي قائم على قواعد ثابتة داخل المتصفح (بدون نموذج ذكاء اصطناعي) حتى يتم ضبط VITE_AI_URL.",
    demo: true,
  };
}

/** مهلة الخمول: إن توقف البثّ أكثر من هذه المدة نُغلق الطلب بأناقة. */
const STREAM_IDLE_TIMEOUT_MS = 30_000;

export interface StreamChatOptions {
  request: AiChatRequest;
  ctx: ToolContext;
  /** حالة المحادثة لوضع التطوير (يبقيها مزوّد المساعد). */
  devState?: DevConversationState;
  signal?: AbortSignal;
  onEvent: (event: AiStreamEvent) => void;
}

/* ------------------------------------------------------------------ */
/* تحليل SSE                                                          */
/* ------------------------------------------------------------------ */

function coerceError(raw: unknown): AiErrorInfo {
  const fallback: AiErrorInfo = { code: "unknown", message: "حدث خطأ غير متوقع.", retryable: true };
  if (typeof raw !== "object" || raw === null) return fallback;
  const record = raw as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "unknown";
  const allowed: AiErrorInfo["code"][] = [
    "not_configured",
    "unauthorized",
    "rate_limited",
    "provider_unavailable",
    "tool_failed",
    "invalid_response",
    "network",
    "aborted",
    "unknown",
  ];
  return {
    code: allowed.includes(code as AiErrorInfo["code"]) ? (code as AiErrorInfo["code"]) : "unknown",
    message: sanitizeText(record.message, 300) || fallback.message,
    retryable: record.retryable !== false,
  };
}

/** يتحقق من كل حدث قبل تمريره للواجهة. */
export function coerceStreamEvent(raw: unknown): AiStreamEvent | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  const messageId = typeof record.messageId === "string" ? record.messageId : "m-stream";

  switch (type) {
    case "meta":
      return {
        type: "meta",
        conversationId: typeof record.conversationId === "string" ? record.conversationId : "c-unknown",
        messageId,
        model: typeof record.model === "string" ? record.model : undefined,
        demo: record.demo === true,
      };
    case "delta": {
      const text = sanitizeText(record.text, 1200);
      return text ? { type: "delta", messageId, text } : undefined;
    }
    case "block": {
      const block = coerceBlock(record.block, catalogResolver) as AiBlock | undefined;
      return block ? { type: "block", messageId, block } : undefined;
    }
    case "tool": {
      if (!isAiToolName(record.name)) return undefined;
      const state = record.state;
      if (state !== "started" && state !== "succeeded" && state !== "failed") return undefined;
      return {
        type: "tool",
        messageId,
        name: record.name,
        state,
        ms: typeof record.ms === "number" ? record.ms : undefined,
        error: typeof record.error === "string" ? record.error.slice(0, 60) : undefined,
      };
    }
    case "sources": {
      const items: AiSourceRef[] = coerceSources(record.items);
      return items.length > 0 ? { type: "sources", messageId, items } : undefined;
    }
    case "done":
      return { type: "done", messageId };
    case "error":
      return { type: "error", messageId, error: coerceError(record.error) };
    default:
      return undefined;
  }
}

/** يقرأ بثّ SSE من `Response` ويستدعي `onEvent` لكل حدث صالح. */
async function readSseStream(response: Response, onEvent: (event: AiStreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  let idleTimer = 0;

  const resetIdle = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      void reader.cancel().catch(() => undefined);
    }, STREAM_IDLE_TIMEOUT_MS);
  };
  resetIdle();

  try {
    for (;;) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      resetIdle();
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const chunk = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf("\n\n");

        const dataLine = chunk
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");
        if (!dataLine || dataLine === "[DONE]") continue;
        try {
          const parsed = coerceStreamEvent(JSON.parse(dataLine));
          if (parsed) onEvent(parsed);
        } catch {
          // حدث غير صالح ⇒ يُتجاهل بأمان ولا يكسر المحادثة.
        }
      }
    }
  } finally {
    window.clearTimeout(idleTimer);
    void reader.cancel().catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/* البثّ                                                              */
/* ------------------------------------------------------------------ */

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const status = gatewayStatus();
  const { request, onEvent, signal } = options;

  if (status.mode === "disabled") {
    onEvent({
      type: "error",
      messageId: "m-disabled",
      error: {
        code: "not_configured",
        message: status.detail,
        retryable: false,
      },
    });
    return;
  }

  if (status.mode === "dev") {
    // يُحمَّل فقط في وضع التطوير/العرض — لا يدخل حزمة الإنتاج.
    const { runDevAssistant, createDevState } = await import("@/services/ai/devAssistant");
    await runDevAssistant({
      request,
      ctx: options.ctx,
      state: options.devState ?? createDevState(),
      emit: onEvent,
      signal,
    });
    return;
  }

  const endpoint = `${env.ai.url}/api/ai/chat`; // same-origin ⇒ مسار نسبي
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        onEvent({
          type: "error",
          messageId: "m-rate",
          error: { code: "rate_limited", message: "الطلبات كثيرة الآن. حاول بعد قليل.", retryable: true },
        });
        return;
      }
      if (response.status === 401 || response.status === 403) {
        onEvent({
          type: "error",
          messageId: "m-auth",
          error: { code: "unauthorized", message: "تعذّر التحقق من الجلسة مع بوابة المساعد.", retryable: false },
        });
        return;
      }
      onEvent({
        type: "error",
        messageId: "m-provider",
        error: { code: "provider_unavailable", message: "خدمة المساعد غير متاحة الآن.", retryable: true },
      });
      return;
    }

    await readSseStream(response, onEvent, signal);
  } catch (error) {
    if (signal?.aborted) {
      onEvent({ type: "error", messageId: "m-aborted", error: { code: "aborted", message: "تم إيقاف الرد.", retryable: true } });
      return;
    }
    void error;
    onEvent({
      type: "error",
      messageId: "m-network",
      error: { code: "network", message: "تعذّر الوصول إلى بوابة المساعد. تحقق من الاتصال.", retryable: true },
    });
  }
}

/** هل يستطيع المساعد رفع صور في هذا البناء والوضع الحالي؟ */
export function uploadsSupported(): boolean {
  return env.ai.uploads && gatewayStatus().mode !== "disabled";
}

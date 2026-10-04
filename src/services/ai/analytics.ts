/**
 * أحداث تحليلات المساعد.
 *
 * ضمانات:
 *  - لا يُرسَل أي نص من المحادثة، ولا معرّفات شخصية، ولا روابط صور.
 *  - الأرقام تُحوَّل إلى "نطاقات" (bands) حتى لا تصبح بصمة تعريفية.
 *  - كل شيء ملفوف بـ try/catch — التحليلات لا تُعطّل المحادثة أبدًا.
 */
import { track } from "@/services/analytics";
import type { AiBlock, AiLocale } from "@/types/ai";

export type AiEntryPoint = "launcher" | "cta" | "contextual" | "restored";

function band(value: number, steps: number[]): string {
  for (const step of steps) {
    if (value <= step) return `<=${step}`;
  }
  return `>${steps[steps.length - 1]}`;
}

export function textBucket(value: number): string {
  return band(value, [40, 120, 300, 600]);
}

export function sizeBucket(bytes: number): string {
  return band(bytes, [200_000, 1_000_000, 3_000_000]);
}

export function savingsBucket(savings: number): string {
  if (savings <= 0) return "none";
  return band(savings, [500, 2000, 6000, 15000]);
}

export function aiTrack(): {
  opened: (entry: AiEntryPoint, path: string, demo: boolean) => void;
  closed: (path: string, turns: number, durationMs: number) => void;
  messageSent: (input: {
    path: string;
    locale: AiLocale;
    length: number;
    hasAttachment: boolean;
    hasProductContext: boolean;
    intent?: string;
  }) => void;
  responseReceived: (input: {
    path: string;
    demo: boolean;
    latencyMs: number;
    blocks: AiBlock[];
    tools: string[];
    sourcesCount: number;
    textLength: number;
  }) => void;
  toolCalled: (name: string, state: "started" | "succeeded" | "failed", path: string, ms?: number) => void;
  toolFailed: (name: string, path: string, code?: string) => void;
  productCardClick: (productId: string, cta: "view" | "add_to_cart" | "compare" | "fit", position: number, path: string) => void;
  carouselBrowsed: (items: number, position: number, path: string) => void;
  addToCart: (productId: string, ok: boolean, path: string) => void;
  comparisonViewed: (productIds: string[], source: "chat" | "compare_page") => void;
  calculatorUsed: (mode: string, months: number, savings: number, fromChat: boolean) => void;
  advisorUsed: (usage: string | undefined, household: number | undefined, fromChat: boolean) => void;
  bookingStarted: (serviceType: string | undefined, city: string | undefined, fromChat: boolean) => void;
  attachmentUploaded: (kind: string, mime: string, sizeBytes: number, accepted: boolean) => void;
  handoffRequested: (reason: string, consented: boolean, channel: string, path: string) => void;
  feedback: (rating: "up" | "down", messageId: string, tools: string[], reason?: string) => void;
  error: (code: string, path: string, retryable: boolean) => void;
  stopped: (path: string, atLength: number) => void;
  quickReply: (text: string, path: string) => void;
  knowledgeGap: (topic: string, path: string) => void;
} {
  return {
    opened: (entry, path, demo) => track("ai_chat_opened", { entry, path, demo }),
    closed: (path, turns, duration_ms) => track("ai_chat_closed", { path, turns, duration_ms }),
    messageSent: ({ path, locale, length, hasAttachment, hasProductContext, intent }) =>
      track("ai_message_sent", {
        path,
        locale,
        length,
        has_attachment: hasAttachment,
        has_product_context: hasProductContext,
        intent,
      }),
    responseReceived: ({ path, demo, latencyMs, blocks, tools, sourcesCount, textLength }) =>
      track("ai_response_received", {
        path,
        demo,
        latency_ms: latencyMs,
        blocks: blocks.map((block) => block.type),
        tools,
        sources_count: sourcesCount,
        text_length: textLength,
      }),
    toolCalled: (name, state, path, ms) => track("ai_tool_called", { name, state, ms, path }),
    toolFailed: (name, path, code) => track("ai_tool_failed", { name, code, path }),
    productCardClick: (product_id, cta, position, path) =>
      track("ai_product_card_click", { product_id, cta, position, path }),
    carouselBrowsed: (items, position, path) => track("ai_carousel_browsed", { items, position, path }),
    addToCart: (product_id, ok, path) => track("ai_add_to_cart", { product_id, ok, path }),
    comparisonViewed: (product_ids, source) => track("ai_comparison_viewed", { product_ids, source }),
    calculatorUsed: (mode, months, savings, from_chat) =>
      track("ai_calculator_used", { mode, months, savings_band: savingsBucket(savings), from_chat }),
    advisorUsed: (usage, household, from_chat) => track("ai_advisor_used", { usage, household, from_chat }),
    bookingStarted: (service_type, city, from_chat) => track("ai_service_booking_started", { service_type, city, from_chat }),
    attachmentUploaded: (kind, mime, sizeBytes, accepted) =>
      track("ai_attachment_uploaded", { kind, mime, size_band: sizeBucket(sizeBytes), accepted }),
    handoffRequested: (reason, consented, channel, path) => track("ai_handoff_requested", { reason, consented, channel, path }),
    feedback: (rating, message_id, tools, reason) => track("ai_feedback", { rating, reason, message_id, tools }),
    error: (code, path, retryable) => track("ai_error", { code, path, retryable }),
    stopped: (path, at_length) => track("ai_stopped", { path, at_length }),
    quickReply: (text, path) => track("ai_quick_reply_clicked", { text, path }),
    knowledgeGap: (topic, path) => track("ai_knowledge_gap", { topic, path }),
  };
}

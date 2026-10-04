#!/usr/bin/env node
/**
 * بوابة رواء للذكاء الاصطناعي — **مرجع تطويري**.
 *
 * ⚠️ هذا الخادم مرجع تنفيذي لعقد الـ API فقط:
 *   - يعمل بمزوّد وهمي (`mock`) ما لم يوضع `AI_PROVIDER_API_KEY` في بيئة الخادم.
 *   - لا يتصل بأي مزوّد حقيقي في هذا المستودع، ولا يحتوي أي مفتاح.
 *   - الواجهة الأمامية لا تعرف عنه شيئًا سوى `POST /api/ai/chat`.
 *
 * ما ينفّذه فعليًا (وهو الجزء القابل للنقل إلى الإنتاج كما هو):
 *   - تحقق المدخلات، حدود المعدّل، حدود الحجم، مهلة زمنية، سجل بلا محتوى.
 *   - سجلّ أدوات مسموح به فقط (allowlist) مع تحقق من وسائط كل أداة على الخادم.
 *   - تنقية بيانات الدخول الحساسة ومنع تمريرها للمزوّد.
 *   - عقد SSE كامل: meta / delta / block / tool / sources / done / error.
 *
 * التشغيل:
 *   node server/ai-server.mjs
 *   VITE_AI_URL=http://localhost:8787 npm run dev
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* الإعدادات — تُقرأ من بيئة الخادم فقط (لا شيء منها في حزمة المتصفح)  */
/* ------------------------------------------------------------------ */

const PORT = Number(process.env.AI_GATEWAY_PORT ?? 8787);
const PROVIDER = process.env.AI_PROVIDER ?? "mock";
const PROVIDER_KEY = process.env.AI_PROVIDER_API_KEY ?? "";
const PROVIDER_BASE_URL = process.env.AI_PROVIDER_BASE_URL ?? "";
const MODEL_FAST = process.env.AI_MODEL_FAST ?? "fast";
const MODEL_STRONG = process.env.AI_MODEL_STRONG ?? "strong";
const MODEL_VISION = process.env.AI_MODEL_VISION ?? "vision";
const GATEWAY_TOKEN = process.env.AI_GATEWAY_TOKEN ?? "";
const ALLOWED_ORIGINS = (process.env.AI_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_TURNS = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 20;
const TOOL_TIMEOUT_MS = 8_000;
const UPSTREAM_TIMEOUT_MS = 30_000;
/** مزوّد وهمي يمثل "غير متصل". */
const PROVIDER_READY = PROVIDER !== "mock" && PROVIDER_KEY.length > 0;

/* ------------------------------------------------------------------ */
/* مُوجّه النظام (System prompt) — مركزي على الخادم فقط                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `أنت «مساعد رواء»، مساعد متجر رواء لمعالجة المياه.
- عربي أولًا (فصحى مبسطة بلمسة خليجية)، وإن خاطبك المستخدم بالإنجليزية فأجب بالإنجليزية.
- مختصر ومهني وغير ضاغط على الشراء. لا تُطيل الشرح ولا تستخدم نبرة بيعية.
- لا تُخبر أبدًا بأي سعر أو خصم أو توفر أو ضمان أو مواصفة أو موديل أو صورة أو مدة توصيل أو توافق لم تأتِ من نتيجة أداة.
- إذا لم تتوفر البيانات، قل إنك لا تملك المعلومة، أو اطلب معلومة ناقصة واحدة، أو اعرض التحويل لفريق بشري.
- يجوز لك طلب: رقم الموديل، صورة الملصق، عدد الأفراد، الميزانية، المدينة.
- ممنوع تمامًا: معلومات طبية، ادّعاء إزالة 100% من الملوثات، وعود بنتائج ضمان/استرجاع، أو طلب بيانات بطاقة/كلمة مرور/رمز تحقق.
- استخدم الأدوات المتاحة فقط، ولا تخترع أسماء أدوات أو حقولًا جديدة.
- كل مخرجاتك نصوص عربية/إنجليزية عادية؛ العرض المنظّم يتولاه الخادم عبر الكتل.`;

/* ------------------------------------------------------------------ */
/* سجلّ الأدوات — مرآة لعقد الواجهة (allowlist + تحقق الوسائط)          */
/* ------------------------------------------------------------------ */

const TOOLS = {
  search_products: { tier: "read", args: { search: "string", category: "string?", limit: "number?" } },
  get_product: { tier: "read", args: { id: "string" } },
  list_products_by_category: { tier: "read", args: { category: "string", sort: "string?", limit: "number?" } },
  check_availability: { tier: "read", args: { id: "string", city: "string?" } },
  get_price_quote: { tier: "read", args: { id: "string", quantity: "number?" } },
  compare_products: { tier: "read", args: { ids: "array" } },
  get_product_media: { tier: "read", args: { id: "string" } },
  find_compatible_parts: { tier: "read", args: { model: "string?" } },
  get_device_cartridge_set: { tier: "read", args: { deviceId: "string?", model: "string?" } },
  get_maintenance_schedule: { tier: "read", args: { deviceId: "string?", productId: "string?" } },
  get_knowledge: { tier: "read", args: { query: "string", kind: "string?" } },
  get_service_availability: { tier: "read", args: { city: "string", district: "string?" } },
  get_available_slots: { tier: "read", args: { city: "string", serviceType: "string?" } },
  get_payment_methods: { tier: "read", args: {} },
  track_order: { tier: "read", args: { orderNumber: "string", contact: "string?" } },
  list_my_orders: { tier: "read", args: {}, auth: true },
  get_my_devices: { tier: "read", args: {}, auth: true },
  get_warranty_status: { tier: "read", args: { deviceId: "string?" }, auth: true },
  check_return_eligibility: { tier: "read", args: { orderNumber: "string" } },
  recommend_systems: { tier: "read", args: { usage: "string", users: "string?", budget: "number?" } },
  calculate_savings: { tier: "read", args: { people: "number", months: "number?" } },
  save_to_wishlist: { tier: "user_action", args: { id: "string" } },
  create_service_booking: { tier: "sensitive", args: { serviceType: "string", city: "string", confirmed: "boolean" } },
  submit_return_request: { tier: "sensitive", args: { orderNumber: "string", reason: "string", confirmed: "boolean" } },
  submit_warranty_claim: { tier: "sensitive", args: { deviceId: "string", issue: "string", confirmed: "boolean" } },
  request_human_handoff: { tier: "user_action", args: { topic: "string", summary: "string?", confirmed: "boolean" } },
};

const SENSITIVE_PATTERNS = [
  /\b(?:\d[ -]*?){13,19}\b/, // PAN
  /\b(?:cvv|cvc)\b\s*[:：-]?\s*\d{3,4}/i,
  /\b(?:otp|رمز\s*(?:التحقق|التأكيد))\b\s*[:：-]?\s*\d{4,8}/i,
  /كلمة\s*(?:المرور|السر)\s*[:：-]/,
];

function redact(value) {
  let output = String(value ?? "");
  SENSITIVE_PATTERNS.forEach((pattern) => {
    output = output.replace(pattern, "[محذوف]");
  });
  return output;
}

function containsCredentials(value) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(String(value ?? "")));
}

/* ------------------------------------------------------------------ */
/* طبقة المزوّد — واجهة واحدة، مزوّدان: mock و HTTP متوافق مع OpenAI    */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} AiProvider
 * @property {(input: object) => Promise<{ text: string, stream?: AsyncIterable<string>, blocks?: unknown[], model: string }>} complete
 * @property {boolean} ready
 */

const mockProvider = {
  ready: false,
  model: "mock-dev",
  async complete({ message, locale, tools }) {
    // لا اتصال بأي شبكة. الجواب يوضح الحقيقة ويسلّم للفريق البشري.
    const text =
      locale === "en"
        ? "This reference gateway runs without a model provider. Connect AI_PROVIDER (and keep the key server-side) to get real answers."
        : "هذه بوابة مرجعية تعمل بدون مزوّد نموذج. اربط AI_PROVIDER وضع المفتاح في بيئة الخادم فقط للحصول على ردود حقيقية.";
    return {
      text,
      model: "mock-dev",
      blocks: [
        { type: "notice", tone: "warning", title: "مزوّد غير متصل", text },
        {
          type: "human_handoff",
          topic: "طلب متابعة",
          summary: redact(message).slice(0, 200),
          topics: [],
          channel: "support_page",
        },
      ],
      tools: tools ?? [],
    };
  },
};

/** مزوّد HTTP بصيغة متوافقة مع Chat Completions — يُستخدم فقط عند وجود مفتاح. */
function createHttpProvider() {
  return {
    ready: true,
    model: MODEL_STRONG,
    async complete({ message, history, locale, systemPrompt }) {
      const body = {
        model: MODEL_STRONG,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          ...(history ?? []).map((turn) => ({ role: turn.role, content: turn.text })),
          { role: "user", content: `${locale === "en" ? "[lang:en]" : "[lang:ar]"}\n${message}` },
        ],
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      try {
        const response = await fetch(`${PROVIDER_BASE_URL || "https://api.example.invalid"}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${PROVIDER_KEY}` },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = new Error(`provider ${response.status}`);
          error.code = "provider_unavailable";
          throw error;
        }
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content ?? "";
        return { text: typeof text === "string" ? text : "", model: MODEL_STRONG, blocks: [] };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function selectProvider({ needsVision }) {
  if (!PROVIDER_READY) return mockProvider;
  const provider = createHttpProvider();
  if (needsVision) provider.model = MODEL_VISION;
  return provider;
}

export function modelFor(kind) {
  if (kind === "fast") return MODEL_FAST;
  if (kind === "vision") return MODEL_VISION;
  return MODEL_STRONG;
}

/* ------------------------------------------------------------------ */
/* حدود المعدّل + الجلسات                                             */
/* ------------------------------------------------------------------ */

const buckets = new Map();

function rateLimit(key) {
  const now = Date.now();
  const entry = buckets.get(key) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  buckets.set(key, entry);
  return {
    ok: entry.count <= RATE_LIMIT_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}

/* ------------------------------------------------------------------ */
/* أدوات الخادم — تنفَّذ عبر واجهات المتجر (هنا: adapter تجريبي)         */
/* ------------------------------------------------------------------ */

/**
 * في الإنتاج: تُستبدل هذه الدالة بنداءات داخلية إلى خدمات الكتالوج/الطلبات/
 * المواعيد (نفس خدمات `src/services` على الخادم) عبر `STORE_API_URL`.
 * هنا تعيد "غير متاح" بصراحة بدل اختراع بيانات.
 */
export async function callStoreTool(name, args, ctx = {}) {
  const spec = TOOLS[name];
  if (!spec) return { ok: false, error: "UNKNOWN_TOOL" };
  const argsCheck = validateToolArgs(name, args);
  if (!argsCheck.ok) return { ok: false, error: argsCheck.error };
  if (spec.auth && !ctx.userId) return { ok: false, error: "AUTH_REQUIRED" };
  if (spec.tier === "sensitive" && args?.confirmed !== true) return { ok: false, error: "CONFIRMATION_REQUIRED" };

  // كل استدعاء أداة مقيّد بمهلة — أداة بطيئة لا تُجمّد الرد.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
  try {
    return { ok: false, error: "STORE_API_NOT_CONNECTED", detail: `${name} يحتاج ربط STORE_API_URL.` };
  } finally {
    clearTimeout(timer);
  }
}

/** يتحقق من وسائط الأداة على الخادم — لا ثقة بأي وسيطات قادمة من النموذج. */
export function validateToolArgs(name, args) {
  const spec = TOOLS[name];
  if (!spec) return { ok: false, error: "UNKNOWN_TOOL" };
  const allowed = Object.keys(spec.args);
  for (const key of Object.keys(args ?? {})) {
    if (!allowed.includes(key)) return { ok: false, error: `UNEXPECTED_ARG:${key}` };
  }
  for (const [key, kind] of Object.entries(spec.args)) {
    const value = args?.[key];
    if (value === undefined) {
      if (!kind.endsWith("?")) return { ok: false, error: `MISSING_ARG:${key}` };
      continue;
    }
    const type = kind.replace("?", "");
    const valid =
      type === "string"
        ? typeof value === "string" && value.length <= 300
        : type === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : type === "boolean"
            ? typeof value === "boolean"
            : type === "array"
              ? Array.isArray(value) && value.length > 0 && value.length <= 4
              : false;
    if (!valid) return { ok: false, error: `INVALID_ARG:${key}` };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* التحقق من الطلب                                                    */
/* ------------------------------------------------------------------ */

export function validateRequest(body) {
  if (typeof body !== "object" || body === null) return { ok: false, error: "invalid_body" };
  const { conversationId, message, locale, context, history, attachment, summary } = body;

  if (typeof conversationId !== "string" || conversationId.length < 3 || conversationId.length > 80) {
    return { ok: false, error: "invalid_conversation" };
  }
  if (typeof message !== "string" || message.trim().length === 0) return { ok: false, error: "empty_message" };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: "message_too_long" };
  if (containsCredentials(message)) return { ok: false, error: "credentials_detected" };
  if (locale !== "ar" && locale !== "en") return { ok: false, error: "invalid_locale" };
  if (typeof context !== "object" || context === null || typeof context.path !== "string") {
    return { ok: false, error: "invalid_context" };
  }
  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) return { ok: false, error: "invalid_history" };
    for (const turn of history) {
      if (!turn || (turn.role !== "user" && turn.role !== "assistant") || typeof turn.text !== "string") {
        return { ok: false, error: "invalid_history" };
      }
    }
  }
  if (summary !== undefined && (typeof summary !== "string" || summary.length > 2000)) {
    return { ok: false, error: "invalid_summary" };
  }
  if (attachment !== undefined) {
    const mime = attachment?.mimeType;
    const size = attachment?.sizeBytes;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(mime)) return { ok: false, error: "unsupported_attachment" };
    if (typeof size !== "number" || size <= 0 || size > 5 * 1024 * 1024) return { ok: false, error: "attachment_too_large" };
  }
  return {
    ok: true,
    value: {
      conversationId,
      message: message.trim(),
      locale,
      context,
      history: history ?? [],
      attachment,
      summary,
    },
  };
}

/* ------------------------------------------------------------------ */
/* SSE                                                               */
/* ------------------------------------------------------------------ */

function sseHeaders(origin) {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store, no-transform",
    connection: "keep-alive",
    "access-control-allow-origin": origin ?? "null",
    vary: "origin",
  };
}

function openStream(res) {
  res.writeHead(200, sseHeaders(res.__origin));
  res.write(": ok\n\n");
}

function send(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/* ------------------------------------------------------------------ */
/* الخادم                                                             */
/* ------------------------------------------------------------------ */

export function createAiServer() {
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const originAllowed = !origin || ALLOWED_ORIGINS.includes(origin);

    // CORS: نرد فقط على الأصول المسجّلة.
    if (origin && originAllowed) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader("access-control-allow-headers", "content-type, authorization");
      res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(origin && !originAllowed ? 403 : 204);
      res.end();
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, provider: PROVIDER_READY ? PROVIDER : "mock", ready: PROVIDER_READY }));
      return;
    }

    if (req.method !== "POST" || !req.url?.startsWith("/api/ai/chat")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    if (origin && !originAllowed) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "origin_not_allowed" }));
      return;
    }

    // مصادقة اختيارية بين الموقع والبوابة (وليست مصادقة المستخدم النهائي).
    if (GATEWAY_TOKEN && req.headers.authorization !== `Bearer ${GATEWAY_TOKEN}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    const clientKey = `${req.socket.remoteAddress ?? "unknown"}`;
    const limit = rateLimit(clientKey);
    res.setHeader("x-ratelimit-remaining", String(limit.remaining));
    if (!limit.ok) {
      res.writeHead(429, { "content-type": "application/json", "retry-after": "60" });
      res.end(JSON.stringify({ error: "rate_limited" }));
      return;
    }

    let raw = "";
    let aborted = false;
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        aborted = true;
        break;
      }
    }
    if (aborted) {
      res.writeHead(413, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "payload_too_large" }));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw || "{}");
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_json" }));
      return;
    }

    const validated = validateRequest(parsed);
    if (!validated.ok) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: validated.error }));
      return;
    }

    const request = validated.value;
    const messageId = `m-${randomUUID().slice(0, 8)}`;
    const userId = null; // في الإنتاج: يُشتق من جلسة موقّعة (كوكي HttpOnly).
    const provider = selectProvider({ needsVision: Boolean(request.attachment) });

    // لا نص محادثة في السجلات — فقط أطوال ورموز.
    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        event: "ai_chat",
        conversationId: request.conversationId,
        locale: request.locale,
        chars: request.message.length,
        attachment: request.attachment ? request.attachment.kind : null,
        authenticated: userId !== null,
        provider: provider.ready ? PROVIDER : "mock",
      }),
    );

    openStream(res);
    send(res, {
      type: "meta",
      conversationId: request.conversationId,
      messageId,
      model: provider.ready ? provider.model : "mock-dev",
      demo: !provider.ready,
    });

    try {
      const answer = await provider.complete({
        message: request.message,
        history: request.history,
        locale: request.locale,
        systemPrompt: SYSTEM_PROMPT,
        tools: [],
      });

      // بثّ نصي بسيط (المزوّد الحقيقي سيبثّ من الـ upstream مباشرة).
      const parts = String(answer.text ?? "").match(/[^.!؟\n]+[.!؟]?/g) ?? [];
      for (const part of parts) {
        if (res.writableEnded) break;
        send(res, { type: "delta", messageId, text: `${part.trim()} ` });
      }

      for (const block of answer.blocks ?? []) {
        const safe = sanitizeBlock(block);
        if (safe) send(res, { type: "block", messageId, block: safe });
      }

      send(res, { type: "done", messageId });
    } catch (error) {
      const code = error?.code === "provider_unavailable" ? "provider_unavailable" : "unknown";
      send(res, { type: "error", messageId, error: { code, message: "تعذّر إكمال الرد.", retryable: true } });
    } finally {
      res.end();
    }
  });
}

/**
 * تحقق خادمي من الكتل قبل إرسالها للواجهة.
 * (الواجهة تتحقق مرة أخرى — الدفاع على طبقتين، لأن بيانات المنتجات غير موثوقة.)
 */
export function sanitizeBlock(block) {
  if (typeof block !== "object" || block === null) return undefined;
  const type = block.type;
  const text = (value, max = 600) => redact(String(value ?? "")).slice(0, max);
  switch (type) {
    case "text":
      return { type: "text", text: text(block.text, 1200) };
    case "notice":
      return {
        type: "notice",
        tone: ["info", "warning", "success", "danger"].includes(block.tone) ? block.tone : "info",
        title: block.title ? text(block.title, 120) : undefined,
        text: text(block.text),
      };
    case "product_card":
      return typeof block.productId === "string" ? { type: "product_card", productId: block.productId } : undefined;
    case "human_handoff":
      return {
        type: "human_handoff",
        topic: text(block.topic, 160) || "طلب متابعة",
        summary: text(block.summary),
        topics: Array.isArray(block.topics) ? block.topics.slice(0, 6).map((item) => text(item, 120)) : [],
        orderNumber: typeof block.orderNumber === "string" ? block.orderNumber.slice(0, 24) : undefined,
        channel: "support_page",
      };
    default:
      // أي نوع غير مسجّل يُسقَط — لا HTML ولا كتل مجهولة.
      return undefined;
  }
}

if (process.argv[1] && process.argv[1].endsWith("ai-server.mjs")) {
  const server = createAiServer();
  server.listen(PORT, "0.0.0.0", () => {
    const mode = PROVIDER_READY ? `provider=${PROVIDER}` : "provider=mock (no real model connected)";
    console.log(`[ai-gateway] listening on http://0.0.0.0:${PORT} · ${mode}`);
    console.log(`[ai-gateway] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

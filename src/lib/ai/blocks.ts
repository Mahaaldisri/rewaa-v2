/**
 * التحقق من صحة الكتل القادمة من المساعد (structured response validation).
 *
 * الخادم يتحقق من المخطط أيضًا، لكن الواجهة لا تثق بأي شيء يصل عبر الشبكة:
 * كل كتلة تُفحَص هنا، وما لا يُطابق المخطط يُسقَط بهدوء (`dropped`) بدل عرض
 * بطاقة وهمية أو رابط صورة غير معروف.
 *
 * منتج غير موجود في الكتالوج ⇒ لا تُعرض البطاقة إطلاقًا.
 * إجراء غير معروف ⇒ يُتجاهل بأمان.
 */
import type {
  AiActionBlock,
  AiBlock,
  AiCalculatorBlock,
  AiClientAction,
  AiComparisonBlock,
  AiHandoffBlock,
  AiImageBlock,
  AiMaintenanceBlock,
  AiNoticeBlock,
  AiOrderBlock,
  AiProductCarouselBlock,
  AiProductCardBlock,
  AiQuickReply,
  AiQuickRepliesBlock,
  AiServiceBlock,
  AiSourceRef,
  AiSourcesBlock,
  AiTextBlock,
} from "@/types/ai";
import { sanitizeText } from "./sanitize";

/** واجهة يستخدمها المُتحقِّق للوصول إلى الكتالوج دون ربط `lib` بالخدمات. */
export interface AiBlockResolver {
  /** هل المعرّف منتج حقيقي في الكتالوج؟ */
  hasProduct(productId: string): boolean;
  /** تحويل slug إلى معرّف منتج عند الحاجة. */
  productIdFromSlug(slug: string): string | undefined;
  /** هل هذه صورة مسموح عرضها (من وسائط المنتج أو من صور الموقع)؟ */
  allowedImageUrl(url: string, productId?: string): boolean;
}

export interface CoerceResult {
  blocks: AiBlock[];
  /** أنواع/أسباب ما أُسقط — تُستخدم للتحليلات (`ai_invalid_block`). */
  dropped: string[];
}

export const AI_MAX_BLOCKS = 8;
export const AI_MAX_CAROUSEL_ITEMS = 4;
export const AI_MAX_QUICK_REPLIES = 4;
export const AI_MAX_COMPARE_PRODUCTS = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, max = 400): string {
  return sanitizeText(value, max);
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanField(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function idList(value: unknown, resolver: AiBlockResolver, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = resolver.hasProduct(entry) ? entry : resolver.productIdFromSlug(entry);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length >= limit) break;
  }
  return ids;
}

const CLIENT_ACTION_KINDS = new Set([
  "add_to_cart",
  "open_compare",
  "open_calculator",
  "open_booking",
  "open_form",
  "open_handoff",
  "login",
]);

const CLIENT_FORMS = new Set(["booking", "return", "warranty", "tracking", "contact"]);

/** الإجراءات المسموحة فقط — أي شيء آخر يُتجاهل. */
function coerceAction(raw: unknown, resolver: AiBlockResolver): AiClientAction | undefined {
  if (!isRecord(raw)) return undefined;
  const kind = typeof raw.kind === "string" ? raw.kind : "";
  if (!CLIENT_ACTION_KINDS.has(kind)) return undefined;

  switch (kind) {
    case "add_to_cart": {
      const productId = idList([raw.productId], resolver, 1)[0];
      if (!productId) return undefined;
      const quantity = numberField(raw.quantity);
      return { kind: "add_to_cart", productId, quantity: quantity && quantity > 0 ? Math.min(10, Math.round(quantity)) : 1 };
    }
    case "open_compare": {
      const productIds = idList(raw.productIds, resolver, AI_MAX_COMPARE_PRODUCTS);
      return productIds.length >= 2 ? { kind: "open_compare", productIds } : undefined;
    }
    case "open_calculator": {
      const productId = idList([raw.productId], resolver, 1)[0];
      const months = numberField(raw.months);
      const householdSize = numberField(raw.householdSize);
      return {
        kind: "open_calculator",
        productId,
        months: months && months > 0 ? Math.min(240, Math.round(months)) : undefined,
        householdSize: householdSize && householdSize > 0 ? Math.min(20, Math.round(householdSize)) : undefined,
      };
    }
    case "open_booking": {
      const productId = idList([raw.productId], resolver, 1)[0];
      return { kind: "open_booking", productId, serviceType: stringField(raw.serviceType, 60) || undefined };
    }
    case "open_form": {
      const form = typeof raw.form === "string" && CLIENT_FORMS.has(raw.form) ? (raw.form as "booking" | "return" | "warranty" | "tracking" | "contact") : undefined;
      if (!form) return undefined;
      const query: Record<string, string> = {};
      if (isRecord(raw.query)) {
        Object.entries(raw.query).slice(0, 6).forEach(([key, value]) => {
          const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
          const safeValue = stringField(value, 80);
          if (safeKey && safeValue) query[safeKey] = safeValue;
        });
      }
      return { kind: "open_form", form, query: Object.keys(query).length > 0 ? query : undefined };
    }
    case "open_handoff":
      return { kind: "open_handoff", topic: stringField(raw.topic, 120) || undefined };
    case "login":
      return { kind: "login", reason: stringField(raw.reason, 160) || undefined };
    default:
      return undefined;
  }
}

function textBlock(raw: Record<string, unknown>): AiTextBlock | undefined {
  const text = stringField(raw.text, 2000);
  return text.length > 0 ? { type: "text", text } : undefined;
}

function productCardBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiProductCardBlock | undefined {
  const productId = idList([raw.productId ?? raw.slug], resolver, 1)[0];
  if (!productId) return undefined;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons
        .map((entry) => stringField(entry, 220))
        .filter((entry) => entry.length > 0)
        .slice(0, 4)
    : undefined;
  return { type: "product_card", productId, reasons: reasons && reasons.length > 0 ? reasons : undefined };
}

function carouselBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiProductCarouselBlock | undefined {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const coerced: AiProductCarouselBlock["items"] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const card = productCardBlock(item, resolver);
    if (!card) continue;
    coerced.push({ productId: card.productId, reasons: card.reasons });
    if (coerced.length >= AI_MAX_CAROUSEL_ITEMS) break;
  }
  if (coerced.length === 0) return undefined;
  // بطاقة واحدة لا تُعرض كـ«carousel».
  if (coerced.length === 1) return { type: "product_carousel", title: stringField(raw.title, 120) || undefined, items: coerced };
  return { type: "product_carousel", title: stringField(raw.title, 120) || undefined, items: coerced };
}

function imageBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiImageBlock | undefined {
  const productId = idList([raw.productId], resolver, 1)[0];
  const url = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
  // الصور تأتي من الكتالوج أو من `public/images` فقط — لا روابط من إنتاج النموذج.
  const safeUrl = url && resolver.allowedImageUrl(url, productId) ? url : undefined;
  if (!productId && !safeUrl) return undefined;
  const alt = stringField(raw.alt, 200) || "صورة";
  const caption = stringField(raw.caption, 200) || undefined;
  return { type: "image", productId, imageUrl: safeUrl, alt, caption };
}

function comparisonBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiComparisonBlock | undefined {
  const productIds = idList(raw.productIds, resolver, AI_MAX_COMPARE_PRODUCTS);
  if (productIds.length < 2) return undefined;

  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: AiComparisonBlock["rows"] = [];
  for (const row of rowsRaw) {
    if (!isRecord(row)) continue;
    const label = stringField(row.label, 80);
    const values = Array.isArray(row.values) ? row.values.map((entry) => stringField(entry, 120)) : [];
    if (!label || values.length === 0) continue;
    // عدد القيم يجب أن يطابق عدد المنتجات، وإلا فالصف مضلِّل.
    const aligned = productIds.map((_, index) => values[index] ?? "—");
    rows.push({ label, values: aligned, emphasis: booleanField(row.emphasis) });
    if (rows.length >= 14) break;
  }
  if (rows.length === 0) return undefined;
  return { type: "comparison", productIds, rows, note: stringField(raw.note, 240) || undefined };
}

function quickRepliesBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiQuickRepliesBlock | undefined {
  const list = Array.isArray(raw.replies) ? raw.replies : [];
  const replies: AiQuickReply[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const label = stringField(item.label, 60);
    if (!label) continue;
    const action = coerceAction(item.action, resolver);
    const send = stringField(item.send, 200) || undefined;
    if (!action && !send) continue;
    replies.push({ id: stringField(item.id, 40) || `qr-${replies.length}`, label, send, action });
    if (replies.length >= AI_MAX_QUICK_REPLIES) break;
  }
  return replies.length > 0 ? { type: "quick_replies", replies } : undefined;
}

function actionBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiActionBlock | undefined {
  const action = coerceAction(raw.action, resolver);
  const label = stringField(raw.label, 80);
  if (!action || !label) return undefined;
  return {
    type: "action",
    label,
    action,
    confirmRequired: booleanField(raw.confirmRequired),
    confirmLabel: stringField(raw.confirmLabel, 80) || undefined,
  };
}

const CALC_MODES = new Set(["estimate", "purchases"]);
const CALC_FREQUENCIES = new Set(["weekly", "monthly"]);

function calculatorBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiCalculatorBlock | undefined {
  const input = isRecord(raw.input) ? raw.input : undefined;
  if (!input) return undefined;
  const mode = typeof input.mode === "string" && CALC_MODES.has(input.mode) ? (input.mode as "estimate" | "purchases") : "estimate";
  const frequency =
    typeof input.frequency === "string" && CALC_FREQUENCIES.has(input.frequency) ? (input.frequency as "weekly" | "monthly") : "monthly";

  const clamp = (value: number | undefined, min: number, max: number, fallback: number) =>
    value === undefined ? fallback : Math.min(max, Math.max(min, value));

  const productId = idList([input.productId], resolver, 1)[0];

  return {
    type: "calculator_result",
    input: {
      mode,
      people: clamp(numberField(input.people), 1, 20, 4),
      litersPerPersonPerDay: clamp(numberField(input.litersPerPersonPerDay), 0.5, 15, 3),
      unitLiters: clamp(numberField(input.unitLiters), 0.1, 100, 18.9),
      unitPrice: clamp(numberField(input.unitPrice), 0, 1000, 12),
      unitsPerPeriod: clamp(numberField(input.unitsPerPeriod), 0, 500, 6),
      frequency,
      months: clamp(numberField(input.months), 6, 240, 60),
      productId,
      devicePrice: numberField(input.devicePrice),
      installationCost: numberField(input.installationCost),
      replacementKitPrice: numberField(input.replacementKitPrice),
      replacementIntervalMonths: numberField(input.replacementIntervalMonths),
      maintenancePrice: numberField(input.maintenancePrice),
      maintenanceIntervalMonths: numberField(input.maintenanceIntervalMonths),
    },
    note: stringField(raw.note, 240) || undefined,
  };
}

function serviceBlock(raw: Record<string, unknown>): AiServiceBlock | undefined {
  const city = stringField(raw.city, 60) || undefined;
  const serviceType = stringField(raw.serviceType, 60) || undefined;
  const serviceSlug = stringField(raw.serviceSlug, 60) || undefined;
  if (!city && !serviceType && !serviceSlug) return undefined;
  return {
    type: "service_card",
    serviceSlug,
    serviceType,
    city,
    district: stringField(raw.district, 60) || undefined,
    refreshAvailability: booleanField(raw.refreshAvailability) ?? Boolean(city),
    note: stringField(raw.note, 240) || undefined,
  };
}

function orderBlock(raw: Record<string, unknown>): AiOrderBlock | undefined {
  const orderNumber = stringField(raw.orderNumber, 40).toUpperCase();
  // أرقام الطلبات في هذا المتجر بالشكل RWA-… — أي شيء آخر لا يُعرض.
  if (!/^RWA-[A-Z0-9-]{4,}$/.test(orderNumber)) return undefined;
  return { type: "order_status", orderNumber, refresh: booleanField(raw.refresh) ?? true, note: stringField(raw.note, 240) || undefined };
}

function maintenanceBlock(raw: Record<string, unknown>, resolver: AiBlockResolver): AiMaintenanceBlock | undefined {
  const productId = idList([raw.productId], resolver, 1)[0];
  const deviceId = stringField(raw.deviceId, 60) || undefined;
  const fallbackRaw = isRecord(raw.fallback) ? raw.fallback : undefined;
  const fallback = fallbackRaw
    ? {
        deviceName: stringField(fallbackRaw.deviceName, 120),
        lastChange: stringField(fallbackRaw.lastChange, 40) || undefined,
        nextChange: stringField(fallbackRaw.nextChange, 40) || undefined,
        percentRemaining: numberField(fallbackRaw.percentRemaining),
        cartridgeSetName: stringField(fallbackRaw.cartridgeSetName, 160) || undefined,
      }
    : undefined;
  if (!productId && !deviceId && !fallback?.deviceName) return undefined;
  return { type: "maintenance_card", productId, deviceId, fallback, note: stringField(raw.note, 240) || undefined };
}

const HANDOFF_CHANNELS = new Set(["whatsapp", "support_page", "live_chat_future"]);

function handoffBlock(raw: Record<string, unknown>): AiHandoffBlock | undefined {
  const topic = stringField(raw.topic, 120);
  const summary = stringField(raw.summary, 600);
  if (!topic || !summary) return undefined;
  const channel = typeof raw.channel === "string" && HANDOFF_CHANNELS.has(raw.channel) ? raw.channel : "support_page";
  return {
    type: "human_handoff",
    topic,
    summary,
    topics: Array.isArray(raw.topics)
      ? raw.topics
          .map((entry) => stringField(entry, 120))
          .filter(Boolean)
          .slice(0, 6)
      : [],
    orderNumber: (() => {
      const value = stringField(raw.orderNumber, 40).toUpperCase();
      return /^RWA-[A-Z0-9-]{4,}$/.test(value) ? value : undefined;
    })(),
    channel: channel as AiHandoffBlock["channel"],
    whatsappMessage: stringField(raw.whatsappMessage, 800) || undefined,
  };
}

const NOTICE_TONES = new Set(["info", "warning", "success", "danger"]);

function noticeBlock(raw: Record<string, unknown>): AiNoticeBlock | undefined {
  const text = stringField(raw.text, 500);
  if (!text) return undefined;
  const tone = typeof raw.tone === "string" && NOTICE_TONES.has(raw.tone) ? (raw.tone as AiNoticeBlock["tone"]) : "info";
  return { type: "notice", tone, title: stringField(raw.title, 120) || undefined, text };
}

const SOURCE_KINDS = new Set(["faq", "guide", "policy", "service", "catalog"]);

function coerceSource(raw: unknown): AiSourceRef | undefined {
  if (!isRecord(raw)) return undefined;
  const id = stringField(raw.id, 80);
  const title = stringField(raw.title, 160);
  if (!id || !title) return undefined;
  const kind = typeof raw.kind === "string" && SOURCE_KINDS.has(raw.kind) ? (raw.kind as AiSourceRef["kind"]) : "faq";
  const href = stringField(raw.href, 200);
  return {
    id,
    title,
    kind,
    // الروابط الداخلية فقط — لا روابط خارجية من إنتاج النموذج.
    href: href.startsWith("/") ? href : undefined,
    updatedAt: stringField(raw.updatedAt, 40) || undefined,
  };
}

export function coerceSources(raw: unknown): AiSourceRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(coerceSource).filter((entry): entry is AiSourceRef => entry !== undefined).slice(0, 5);
}

function sourcesBlock(raw: Record<string, unknown>): AiSourcesBlock | undefined {
  const items = coerceSources(raw.items);
  return items.length > 0 ? { type: "sources", items } : undefined;
}

const COERCERS: Record<string, (raw: Record<string, unknown>, resolver: AiBlockResolver) => AiBlock | undefined> = {
  text: (raw) => textBlock(raw),
  product_card: productCardBlock,
  product_carousel: carouselBlock,
  image: imageBlock,
  comparison: comparisonBlock,
  quick_replies: quickRepliesBlock,
  action: actionBlock,
  calculator_result: calculatorBlock,
  service_card: (raw) => serviceBlock(raw),
  order_status: (raw) => orderBlock(raw),
  maintenance_card: maintenanceBlock,
  human_handoff: (raw) => handoffBlock(raw),
  notice: (raw) => noticeBlock(raw),
  sources: (raw) => sourcesBlock(raw),
};

/**
 * يُحوّل كتلًا مجهولة المصدر إلى كتل صالحة للعرض.
 * الكتل الساقطة تُعاد في `dropped` بدل رفع استثناء — الواجهة لا تنكسر أبدًا
 * بسبب رد غير متوقع من المزوّد.
 */
export function coerceBlocks(raw: unknown, resolver: AiBlockResolver): CoerceResult {
  if (!Array.isArray(raw)) return { blocks: [], dropped: ["not-an-array"] };
  const blocks: AiBlock[] = [];
  const dropped: string[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) {
      dropped.push("not-an-object");
      continue;
    }
    const type = typeof entry.type === "string" ? entry.type : "";
    const coercer = COERCERS[type];
    if (!coercer) {
      dropped.push(`unknown-type:${type || "missing"}`);
      continue;
    }
    const block = coercer(entry, resolver);
    if (!block) {
      dropped.push(`invalid:${type}`);
      continue;
    }
    // لا نكرر كتلة نصية فارغة أو شبيهة بالسابقة.
    blocks.push(block);
    if (blocks.length >= AI_MAX_BLOCKS) break;
  }

  return { blocks, dropped };
}

/** يتحقق من كتلة واحدة (يُستخدم لكتل البثّ المتدفّقة). */
export function coerceBlock(raw: unknown, resolver: AiBlockResolver): AiBlock | undefined {
  if (!isRecord(raw)) return undefined;
  const type = typeof raw.type === "string" ? raw.type : "";
  const coercer = COERCERS[type];
  return coercer ? coercer(raw, resolver) : undefined;
}

/** كل إجراءات العميل داخل رسالة — تُستخدم في الاختبارات والتشغيل التلقائي. */
export function collectClientActions(blocks: AiBlock[]): AiClientAction[] {
  const actions: AiClientAction[] = [];
  blocks.forEach((block) => {
    if (block.type === "action") actions.push(block.action);
    if (block.type === "quick_replies") {
      block.replies.forEach((reply) => {
        if (reply.action) actions.push(reply.action);
      });
    }
  });
  return actions;
}

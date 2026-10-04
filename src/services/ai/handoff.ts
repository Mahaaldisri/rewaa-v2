/**
 * تسليم المحادثة إلى فريق بشري (Human Handoff).
 *
 * لا يوجد اتصال وهمي بأي نظام دعم: نبني حزمة تسليم واضحة (ملخص، منتجات
 * نوقشت، رقم طلب، خطوات تمّت، رسائل مفتاحية) **ولا تُشارك إلا بموافقة
 * العميل الصريحة**، ثم تُسلَّم عبر قناة حقيقية موجودة فعلاً (نموذج التواصل /
 * واتساب / البريد) أو عبر بوابة المساعد إن كان الخادم مهيّأً لذلك.
 */
import { contact, whatsappLink } from "@/config/site";
import { redactSensitive, sanitizeText } from "@/lib/ai/sanitize";
import type { AiBlock } from "@/types/ai";
import type { StoredMessage } from "@/services/ai/conversation";

export interface HandoffPayload {
  /** سبب التسليم كما اختاره العميل. */
  reason: string;
  /** ملخص قصير لما جرى في المحادثة. */
  summary: string;
  /** معرّفات/أسماء المنتجات التي نوقشت (من الكتالوج فقط). */
  products: string[];
  /** أرقام الطلبات التي ذُكرت، إن وُجدت. */
  orderNumbers: string[];
  /** الأدوات التي شُغّلت — شفافية للفريق أن ما قيل كان مبنيًا على بيانات. */
  steps: string[];
  /** آخر رسائل العميل (مقلَّمة). */
  keyMessages: string[];
  /** نص جاهز للمشاركة عبر أي قناة. */
  text: string;
  /** روابط القنوات الرسمية. */
  channels: { whatsapp: string; contact: string };
}

const ORDER_PATTERN = /\b(?:RW|ORD|REW)[-\s]?\d{3,}\b/gi;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

export function buildHandoff(options: {
  reason: string;
  messages: StoredMessage[];
  /** معرّفات المنتجات النشطة في المحادثة (من الأدوات). */
  productNames?: string[];
  /** خطوات تقنية نفّذها المساعد. */
  steps?: string[];
}): HandoffPayload {
  const reason = sanitizeText(options.reason, 200);
  const userMessages = options.messages.filter((message) => message.role === "user");
  const keyMessages = userMessages.slice(-3).map((message) => redactSensitive(sanitizeText(message.text, 240)));

  const orderNumbers = unique(
    userMessages
      .map((message) => message.text.match(ORDER_PATTERN) ?? [])
      .flat()
      .map((value) => value.toUpperCase().replace(/\s+/g, "")),
  ).slice(0, 3);

  const products = unique(options.productNames ?? []).slice(0, 6);
  const steps = unique(options.steps ?? []).slice(0, 8);

  const summary = sanitizeText(
    reason ||
      (keyMessages.length > 0
        ? `محادثة مع مساعد رواء حول: ${keyMessages.join(" | ")}`
        : "طلب مساعدة من مساعد رواء"),
    600,
  );

  const lines: string[] = [
    "طلب متابعة من مساعد رواء",
    reason ? `الموضوع: ${reason}` : "",
    products.length > 0 ? `منتجات نوقشت: ${products.join("، ")}` : "",
    orderNumbers.length > 0 ? `أرقام طلبات: ${orderNumbers.join("، ")}` : "",
    steps.length > 0 ? `إجراءات تمّت: ${steps.join("، ")}` : "",
    keyMessages.length > 0 ? `آخر ما ذكره العميل: ${keyMessages.join(" | ")}` : "",
  ].filter(Boolean);

  return {
    reason,
    summary,
    products,
    orderNumbers,
    steps,
    keyMessages,
    text: lines.join("\n"),
    channels: {
      whatsapp: whatsappLink(lines.join("\n")),
      contact: "/help/contact",
    },
  };
}

/** يصوغ سبب التسليم من كتل الرد (وسم `human_handoff` أو فشل أدوات). */
export function handoffReasonFromBlocks(blocks: AiBlock[], fallback: string): string {
  const handoff = blocks.find((block) => block.type === "human_handoff");
  if (handoff && handoff.type === "human_handoff") {
    return sanitizeText(handoff.topic || handoff.summary, 160) || fallback;
  }
  return sanitizeText(fallback, 160);
}

/** أرقام التواصل الرسمية لعرضها في واجهة التسليم. */
export const handoffChannels = {
  phone: contact.phone,
  phoneDisplay: contact.phoneDisplay,
  email: contact.email,
};

/**
 * مساعد رواء الذكي — عقد البيانات (AI contract).
 *
 * هذا الملف هو المصدر الوحيد لشكل كل ما يتبادله الواجهة مع بوابة الذكاء
 * الاصطناعي (`POST /api/ai/chat`). الواجهة لا تتصل بأي مزوّد ذكاء اصطناعي
 * مباشرة، ولا يوجد أي مفتاح أو سر في هذه الطبقة: كل ما هنا يُرسَل ويُستقبَل
 * كنصوص تُعرَض بعد التحقق منها (انظر `src/lib/ai/blocks.ts`).
 *
 * ⚠️ لا يُنشئ النموذج HTML ولا روابط صور ولا أسعارًا نهائية:
 *  - `product_card` يحمل `productId` فقط، والواجهة تجلب السعر والمخزون والصور
 *    الحقيقية من الكتالوج وقت العرض.
 *  - `calculator_result` يحمل مدخلات الحاسبة، والواجهة تعيد الحساب عبر
 *    `src/lib/calculator-logic.ts` حتى لا يعتمد أي رقم مالي على ذاكرة النموذج.
 */

export type AiLocale = "ar" | "en";

/** الأدوات المتاحة للمساعد. الواجهة ترفض أي اسم غير موجود هنا. */
export const AI_TOOL_NAMES = [
  /* قراءة — كتالوج ومنتجات */
  "search_products",
  "get_product",
  "list_products_by_category",
  "check_availability",
  "get_price_quote",
  "compare_products",
  "get_product_media",
  /* قراءة — توافق وصيانة */
  "find_compatible_parts",
  "get_device_cartridge_set",
  "get_maintenance_schedule",
  /* قراءة — معرفة وخدمات */
  "get_knowledge",
  "get_service_availability",
  "get_available_slots",
  "get_payment_methods",
  /* قراءة — حساب ومعرفة العميل */
  "track_order",
  "list_my_orders",
  "get_my_devices",
  "get_warranty_status",
  "check_return_eligibility",
  /* حساب */
  "recommend_systems",
  "calculate_savings",
  /* إجراءات المستخدم */
  "save_to_wishlist",
  /* إجراءات حساسة — تتطلب تأكيدًا صريحًا */
  "create_service_booking",
  "submit_return_request",
  "submit_warranty_claim",
  "request_human_handoff",
] as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[number];

/** تصنيف الصلاحيات: قراءة / إجراء مستخدم / إجراء حساس. */
export type AiToolPermission = "read" | "user_action" | "sensitive";

export const AI_TOOL_PERMISSIONS: Record<AiToolName, AiToolPermission> = {
  search_products: "read",
  get_product: "read",
  list_products_by_category: "read",
  check_availability: "read",
  get_price_quote: "read",
  compare_products: "read",
  get_product_media: "read",
  find_compatible_parts: "read",
  get_device_cartridge_set: "read",
  get_maintenance_schedule: "read",
  get_knowledge: "read",
  get_service_availability: "read",
  get_available_slots: "read",
  get_payment_methods: "read",
  track_order: "read",
  list_my_orders: "read",
  get_my_devices: "read",
  get_warranty_status: "read",
  check_return_eligibility: "read",
  recommend_systems: "read",
  calculate_savings: "read",
  save_to_wishlist: "user_action",
  create_service_booking: "sensitive",
  submit_return_request: "sensitive",
  submit_warranty_claim: "sensitive",
  request_human_handoff: "sensitive",
};

/** وسم يظهر دائمًا عندما تكون الردود من مساعد تطويري لا من نموذج ذكاء اصطناعي. */
export const AI_DEMO_BADGE = "وضع تجريبي (بدون نموذج AI)";

export const AI_TOOL_LABELS: Record<AiToolName, string> = {
  search_products: "أبحث في الكتالوج",
  get_product: "أفتح بيانات المنتج",
  list_products_by_category: "أتصفّح الأقسام",
  check_availability: "أتحقق من التوفر",
  get_price_quote: "أراجع السعر والخصومات",
  compare_products: "أقارن المواصفات",
  get_product_media: "أجلب صور المنتج",
  find_compatible_parts: "أتحقق من توافق القطع",
  get_device_cartridge_set: "أحدد طقم الشمعات",
  get_maintenance_schedule: "أراجع جدول الصيانة",
  get_knowledge: "أبحث في الأدلة والسياسات",
  get_service_availability: "أتحقق من تغطية الخدمة",
  get_available_slots: "أعرض المواعيد المتاحة",
  get_payment_methods: "أراجع طرق الدفع",
  track_order: "أتتبع الطلب",
  list_my_orders: "أراجع طلباتك",
  get_my_devices: "أراجع أجهزتك المسجلة",
  get_warranty_status: "أتحقق من الضمان",
  check_return_eligibility: "أتحقق من أهلية الإرجاع",
  recommend_systems: "أرشّح أنظمة مناسبة",
  calculate_savings: "أحسب التوفير",
  save_to_wishlist: "أضيف لقائمة الرغبات",
  create_service_booking: "أنشئ طلب خدمة",
  submit_return_request: "أقدّم طلب إرجاع",
  submit_warranty_claim: "أقدّم طلب ضمان",
  request_human_handoff: "أحوّلك لموظف",
};

export function isAiToolName(value: unknown): value is AiToolName {
  return typeof value === "string" && (AI_TOOL_NAMES as readonly string[]).includes(value);
}

/**
 * سياق الصفحة الحالية. يُرسَل صراحةً من الواجهة فقط — لا يقرأ المساعد أي
 * حالة من الصفحة من تلقاء نفسه. لا يجوز أن يحتوي أي معلومة حساسة.
 */
export interface AiPageContext {
  /** مسار الصفحة (بدون query) مثل `/p/cartridges/carbon-block-cto`. */
  path: string;
  /** معرّف المنتج عند وجوده في الصفحة. */
  productId?: string;
  productSlug?: string;
  categorySlug?: string;
  /** قيم اختارها المستخدم بنفسه في الحاسبة أو مستشار المياه (غير حساسة). */
  householdSize?: number;
  calculatorMonths?: number;
  advisorUsage?: string;
  /** المدينة إن كان المستخدم قد اختارها في نموذج عام. */
  city?: string;
}

/** الحد الأقصى للتاريخ المرسَل: النافذة الأخيرة فقط + ملخص عند الحاجة. */
export const AI_MAX_HISTORY_TURNS = 8;

export interface AiHistoryTurn {
  role: "user" | "assistant";
  /** نص مُقلَّم ومحدود الطول — لا يُرسَل أي شيء آخر إلى المزوّد. */
  text: string;
}

export interface AiAttachmentRef {
  id: string;
  kind: "device" | "cartridge" | "label" | "installation" | "unknown";
  mimeType: string;
  sizeBytes: number;
  /** اسم أو رابط مختصر داخل التطبيق (لا يُرسَل إلى المزوّد كنص خام). */
  name?: string;
}

export interface AiChatRequest {
  conversationId: string;
  /** رسالة المستخدم الحالية بعد التقلّيم وحد الطول. */
  message: string;
  locale: AiLocale;
  context: AiPageContext;
  /** ملخص المحادثة (الخادم ينشئه) + آخر الرسائل، بحد أقصى `AI_MAX_HISTORY_TURNS`. */
  history?: AiHistoryTurn[];
  attachment?: AiAttachmentRef;
  /** ملخص ثابت للمحادثة يُخزّنه العميل — لا يُبنى على بيانات حساسة. */
  summary?: string;
}

/* ------------------------------------------------------------------ */
/* الكتل المنظّمة التي تُعرض في المحادثة                                */
/* ------------------------------------------------------------------ */

export interface AiTextBlock {
  type: "text";
  text: string;
}

export interface AiProductRef {
  productId: string;
  /** أسباب الترشيح مأخوذة من بيانات الأدوات — تُعرَض كما هي دون تجميل. */
  reasons?: string[];
}

export interface AiProductCardBlock extends AiProductRef {
  type: "product_card";
}

export interface AiProductCarouselBlock {
  type: "product_carousel";
  title?: string;
  items: AiProductRef[];
}

export interface AiImageBlock {
  type: "image";
  /** صورة منتج من الكتالوج: يجب أن تكون ضمن وسائط المنتج نفسه. */
  productId?: string;
  /** أو صورة عامة مسموح بها من `public/images` فقط. */
  imageUrl?: string;
  alt: string;
  caption?: string;
}

export interface AiComparisonRow {
  label: string;
  values: string[];
  /** تمييز الصفوف المهمة بصريًا. */
  emphasis?: boolean;
}

export interface AiComparisonBlock {
  type: "comparison";
  productIds: string[];
  rows: AiComparisonRow[];
  note?: string;
}

/** إجراء ينفّذه المتصفح بعد موافقة المستخدم (لا ينفّذه الخادم). */
export type AiClientAction =
  | { kind: "add_to_cart"; productId: string; quantity?: number }
  | { kind: "open_compare"; productIds: string[] }
  | { kind: "open_calculator"; productId?: string; months?: number; householdSize?: number }
  | { kind: "open_booking"; productId?: string; serviceType?: string }
  | { kind: "open_handoff"; topic?: string }
  /** يفتح النموذج الرسمي مع تعبئة مسبقة — لا نجمع بيانات شخصية داخل المحادثة. */
  | { kind: "open_form"; form: "booking" | "return" | "warranty" | "tracking" | "contact"; query?: Record<string, string> }
  | { kind: "login"; reason?: string };

export interface AiQuickReply {
  id: string;
  label: string;
  /** نص يُرسَل كما هو عند الضغط. */
  send?: string;
  action?: AiClientAction;
}

export interface AiQuickRepliesBlock {
  type: "quick_replies";
  replies: AiQuickReply[];
}

export interface AiActionBlock {
  type: "action";
  label: string;
  action: AiClientAction;
  /** إجراء يتطلب تأكيدًا صريحًا من المستخدم قبل التنفيذ. */
  confirmRequired?: boolean;
  confirmLabel?: string;
}

export interface AiCalculatorBlock {
  type: "calculator_result";
  /** مدخلات الحاسبة — الواجهة تعيد الحساب محليًا عبر `calculator-logic`. */
  input: {
    mode: "estimate" | "purchases";
    people: number;
    litersPerPersonPerDay: number;
    unitLiters: number;
    unitPrice: number;
    unitsPerPeriod: number;
    frequency: "weekly" | "monthly";
    months: number;
    productId?: string;
    devicePrice?: number;
    installationCost?: number;
    replacementKitPrice?: number;
    replacementIntervalMonths?: number;
    maintenancePrice?: number;
    maintenanceIntervalMonths?: number;
  };
  note?: string;
}

export interface AiServiceBlock {
  type: "service_card";
  serviceSlug?: string;
  serviceType?: string;
  city?: string;
  district?: string;
  /** تُحدَّث لحظيًا من `availabilityApi` في الواجهة. */
  refreshAvailability?: boolean;
  note?: string;
}

export interface AiOrderBlock {
  type: "order_status";
  orderNumber: string;
  /** يُعرض من الخدمة مباشرة في الواجهة (لا نثق ببيانات النموذج). */
  refresh?: boolean;
  note?: string;
}

export interface AiMaintenanceBlock {
  type: "maintenance_card";
  productId?: string;
  deviceId?: string;
  /** بيانات احتياطية من الأداة عند غياب جهاز مسجّل. */
  fallback?: {
    deviceName: string;
    lastChange?: string;
    nextChange?: string;
    percentRemaining?: number;
    cartridgeSetName?: string;
  };
  note?: string;
}

export interface AiHandoffBlock {
  type: "human_handoff";
  topic: string;
  summary: string;
  /** ملخص موجز جاهز للنسخ/الإرسال — يُرسَل فقط بعد موافقة المستخدم. */
  topics: string[];
  orderNumber?: string;
  channel: "whatsapp" | "support_page" | "live_chat_future";
  whatsappMessage?: string;
}

export interface AiNoticeBlock {
  type: "notice";
  tone: "info" | "warning" | "success" | "danger";
  title?: string;
  text: string;
}

export interface AiSourceRef {
  id: string;
  title: string;
  kind: "faq" | "guide" | "policy" | "service" | "catalog";
  href?: string;
  updatedAt?: string;
}

export interface AiSourcesBlock {
  type: "sources";
  items: AiSourceRef[];
}

export type AiBlock =
  | AiTextBlock
  | AiProductCardBlock
  | AiProductCarouselBlock
  | AiImageBlock
  | AiComparisonBlock
  | AiQuickRepliesBlock
  | AiActionBlock
  | AiCalculatorBlock
  | AiServiceBlock
  | AiOrderBlock
  | AiMaintenanceBlock
  | AiHandoffBlock
  | AiNoticeBlock
  | AiSourcesBlock;

export type AiBlockType = AiBlock["type"];

/* ------------------------------------------------------------------ */
/* الرسائل والأخطاء                                                     */
/* ------------------------------------------------------------------ */

export interface AiToolTrace {
  name: AiToolName;
  state: "started" | "succeeded" | "failed";
  /** مدة التنفيذ بالميلي ثانية عند الانتهاء. */
  ms?: number;
  /** رمز خطأ مختصر — بدون أي تفاصيل داخلية. */
  error?: string;
}

export interface AiErrorInfo {
  code:
    | "not_configured"
    | "unauthorized"
    | "rate_limited"
    | "provider_unavailable"
    | "tool_failed"
    | "invalid_response"
    | "network"
    | "aborted"
    | "unknown";
  message: string;
  retryable: boolean;
}

export type AiFeedback = "up" | "down" | null;

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  createdAt: string;
  blocks: AiBlock[];
  /** حالة الأدوات المعروضة أثناء التنفيذ. */
  toolTrace?: AiToolTrace[];
  sources?: AiSourceRef[];
  language: AiLocale;
  streaming?: boolean;
  error?: AiErrorInfo;
  feedback?: AiFeedback;
  feedbackReason?: string;
  /** نص خام مقترح لإعادة المحاولة عند الفشل. */
  retryPrompt?: string;
}

/* ------------------------------------------------------------------ */
/* بثّ الرد (SSE)                                                       */
/* ------------------------------------------------------------------ */

export interface AiStreamMetaEvent {
  type: "meta";
  conversationId: string;
  messageId: string;
  model?: string;
  /** يعرض للعميل أن الرد تجريبي (بيانات عرض) — إلزامي في وضع التطوير. */
  demo?: boolean;
}

export interface AiStreamDeltaEvent {
  type: "delta";
  messageId: string;
  text: string;
}

export interface AiStreamBlockEvent {
  type: "block";
  messageId: string;
  block: AiBlock;
}

export interface AiStreamToolEvent {
  type: "tool";
  messageId: string;
  name: string;
  state: "started" | "succeeded" | "failed";
  ms?: number;
  error?: string;
}

export interface AiStreamSourcesEvent {
  type: "sources";
  messageId: string;
  items: AiSourceRef[];
}

export interface AiStreamDoneEvent {
  type: "done";
  messageId: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AiStreamErrorEvent {
  type: "error";
  messageId?: string;
  error: AiErrorInfo;
}

export type AiStreamEvent =
  | AiStreamMetaEvent
  | AiStreamDeltaEvent
  | AiStreamBlockEvent
  | AiStreamToolEvent
  | AiStreamSourcesEvent
  | AiStreamDoneEvent
  | AiStreamErrorEvent;

/* ------------------------------------------------------------------ */
/* أغراض التحليلات (بدون محتوى المحادثة)                                */
/* ------------------------------------------------------------------ */

export interface AiFeedbackPayload {
  messageId: string;
  rating: Exclude<AiFeedback, null>;
  reason?: string;
}

/**
 * تقليم وتنقية نصوص المساعد.
 *
 * كل نص قادم من مزوّد الذكاء الاصطناعي أو من أدوات الاسترجاع (FAQ، مقالات،
 * أوصاف منتجات، مراجعات، OCR من صورة) يُعامل كمحتوى غير موثوق:
 *   1. يُقلَّم من الوسوم والرموز المتحكِّمة ومحارف توجيه النص.
 *   2. يُحدَّد طوله.
 *   3. تُخفى أي بيانات شخصية حساسة قبل أي عرض أو إرسال للتحليلات.
 *   4. تُرصد محاولات حقن التعليمات (prompt injection) وتُحاط كنص فقط.
 *
 * الواجهة لا تستخدم `dangerouslySetInnerHTML` في أي مكان، لكن التنقية تمنع
 * أيضًا ظهور وسوم خام أو روابط صور من إنتاج النموذج.
 */

/** أقصى طول لرسالة مستخدم واحدة. */
export const AI_MAX_USER_MESSAGE = 1200;
/** أقصى طول لرد واحد من المساعد. */
export const AI_MAX_ASSISTANT_TEXT = 4000;
/** أقصى طول لنص مسترجع من مصادر المعرفة. */
export const AI_MAX_SOURCE_TEXT = 2200;

/** يحذف محارف التحكم ومحارف توجيه النص ثنائي الاتجاه. */
export function stripControlChars(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // محارف التوجيه/العزل (RLO, LRO, PDF, LRI…RLI, FSI, PDI) تُستخدم للتلاعب بالعرض
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
}

/**
 * يحوّل وسمًا شبيهًا بـHTML إلى نص عادي. لا نعرض HTML مطلقًا، لكن منع مرور
 * وسوم خام يمنع أي التباس أو نسخ محتوى ضار.
 */
export function stripMarkup(value: string): string {
  return value
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

const BIDI_ISOLATE = /[\u202A-\u202E\u2066-\u2069]/g;

/** تقليم كامل: محارف + وسوم + مسافات مكرّرة + حد الطول. */
export function sanitizeText(value: unknown, maxLength = AI_MAX_ASSISTANT_TEXT): string {
  if (typeof value !== "string") return "";
  const cleaned = stripMarkup(stripControlChars(value))
    .replace(BIDI_ISOLATE, "")
    .replace(/[ \t\u00A0]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

/** تقليم رسالة المستخدم قبل إرسالها للبوابة. */
export function sanitizeUserMessage(value: string): string {
  return sanitizeText(value, AI_MAX_USER_MESSAGE);
}

/* ------------------------------------------------------------------ */
/* إخفاء البيانات الشخصية                                              */
/* ------------------------------------------------------------------ */

const CARD_LIKE = /\b(?:\d[ -]?){13,19}\b/g;
const CVV_LIKE = /\b(?:cvv|cvc|رمز التحقق)\D{0,6}\d{3,4}\b/gi;
const OTP_LIKE = /\b(?:otp|رمز التحقق|رمز الدخول)\D{0,6}\d{4,8}\b/gi;
const SA_PHONE = /(?:\+?966|0)5\d{8}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
const NATIONAL_ID = /\b[12]\d{9}\b/g;

/**
 * إخفاء بيانات حساسة من أي نص يُرسَل للتحليلات أو يُعرض كملخص للموظف.
 * لا يُستخدم هذا على نص المحادثة نفسه قبل المعالجة، بل على ما يخرج منها.
 */
export function redactSensitive(value: string): string {
  return value
    .replace(CARD_LIKE, (match) => (match.replace(/\D/g, "").length >= 13 ? "[card]" : match))
    .replace(CVV_LIKE, "[cvv]")
    .replace(OTP_LIKE, "[code]")
    .replace(NATIONAL_ID, "[id]")
    .replace(SA_PHONE, (match) => `${match.slice(0, 4)}*****`)
    .replace(EMAIL, "[email]");
}

/** هل تحتوي الرسالة على ما يشبه بيانات دفع/تحقق بنكية؟ */
export function containsPaymentCredentials(value: string): boolean {
  return CARD_LIKE.test(value) || CVV_LIKE.test(value) || OTP_LIKE.test(value);
}

/** تصفير حالة `lastIndex` لمطابقات regex العامة. */
export function resetPatternState(): void {
  [CARD_LIKE, CVV_LIKE, OTP_LIKE, SA_PHONE, EMAIL, NATIONAL_ID].forEach((pattern) => {
    pattern.lastIndex = 0;
  });
}

/* ------------------------------------------------------------------ */
/* مقاومة حقن التعليمات                                                */
/* ------------------------------------------------------------------ */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?)/i,
  /تجاهل\s+(كل\s+)?(التعليمات|الأوامر)\s*(السابقة)?/,
  /اعرض\s+(لي\s+)?(المفاتيح|مفاتيح|الأسرار|البرومبت|التعليمات)/,
  /(show|reveal|print|dump)\s+(me\s+)?(your\s+)?(system\s*)?(prompt|instructions|api\s*keys?|secrets?|env)/i,
  /(system\s*prompt|developer\s*message)/i,
  /you\s+are\s+now\s+/i,
  /(api[_ -]?key|secret[_ -]?key|access[_ -]?token)\s*[:=]/i,
];

/**
 * يرصد محاولات حقن التعليمات. النتيجة تُستخدم للتسجيل والتصعيد فقط —
 * المحتوى لا يُنفَّذ ولا يُرسَل كتعليمات، بل يبقى بيانات يعالجها النموذج.
 */
export function detectPromptInjection(value: string): { flagged: boolean; matches: string[] } {
  const matches = INJECTION_PATTERNS.filter((pattern) => pattern.test(value)).map((pattern) => pattern.source);
  return { flagged: matches.length > 0, matches };
}

/**
 * يحيط النص غير الموثوق بعلامات واضحة حتى يتعامل معه النموذج كبيانات.
 * يُستخدم في الخادم قبل تمرير أي نص مسترجع إلى المزوّد.
 */
export function wrapUntrusted(label: string, value: string): string {
  const cleaned = sanitizeText(value, AI_MAX_SOURCE_TEXT).replace(/<\/?untrusted[^>]*>/gi, " ");
  return `<untrusted source="${label.replace(/[^\w-]/g, "")}">\n${cleaned}\n</untrusted>`;
}

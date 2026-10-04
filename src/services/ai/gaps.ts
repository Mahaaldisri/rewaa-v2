/**
 * قائمة فجوات المعرفة (Knowledge gap queue).
 *
 * عندما لا يجد المساعد إجابة موثوقة، تُسجَّل **الموضوعات** فقط محليًا (بلا نصوص
 * محادثة كاملة وبلا بيانات شخصية) ليعرف فريق المحتوى ما ينقص. لا شيء يُرسَل
 * إلى أي طرف ثالث من هنا؛ هذه طبقة محلية تُقرأ لاحقًا في «مركز الذكاء» أو تُصدَّر
 * يدويًا. في الإنتاج تكون القائمة على الخادم بنفس الشكل.
 */
import { readJSON, removeKey, writeJSON } from "@/lib/localStore";
import { redactSensitive, sanitizeText } from "@/lib/ai/sanitize";
import { AI_MAX_USER_MESSAGE } from "@/lib/ai/sanitize";

const KEY = "rewaa_ai_knowledge_gaps";
const MAX_ENTRIES = 25;
const MAX_TOPIC_CHARS = 120;

export interface KnowledgeGap {
  /** موضوع مختصر (سؤال العميل بعد التقليم). */
  topic: string;
  at: number;
  /** لغة السؤال كما ظهرت. */
  locale: "ar" | "en";
  /** عدد المرات التي تكرّر فيها الموضوع. */
  count: number;
  /** الصفحة التي جاء منها السؤال (بلا معرّفات شخصية). */
  path: string;
}

function cleanTopic(value: string): string {
  return redactSensitive(sanitizeText(value, MAX_TOPIC_CHARS)).replace(/\s+/g, " ").trim();
}

function read(): KnowledgeGap[] {
  const stored = readJSON<unknown>(KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return undefined;
      const record = entry as Record<string, unknown>;
      const topic = typeof record.topic === "string" ? record.topic : "";
      if (!topic) return undefined;
      return {
        topic,
        at: typeof record.at === "number" ? record.at : Date.now(),
        locale: record.locale === "en" ? ("en" as const) : ("ar" as const),
        count: typeof record.count === "number" && record.count > 0 ? record.count : 1,
        path: typeof record.path === "string" ? record.path.slice(0, 120) : "/",
      } satisfies KnowledgeGap;
    })
    .filter((entry): entry is KnowledgeGap => Boolean(entry))
    .slice(0, MAX_ENTRIES);
}

/** يسجّل موضوعًا غير مُجاب (يدمج التكرار بدل تضخيم القائمة). */
export function recordKnowledgeGap(input: { topic: string; locale: "ar" | "en"; path: string }): void {
  const topic = cleanTopic(input.topic);
  if (topic.length < 4) return;
  const entries = read();
  const existing = entries.find((entry) => entry.topic === topic);
  const next = existing
    ? entries.map((entry) =>
        entry.topic === topic ? { ...entry, count: entry.count + 1, at: Date.now(), path: input.path } : entry,
      )
    : [{ topic, at: Date.now(), locale: input.locale, count: 1, path: input.path }, ...entries];
  writeJSON(KEY, next.slice(0, MAX_ENTRIES));
}

export function knowledgeGapQueue(): KnowledgeGap[] {
  return read().sort((a, b) => b.count - a.count || b.at - a.at);
}

export function clearKnowledgeGaps(): void {
  removeKey(KEY);
}

export { AI_MAX_USER_MESSAGE };

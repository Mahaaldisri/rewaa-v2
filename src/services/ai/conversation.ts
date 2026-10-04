/**
 * حالة المحادثة على العميل.
 *
 * قواعد صريحة:
 *  - لا يُخزَّن أي شيء حسّاس: لا كلمات مرور، لا بطاقات، لا رموز تحقق. كل نص
 *    يمر على `redactSensitive` قبل الحفظ.
 *  - المحادثة محصورة في الجلسة/الجهاز (localStorage)، ولا تُرسَل بيانات شخصية
 *    إلى المزوّد إلا ما كتبه المستخدم بنفسه في الرسالة.
 *  - الملخّص (summary) ينشئه الخادم؛ إن لم يوجد نرسل آخر الرسائل فقط.
 */
import { readJSON, removeKey, writeJSON } from "@/lib/localStore";
import { redactSensitive, sanitizeText, sanitizeUserMessage } from "@/lib/ai/sanitize";
import {
  AI_MAX_HISTORY_TURNS,
  type AiBlock,
  type AiHistoryTurn,
  type AiLocale,
} from "@/types/ai";

const STORAGE_PREFIX = "rewaa_ai_conversation";
/** الحد الأقصى للرسائل المحفوظة لكل محادثة. */
const MAX_STORED_MESSAGES = 40;
/** أقصى عدد محادثات محفوظة لكل مستخدم/ضيف. */
const MAX_STORED_CONVERSATIONS = 3;

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  /** نص مُعقّم ومُقلَّم — الكتل المنظّمة لا تُخزَّن (تُحلّ من الكتالوج عند العرض). */
  text: string;
  at: number;
  /** أسماء الأدوات التي شُغّلت في هذه الرسالة (بلا محتوى). */
  tools?: string[];
  /** أنواع الكتل التي رُسمت (بلا محتوى) لعرض هيكلي عند إعادة الفتح. */
  blockTypes?: AiBlock["type"][];
  error?: boolean;
}

export interface StoredConversation {
  id: string;
  locale: AiLocale;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
  /** ملخّص الخادم إن وُجد. */
  summary?: string;
}

export interface ConversationScope {
  /** معرّف المستخدم إن وُجد — وإلا "guest". */
  userKey: string;
}

function scopeKey(scope: ConversationScope): string {
  return `${STORAGE_PREFIX}:${scope.userKey || "guest"}`;
}

function isStoredConversation(value: unknown): value is StoredConversation {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && Array.isArray(record.messages);
}

function cleanMessage(raw: unknown): StoredMessage | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const role = record.role === "assistant" ? "assistant" : record.role === "user" ? "user" : undefined;
  if (!role) return undefined;
  const text = redactSensitive(
    role === "user" ? sanitizeUserMessage(String(record.text ?? "")) : sanitizeText(record.text),
  );
  if (!text) return undefined;
  return {
    id: typeof record.id === "string" ? record.id : `m-${Date.now().toString(36)}`,
    role,
    text,
    at: typeof record.at === "number" ? record.at : Date.now(),
    tools: Array.isArray(record.tools) ? record.tools.filter((item): item is string => typeof item === "string").slice(0, 12) : undefined,
    blockTypes: Array.isArray(record.blockTypes)
      ? (record.blockTypes.filter((item) => typeof item === "string") as AiBlock["type"][]).slice(0, 12)
      : undefined,
    error: record.error === true ? true : undefined,
  };
}

/** كل محادثات المستخدم/الضيف، الأحدث أولاً. */
export function listConversations(scope: ConversationScope): StoredConversation[] {
  const stored = readJSON<unknown>(scopeKey(scope), []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(isStoredConversation)
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages
        .map(cleanMessage)
        .filter((message): message is StoredMessage => Boolean(message))
        .slice(-MAX_STORED_MESSAGES),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_STORED_CONVERSATIONS);
}

function persist(scope: ConversationScope, conversations: StoredConversation[]): void {
  writeJSON(scopeKey(scope), conversations.slice(0, MAX_STORED_CONVERSATIONS));
}

export function createConversation(locale: AiLocale): StoredConversation {
  return {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    locale,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadConversation(scope: ConversationScope, id: string): StoredConversation | undefined {
  return listConversations(scope).find((conversation) => conversation.id === id);
}

/** يحفظ/يحدّث محادثة في أعلى القائمة. */
export function saveConversation(scope: ConversationScope, conversation: StoredConversation): StoredConversation {
  const trimmed: StoredConversation = {
    ...conversation,
    messages: conversation.messages.slice(-MAX_STORED_MESSAGES),
    updatedAt: Date.now(),
  };
  const others = listConversations(scope).filter((entry) => entry.id !== trimmed.id);
  persist(scope, [trimmed, ...others]);
  return trimmed;
}

export function appendMessage(
  scope: ConversationScope,
  conversation: StoredConversation,
  message: StoredMessage,
): StoredConversation {
  return saveConversation(scope, { ...conversation, messages: [...conversation.messages, message] });
}

/** يضيف رسالة أو يحدّثها إن كانت محفوظة مسبقًا (نفس المعرّف). */
export function upsertMessage(
  scope: ConversationScope,
  conversation: StoredConversation,
  message: StoredMessage,
): StoredConversation {
  const exists = conversation.messages.some((entry) => entry.id === message.id);
  const messages = exists
    ? conversation.messages.map((entry) => (entry.id === message.id ? message : entry))
    : [...conversation.messages, message];
  return saveConversation(scope, { ...conversation, messages });
}

export function clearConversation(scope: ConversationScope, id: string): void {
  const remaining = listConversations(scope).filter((entry) => entry.id !== id);
  if (remaining.length === 0) removeKey(scopeKey(scope));
  else persist(scope, remaining);
}

export function clearAllConversations(scope: ConversationScope): void {
  removeKey(scopeKey(scope));
}

/** آخر `AI_MAX_HISTORY_TURNS` أدوار تُرسَل للخادم (نصوص فقط). */
export function toHistoryTurns(conversation: StoredConversation): AiHistoryTurn[] {
  return conversation.messages
    .filter((message) => !message.error && message.text.trim().length > 0)
    .slice(-AI_MAX_HISTORY_TURNS)
    .map((message) => ({ role: message.role, text: message.text }));
}

/** معرّف تخزين آمن من معرّف المستخدم. */
export function userScopeKey(userId?: string | null): string {
  return userId ? `user_${userId}` : "guest";
}

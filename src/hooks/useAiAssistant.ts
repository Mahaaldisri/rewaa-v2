/**
 * `useAiAssistant` — العقل التنظيمي لواجهة المساعد.
 *
 * مسؤولياته: بناء الطلب من سياق الصفحة، تشغيل البثّ عبر البوابة، تجميع الكتل
 * المنظّمة، تنفيذ إجراءات المتصفح (إضافة للسلة، فتح المقارنة، الحجز…) عبر
 * الخدمات الرسمية القائمة، وحفظ المحادثة محليًا بدون بيانات حساسة.
 *
 * لا يتصل بأي مزوّد ذكاء اصطناعي ولا يحمل أي مفتاح — كل ذلك في الخادم.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { catalogResolver, resolveProduct, resolveSummary } from "@/services/ai/catalog-resolver";
import { gatewayStatus, streamChat, uploadsSupported, type AiGatewayStatus } from "@/services/ai/gateway";
import { createDevState, type DevConversationState } from "@/services/ai/devAssistant";
import {
  appendMessage,
  clearConversation,
  upsertMessage,
  createConversation,
  listConversations,
  loadConversation,
  saveConversation,
  toHistoryTurns,
  userScopeKey,
  type StoredConversation,
  type StoredMessage,
} from "@/services/ai/conversation";
import { buildHandoff, type HandoffPayload } from "@/services/ai/handoff";
import { recordKnowledgeGap } from "@/services/ai/gaps";
import { aiTrack, type AiEntryPoint } from "@/services/ai/analytics";
import { runTool, type ToolContext } from "@/services/ai/tools";
import { sanitizeUserMessage } from "@/lib/ai/sanitize";
import { getDefaultSelection, getVariant, imagesForSelection, quotePrice, selectionLabel } from "@/lib/product-logic";
import type {
  AiAttachmentRef,
  AiBlock,
  AiChatRequest,
  AiClientAction,
  AiErrorInfo,
  AiLocale,
  AiPageContext,
  AiSourceRef,
  AiToolName,
  AiToolTrace,
} from "@/types/ai";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks: AiBlock[];
  sources: AiSourceRef[];
  tools: AiToolTrace[];
  streaming?: boolean;
  stopped?: boolean;
  error?: AiErrorInfo;
  feedback?: "up" | "down";
  attachment?: AiAttachmentRef;
  at: number;
}

export interface UseAiAssistantValue {
  open: boolean;
  status: AiGatewayStatus;
  messages: AiChatMessage[];
  busy: boolean;
  /** أسماء الأدوات التي تعمل الآن — تُعرض كحالة "جارٍ التحقق من البيانات". */
  activeTools: string[];
  conversationId: string;
  canUpload: boolean;
  history: StoredConversation[];
  openChat: (entry?: AiEntryPoint) => void;
  closeChat: () => void;
  sendMessage: (text: string, attachment?: AiAttachmentRef) => Promise<void>;
  stopGenerating: () => void;
  retryLast: () => void;
  newConversation: () => void;
  openConversation: (id: string) => void;
  submitFeedback: (messageId: string, rating: "up" | "down", reason?: string) => void;
  runClientAction: (action: AiClientAction, meta?: { position?: number; source?: AiBlock["type"] }) => Promise<void>;
  prepareHandoff: (reason: string, extra?: { productNames?: string[]; steps?: string[] }) => HandoffPayload;
  /** يرسل طلب التسليم للخادم بعد موافقة العميل (أو يعيد مسار القناة الرسمية). */
  confirmHandoff: (payload: HandoffPayload) => Promise<void>;
}

const BASE_CONTEXT: AiPageContext = { path: "/" };

function productFromPath(pathname: string): string | undefined {
  const match = /^\/p\/(.+)$/.exec(pathname);
  if (!match) return undefined;
  return catalogResolver.productIdFromSlug(decodeURIComponent(match[1]));
}

function contextFromPath(pathname: string, search: string, extras: Partial<AiPageContext>): AiPageContext {
  const params = new URLSearchParams(search);
  const household = Number(params.get("people"));
  const months = Number(params.get("months"));
  return {
    path: pathname,
    productId: productFromPath(pathname),
    categorySlug: /^\/c\/([^/]+)/.exec(pathname)?.[1],
    householdSize: Number.isFinite(household) && household > 0 ? household : undefined,
    calculatorMonths: Number.isFinite(months) && months > 0 ? months : undefined,
    advisorUsage: params.get("usage") ?? undefined,
    ...extras,
  };
}

export function useAiAssistant(): UseAiAssistantValue {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, toggleCompare, pushToast } = useStore();

  const status = useMemo(() => gatewayStatus(), []);
  const scope = useMemo(() => ({ userKey: userScopeKey(user?.id) }), [user?.id]);

  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<StoredConversation>(() => createConversation("ar"));
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [history, setHistory] = useState<StoredConversation[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const devStateRef = useRef<DevConversationState>(createDevState());
  const lastRequestRef = useRef<{ text: string; attachment?: AiAttachmentRef } | null>(null);
  const openedAtRef = useRef<number>(0);
  const turnsRef = useRef<number>(0);

  /* آخر رسالة للمستخدم تحدد لغة الرد (عربي افتراضيًا). */
  const locale: AiLocale = useMemo(() => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUser) return "ar";
    const arabic = (lastUser.text.match(/[\u0600-\u06FF]/g) ?? []).length;
    const latin = (lastUser.text.match(/[A-Za-z]/g) ?? []).length;
    return latin > arabic ? "en" : "ar";
  }, [messages]);

  /* استعادة آخر محادثة عند فتح اللوحة لأول مرة (للمستخدمين المسجلين). */
  useEffect(() => {
    setHistory(listConversations(scope));
  }, [scope]);

  const track = useMemo(() => aiTrack(), []);
  const path = location.pathname;

  const buildToolContext = useCallback(
    (page: AiPageContext): ToolContext => ({
      locale,
      page,
      user,
      guestToken: undefined,
    }),
    [locale, user],
  );

  const persist = useCallback(
    (next: StoredConversation, appended: StoredMessage) => {
      const saved = appendMessage(scope, next, appended);
      setConversation(saved);
      setHistory(listConversations(scope));
      return saved;
    },
    [scope],
  );

  /* ------------------------------- البثّ ------------------------------- */

  const run = useCallback(
    async (request: AiChatRequest, assistantId: string, startedAt: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const collectedTools: AiToolTrace[] = [];
      let blockTypes: AiBlock["type"][] = [];
      let sourcesCount = 0;
      let textLength = 0;

      const page = request.context ?? BASE_CONTEXT;

      try {
        await streamChat({
          request,
          ctx: buildToolContext(page),
          devState: devStateRef.current,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "delta" || event.type === "block" || event.type === "sources" || event.type === "tool") {
              setMessages((prev) =>
                prev.map((message) => {
                  if (message.id !== assistantId) return message;
                  switch (event.type) {
                    case "delta": {
                      const text = message.text + event.text;
                      textLength = Math.max(textLength, text.length);
                      return { ...message, text };
                    }
                    case "block": {
                      blockTypes = [...blockTypes, event.block.type];
                      return { ...message, blocks: [...message.blocks, event.block] };
                    }
                    case "sources":
                      sourcesCount = event.items.length;
                      return { ...message, sources: event.items };
                    case "tool": {
                      const trace: AiToolTrace = {
                        name: event.name as AiToolName,
                        state: event.state,
                        ms: event.ms,
                        error: event.error,
                      };
                      const tools = [...message.tools.filter((item) => item.name !== event.name), trace];
                      return { ...message, tools };
                    }
                    default:
                      return message;
                  }
                }),
              );

              if (event.type === "tool") {
                collectedTools.push({ name: event.name as AiToolName, state: event.state, ms: event.ms, error: event.error });
                track.toolCalled(event.name, event.state, path, event.ms);
                if (event.state === "failed") track.toolFailed(event.name, path, event.error);
                setActiveTools((prev) =>
                  event.state === "started"
                    ? [...prev.filter((name) => name !== event.name), event.name]
                    : prev.filter((name) => name !== event.name),
                );
              }
              return;
            }

            if (event.type === "error") {
              const aborted = event.error.code === "aborted";
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, streaming: false, stopped: aborted, error: aborted ? undefined : event.error }
                    : message,
                ),
              );
              if (!aborted) track.error(event.error.code, path, event.error.retryable);
              return;
            }

            if (event.type === "done") {
              setMessages((prev) =>
                prev.map((message) => (message.id === assistantId ? { ...message, streaming: false } : message)),
              );
              track.responseReceived({
                path,
                demo: event.messageId.startsWith("dev-") || status.demo,
                latencyMs: Date.now() - startedAt,
                blocks: blockTypes.map((type) => ({ type }) as AiBlock),
                tools: collectedTools.map((entry) => entry.name),
                sourcesCount,
                textLength,
              });
            }
          },
        });
      } finally {
        abortRef.current = null;
        setActiveTools([]);
        setBusy(false);
        setMessages((prev) => prev.map((message) => (message.id === assistantId ? { ...message, streaming: false } : message)));
      }
    },
    [buildToolContext, path, status.demo, track],
  );

  const sendMessage = useCallback(
    async (rawText: string, attachment?: AiAttachmentRef) => {
      const text = sanitizeUserMessage(rawText);
      if (!text || busy) return;

      const page = contextFromPath(location.pathname, location.search, {});
      const now = Date.now();
      const userMessage: AiChatMessage = {
        id: `u-${now.toString(36)}`,
        role: "user",
        text,
        blocks: [],
        sources: [],
        tools: [],
        attachment,
        at: now,
      };
      const assistantId = `a-${now.toString(36)}`;

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", text: "", blocks: [], sources: [], tools: [], streaming: true, at: now },
      ]);
      turnsRef.current += 1;
      setBusy(true);
      lastRequestRef.current = { text, attachment };

      const saved = persist(conversation, {
        id: userMessage.id,
        role: "user",
        text,
        at: now,
        tools: [],
      });

      track.messageSent({
        path,
        locale,
        length: text.length,
        hasAttachment: Boolean(attachment),
        hasProductContext: Boolean(page.productId),
      });

      const request: AiChatRequest = {
        conversationId: saved.id,
        message: text,
        locale,
        context: page,
        history: toHistoryTurns(saved),
        attachment,
        summary: saved.summary,
      };

      await run(request, assistantId, now);
    },
    [busy, conversation, locale, location.pathname, location.search, path, persist, run, track],
  );

  const stopGenerating = useCallback(() => {
    const partial = messages.find((message) => message.streaming);
    abortRef.current?.abort();
    setMessages((prev) => prev.map((message) => (message.streaming ? { ...message, streaming: false, stopped: true } : message)));
    track.stopped(path, partial?.text.length ?? 0);
    setBusy(false);
  }, [messages, path, track]);

  const retryLast = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last || busy) return;
    const now = Date.now();
    const assistantId = `a-${now.toString(36)}`;
    setMessages((prev) => {
      const trimmed = [...prev];
      // احذف آخر رد فاشل/متوقف فقط — تبقى رسالة المستخدم ظاهرة بلا تكرار.
      while (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
      return [
        ...trimmed,
        { id: assistantId, role: "assistant", text: "", blocks: [], sources: [], tools: [], streaming: true, at: now },
      ];
    });
    setBusy(true);
    const page = contextFromPath(location.pathname, location.search, {});
    const request: AiChatRequest = {
      conversationId: conversation.id,
      message: last.text,
      locale,
      context: page,
      history: toHistoryTurns(conversation),
      attachment: last.attachment,
      summary: conversation.summary,
    };
    void run(request, assistantId, now);
  }, [busy, conversation, locale, location.pathname, location.search, run]);

  /* --------------------------- الجلسة والتخزين --------------------------- */

  const openChat = useCallback(
    (entry: AiEntryPoint = "launcher") => {
      setOpen(true);
      openedAtRef.current = Date.now();
      track.opened(entry, path, status.demo);
    },
    [path, status.demo, track],
  );

  const closeChat = useCallback(() => {
    setOpen(false);
    track.closed(path, turnsRef.current, openedAtRef.current ? Date.now() - openedAtRef.current : 0);
    turnsRef.current = 0;
  }, [path, track]);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    devStateRef.current = createDevState();
    setMessages([]);
    setConversation(createConversation(locale));
    setBusy(false);
    setActiveTools([]);
  }, [locale]);

  const openConversation = useCallback(
    (id: string) => {
      const found = loadConversation(scope, id);
      if (!found) return;
      setConversation(found);
      setMessages(
        found.messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          blocks: [],
          sources: [],
          tools: (message.tools ?? []).map((name) => ({ name: name as AiToolName, state: "succeeded" as const })),
          at: message.at,
        })),
      );
      setOpen(true);
      track.opened("restored", path, status.demo);
    },
    [path, scope, status.demo, track],
  );

  useEffect(() => {
    // عند تبديل المستخدم (دخول/خروج) نبدأ محادثة نظيفة بدل خلط السياق.
    setHistory(listConversations(scope));
    setConversation(createConversation(locale));
    setMessages([]);
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!lastAssistant || lastAssistant.streaming) return;

    const existing = conversation.messages.find((message) => message.id === lastAssistant.id);
    const unchanged =
      existing &&
      existing.text === lastAssistant.text &&
      (existing.blockTypes?.length ?? 0) === lastAssistant.blocks.length &&
      existing.error === (lastAssistant.error ? true : undefined);
    if (unchanged) return;

    const saved = upsertMessage(scope, conversation, {
      id: lastAssistant.id,
      role: "assistant",
      text: lastAssistant.text,
      at: lastAssistant.at,
      tools: lastAssistant.tools.map((tool) => tool.name),
      blockTypes: lastAssistant.blocks.map((block) => block.type),
      error: Boolean(lastAssistant.error),
    });
    setConversation(saved);
    setHistory(listConversations(scope));
  }, [messages, conversation, scope]);

  /* ------------------------- الإجراءات في المتصفح ------------------------- */

  const runClientAction = useCallback<UseAiAssistantValue["runClientAction"]>(
    async (action, meta) => {
      switch (action.kind) {
        case "add_to_cart": {
          const product = resolveProduct(action.productId);
          const summary = resolveSummary(action.productId);
          if (!product || !summary) {
            pushToast({ tone: "error", title: "تعذّرت الإضافة", description: "المنتج لم يعد متوفرًا في الكتالوج." });
            return;
          }
          const selection = getDefaultSelection(product);
          const variant = getVariant(product, selection);
          const quote = quotePrice(variant, product, action.quantity ?? 1);
          if (!variant || variant.stock <= 0 || quote.total <= 0) {
            track.productCardClick(product.id, "view", meta?.position ?? 0, path);
            pushToast({
              tone: "warning",
              title: "يحتاج اختيار الخيارات أولًا",
              description: "افتح صفحة المنتج لاختيار الإصدار أو الحجم المتوفر.",
            });
            navigate(`/p/${product.slug}`);
            return;
          }
          const images = imagesForSelection(product, selection);
          const ok = await addToCart({
            productId: product.id,
            variantId: variant.id,
            sku: variant.sku,
            name: product.name,
            selectionLabel: selectionLabel(product, selection),
            unitPrice: variant.price,
            quantity: action.quantity ?? 1,
            image: images[0]?.thumb,
          });
          track.addToCart(product.id, ok, path);
          if (ok) {
            setMessages((prev) => [
              ...prev,
              {
                id: `s-${Date.now().toString(36)}`,
                role: "assistant",
                text: "",
                blocks: [
                  {
                    type: "notice",
                    tone: "success",
                    title: "تمت الإضافة إلى السلة",
                    text: `${product.name} — ${selectionLabel(product, selection)}. يمكنك إكمال الطلب من صفحة السلة.`,
                  },
                ],
                sources: [],
                tools: [],
                at: Date.now(),
              },
            ]);
          }
          return;
        }
        case "open_compare": {
          const ids = action.productIds.filter((id) => resolveProductIdSafe(id));
          if (ids.length < 2) {
            pushToast({ tone: "warning", title: "لا يمكن فتح المقارنة", description: "نحتاج منتجين على الأقل للمقارنة." });
            return;
          }
          for (const id of ids) {
            if (!meta?.source || meta.source === "comparison") {
              const summary = resolveSummary(id);
              const product = resolveProduct(id);
              if (summary && product) await toggleCompare({ id: summary.id, name: summary.name, slug: summary.slug });
            }
          }
          track.comparisonViewed(ids, "chat");
          navigate("/compare");
          return;
        }
        case "open_calculator": {
          const params = new URLSearchParams();
          if (action.householdSize) params.set("people", String(action.householdSize));
          if (action.months) params.set("months", String(action.months));
          if (action.productId) {
            const summary = resolveSummary(action.productId);
            if (summary) params.set("device", summary.slug);
          }
          track.calculatorUsed("estimate", action.months ?? 0, 0, true);
          navigate(`/calculator${params.toString() ? `?${params.toString()}` : ""}`);
          return;
        }
        case "open_booking": {
          const params = new URLSearchParams();
          if (action.serviceType) params.set("type", action.serviceType);
          if (action.productId) {
            const summary = resolveSummary(action.productId);
            if (summary) params.set("product", summary.slug);
          }
          track.bookingStarted(action.serviceType, undefined, true);
          navigate(`/services/book${params.toString() ? `?${params.toString()}` : ""}`);
          return;
        }
        case "open_form": {
          const params = new URLSearchParams(action.query ?? {});
          const routes: Record<typeof action.form, string> = {
            booking: "/services/book",
            return: "/help/returns",
            warranty: "/help/warranty-claim",
            tracking: "/help/track",
            contact: "/help/contact",
          };
          navigate(`${routes[action.form]}${params.toString() ? `?${params.toString()}` : ""}`);
          return;
        }
        case "open_handoff": {
          setMessages((prev) => [
            ...prev,
            {
              id: `h-${Date.now().toString(36)}`,
              role: "assistant",
              text: action.topic ? `سأجهّز ملخصًا عن: ${action.topic}` : "سأجهّز ملخصًا لمحادثتنا.",
              blocks: [
                {
                  type: "human_handoff",
                  topic: action.topic ?? "طلب متابعة من مساعد رواء",
                  summary: "يُشارك الملخص مع فريق رواء فقط بعد موافقتك.",
                  topics: [],
                  channel: "support_page",
                },
              ],
              sources: [],
              tools: [],
              at: Date.now(),
            },
          ]);
          return;
        }
        case "login": {
          navigate(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        default:
          return;
      }
    },
    [addToCart, navigate, path, pushToast, toggleCompare, track],
  );

  /* ---------------------------- التسليم البشري ---------------------------- */

  const prepareHandoff = useCallback<UseAiAssistantValue["prepareHandoff"]>(
    (reason, extra) => {
      const payload = buildHandoff({
        reason,
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          at: message.at,
        })),
        productNames: extra?.productNames,
        steps: extra?.steps ?? messages.flatMap((message) => message.tools.map((tool) => tool.name)),
      });
      track.handoffRequested(payload.reason, false, "prepared", path);
      return payload;
    },
    [messages, path, track],
  );

  const confirmHandoff = useCallback<UseAiAssistantValue["confirmHandoff"]>(
    async (payload) => {
      const result = await runTool(
        "request_human_handoff",
        { topic: payload.reason, summary: payload.summary, orderNumber: payload.orderNumbers[0], confirmed: true },
        buildToolContext(contextFromPath(location.pathname, location.search, {})),
      );
      track.handoffRequested(payload.reason, true, result.ok ? "handoff_tool" : "support_page", path);
      setMessages((prev) => [
        ...prev,
        {
          id: `h-${Date.now().toString(36)}`,
          role: "assistant",
          text: "",
          blocks: [
            result.ok
              ? {
                  type: "notice" as const,
                  tone: "success" as const,
                  title: "تم تسجيل طلب المتابعة",
                  text: "فريق رواء سيستلم الملخص ويتواصل معك خلال ساعات العمل.",
                }
              : {
                  type: "human_handoff" as const,
                  topic: payload.reason || "متابعة",
                  summary: payload.summary,
                  topics: payload.keyMessages,
                  orderNumber: payload.orderNumbers[0],
                  channel: "support_page" as const,
                  whatsappMessage: payload.text,
                },
          ],
          sources: [],
          tools: [],
          at: Date.now(),
        },
      ]);
    },
    [buildToolContext, location.pathname, location.search, path, track],
  );

  /* ------------------------------- التقييم ------------------------------- */

  const submitFeedback = useCallback<UseAiAssistantValue["submitFeedback"]>(
    (messageId, rating, reason) => {
      setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, feedback: rating } : message)));
      const target = messages.find((message) => message.id === messageId);
      track.feedback(rating, messageId, (target?.tools ?? []).map((tool) => tool.name), reason);
      if (rating === "up") pushToast({ tone: "success", title: "شكرًا لتقييمك" });
      if (rating === "down") {
        const texts = [...messages].reverse().filter((message) => message.role === "user");
        const topic = texts[0]?.text.slice(0, 80) ?? "غير محدد";
        recordKnowledgeGap({ topic, locale, path });
        track.knowledgeGap(topic, path);
      }
    },
    [locale, messages, path, pushToast, track],
  );

  /* الإغلاق عند تغيير المسار ليس تلقائيًا: المحادثة تبقى لأن السياق مُمرَّر.
     لكن نوقف أي بثّ جارٍ عند مغادرة الصفحة كاملة. */
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    open,
    status,
    messages,
    busy,
    activeTools,
    conversationId: conversation.id,
    canUpload: uploadsSupported(),
    history,
    openChat,
    closeChat,
    sendMessage,
    stopGenerating,
    retryLast,
    newConversation,
    openConversation,
    submitFeedback,
    runClientAction,
    prepareHandoff,
    confirmHandoff,
  };
}

function resolveProductIdSafe(value: string): boolean {
  return Boolean(resolveSummary(value));
}

/** يُستخدم في الواجهة لمعرفة عدد المحادثات المحفوظة دون تشغيل المساعد. */
export function storedConversationCount(userKey: string): number {
  return listConversations({ userKey }).length;
}

export { clearConversation, saveConversation };

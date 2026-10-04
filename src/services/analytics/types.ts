/**
 * Analytics contract.
 *
 * Event names and payloads follow the GA4 ecommerce conventions so any provider
 * (GA4, GTM, a warehouse, or a custom endpoint) can consume them unchanged.
 * No provider, measurement ID or endpoint is hard-coded anywhere in the app:
 * everything is activated through environment variables, and nothing fires
 * before the visitor has given consent when consent is required.
 */

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  discount?: number;
  index?: number;
}

export interface AnalyticsEventMap {
  /* --------------------------- Ecommerce --------------------------- */
  view_item: { currency: string; value: number; items: AnalyticsItem[] };
  view_item_list: { item_list_id: string; item_list_name: string; items: AnalyticsItem[] };
  search: { search_term: string; results_count?: number };
  add_to_cart: { currency: string; value: number; items: AnalyticsItem[] };
  remove_from_cart: { currency: string; value: number; items: AnalyticsItem[] };
  view_cart: { currency: string; value: number; items: AnalyticsItem[] };
  begin_checkout: { currency: string; value: number; items: AnalyticsItem[]; coupon?: string };
  add_shipping_info: { currency: string; value: number; shipping_tier: string; items: AnalyticsItem[] };
  add_payment_info: { currency: string; value: number; payment_type: string; items: AnalyticsItem[] };
  purchase: {
    transaction_id: string;
    currency: string;
    value: number;
    tax?: number;
    shipping?: number;
    coupon?: string;
    items: AnalyticsItem[];
  };

  /* ----------------------------- Services ----------------------------- */
  book_service: { service_type: string; city?: string; reference?: string; preferred_date?: string };
  submit_warranty: { reference: string; issue_type?: string };
  submit_return: { reference: string; reason?: string; order_number?: string };
  business_lead: { reference: string; industry?: string; city?: string; estimated_consumption?: string };

  /* ------------------------- Content & filters ------------------------- */
  hero_slide_view: { slide_id: string; slide_title: string; index: number };
  hero_cta_click: { slide_id: string; cta: "primary" | "secondary"; target: string };
  announcement_view: { announcement_id: string; kind: string; featured: boolean };
  announcement_click: { announcement_id: string; kind: string; target?: string };
  filter_applied: { category?: string; filter_count: number; filters: string[]; results_count?: number };
  filter_cleared: { category?: string; previous_count: number };

  /* ---------------------------- Calculator ---------------------------- */
  calculator_started: { mode: string };
  calculator_completed: {
    mode: string;
    months: number;
    break_even_month: number | null;
    savings: number;
    currency: string;
    product_slug?: string;
  };
  calculator_product_selected: { product_slug: string; source: "catalog" | "manual" };
  calculator_break_even_viewed: { month: number | null };
  calculator_recommendation_click: { product_slug: string; action: "view" | "compare" | "use" };
  calculator_shared: { months: number; savings_band: string };
  calculator_saved: { months: number };

  /* ------------------------------ AI assistant ------------------------------ */
  /**
   * أحداث المساعد الذكي. لا تُرسَل **أي** محتويات محادثة أو بيانات شخصية:
   * فقط أسماء أدوات، أنواع كتل، أرقام قياسية، وأطوال نصوص.
   */
  ai_chat_opened: { entry: "launcher" | "cta" | "contextual" | "restored"; path: string; demo: boolean };
  ai_chat_closed: { path: string; turns: number; duration_ms: number };
  ai_message_sent: {
    path: string;
    locale: string;
    length: number;
    has_attachment: boolean;
    has_product_context: boolean;
    /** تصنيف النية إن أمكن تحديده على العميل (`dev` فقط). */
    intent?: string;
  };
  ai_response_received: {
    path: string;
    demo: boolean;
    latency_ms: number;
    blocks: string[];
    tools: string[];
    sources_count: number;
    text_length: number;
  };
  ai_tool_called: { name: string; state: "started" | "succeeded" | "failed"; ms?: number; path: string };
  ai_tool_failed: { name: string; code?: string; path: string };
  ai_product_card_click: { product_id: string; cta: "view" | "add_to_cart" | "compare" | "fit"; position: number; path: string };
  ai_carousel_browsed: { items: number; position: number; path: string };
  ai_add_to_cart: { product_id: string; ok: boolean; path: string };
  ai_comparison_viewed: { product_ids: string[]; source: "chat" | "compare_page" };
  ai_calculator_used: { mode: string; months: number; savings_band: string; from_chat: boolean };
  ai_advisor_used: { usage?: string; household?: number; from_chat: boolean };
  ai_service_booking_started: { service_type?: string; city?: string; from_chat: boolean };
  ai_attachment_uploaded: { kind: string; mime: string; size_band: string; accepted: boolean };
  ai_handoff_requested: { reason: string; consented: boolean; channel: string; path: string };
  ai_feedback: { rating: "up" | "down"; reason?: string; message_id: string; tools: string[] };
  ai_error: { code: string; path: string; retryable: boolean };
  ai_stopped: { path: string; at_length: number };
  ai_quick_reply_clicked: { text: string; path: string };
  ai_knowledge_gap: { topic: string; path: string };

  /* --------------------------- Site health --------------------------- */
  config_issue: { issue_id: string; level: string };
  web_vital: { metric: string; value: number; rating: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type ConsentCategory = "analytics" | "marketing";

export interface AnalyticsConsent {
  analytics: boolean;
  marketing: boolean;
}

export interface AnalyticsProvider {
  readonly id: string;
  /**
   * Called at most once, and only after the state allows the provider to load.
   * Providers must not fetch or inject scripts before this point.
   */
  init(settings: { measurementId: string }): void;
  track<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventMap[E]): void;
  /** Optional page-view hook for providers that are not SPA-aware. */
  pageView?(path: string): void;
  /**
   * Partial consent updates: a provider that only needs analytics must ignore
   * the marketing flag and vice versa.
   */
  setConsent(consent: AnalyticsConsent): void;
}

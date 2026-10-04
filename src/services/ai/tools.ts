/**
 * تنفيذ الأدوات في الواجهة (Client tool executor).
 *
 * استخدامان فقط:
 *  1. **وضع التطوير/العرض** — مساعد تجريبي واضح الوسم يعمل بلا خادم، فيعيد
 *     استخدام نفس خدمات المتجر (كتالوج، توافق، صيانة، حاسبة، معرفة) بدل تكرار
 *     أي منطق. هذا هو «Mock Development implementation» المسموح به.
 *  2. **إجراءات المتصفح** — `add_to_cart` و`save_to_wishlist` يجب أن تُنفَّذا في
 *     متجر العميل نفسه، فلا يمكن أن ينفّذها الخادم.
 *
 * في الإنتاج مع خادم مهيّأ، الأدوات القرائية تُنفَّذ على الخادم (نفس القائمة
 * ونفس المواصفات في `src/lib/ai/tool-specs.ts`) والواجهة تستقبل الكتل فقط.
 */
import { catalogApi } from "@/services/catalogApi";
import { productApi, ordersApi } from "@/services/api";
import { compatibilityApi } from "@/services/compatibilityApi";
import { maintenanceApi } from "@/services/maintenanceApi";
import { availabilityApi } from "@/services/serviceAvailability";
import { payments } from "@/services/payments";
import { trackingApi, warrantyApi, returnsApi } from "@/services/helpApi";
import { searchKnowledge } from "@/services/ai/knowledge";
import { advise, type AdvisorAnswers } from "@/lib/water-advisor";
import { calculate, BOTTLE_PRESETS } from "@/lib/calculator-logic";
import { planFor } from "@/lib/maintenance";
import { shipping } from "@/config/site";
import { formatMoney } from "@/lib/format";
import { isAiToolName, type AiLocale, type AiPageContext, type AiToolName } from "@/types/ai";
import { validateToolArgs } from "@/lib/ai/tool-specs";
import { resolveProduct, resolveSummary } from "@/services/ai/catalog-resolver";
import type { CatalogQuery, ProductSummary } from "@/types/catalog";
import type { Order } from "@/types/order";
import type { User } from "@/types/auth";

export interface ToolContext {
  locale: AiLocale;
  page: AiPageContext;
  user: User | null;
  guestToken?: string;
}

export interface ToolResult {
  ok: boolean;
  /** ملخص جاهز للعرض/للنموذج — مأخوذ من بيانات النظام لا من تخمين. */
  summary: string;
  /** بيانات منظّمة تُستخدم لبناء كتل العرض. */
  data?: Record<string, unknown>;
  /** رموز خطأ مختصرة، بلا تفاصيل داخلية. */
  error?: string;
  /** حالة تتطلب تصعيدًا لموظف (فشل متكرر، بيانات غير كافية، شكوى). */
  escalate?: boolean;
}

const NOT_AVAILABLE = "هذه الخدمة تحتاج جلسة عميل مسجّلة على خادم رواء.";

function ok(summary: string, data?: Record<string, unknown>): ToolResult {
  return { ok: true, summary, data };
}

function fail(error: string, summary: string, escalate = false): ToolResult {
  return { ok: false, error, summary, escalate };
}

function priceLine(summary: ProductSummary): string {
  const discount = summary.compareAtPrice && summary.compareAtPrice > summary.price ? ` (قبل الخصم ${formatMoney(summary.compareAtPrice)})` : "";
  return `${formatMoney(summary.price)}${discount}`;
}

function availabilityLabel(summary: ProductSummary): string {
  switch (summary.stockStatus) {
    case "in_stock":
      return "متوفر";
    case "low_stock":
      return "كمية محدودة";
    case "out_of_stock":
      return "غير متوفر حاليًا";
    case "coming_soon":
      return "قريبًا";
    default:
      return "حالة المخزون غير معلنة";
  }
}

function summaryPayload(summary: ProductSummary): Record<string, unknown> {
  return {
    id: summary.id,
    slug: summary.slug,
    name: summary.name,
    nameEn: summary.nameEn,
    sku: summary.sku,
    price: summary.price,
    compareAtPrice: summary.compareAtPrice,
    currency: summary.currency,
    availability: availabilityLabel(summary),
    rating: summary.rating,
    reviewCount: summary.reviewCount,
    image: summary.image,
    category: summary.categoryName,
    subcategory: summary.subcategoryName,
    warrantyMonths: summary.attributes?.warrantyMonths,
    replacementMonths: summary.attributes?.replacementMonths,
    stages: summary.attributes?.stages,
    systemType: summary.attributes?.systemType,
    flowRateGpd: summary.attributes?.flowRateGpd,
    capacityLiters: summary.attributes?.capacityLiters,
    dimensions: summary.attributes?.dimensions,
    usage: summary.attributes?.usage,
    shortDescription: summary.shortDescription,
    url: `/p/${summary.slug}`,
  };
}

/* ------------------------------------------------------------------ */
/* أدوات الكتالوج                                                      */
/* ------------------------------------------------------------------ */

async function searchProducts(args: Record<string, unknown>): Promise<ToolResult> {
  const query = typeof args.query === "string" ? args.query : "";
  const limit = typeof args.limit === "number" ? Math.min(8, Math.max(1, args.limit)) : 4;

  const result = await catalogApi.listProducts(
    {
      search: query || undefined,
      categorySlug: typeof args.category === "string" ? args.category : undefined,
      useCase: typeof args.useCase === "string" ? [args.useCase] : undefined,
      users: typeof args.users === "string" ? [args.users] : undefined,
      installationType: typeof args.installationType === "string" ? [args.installationType] : undefined,
      minPrice: typeof args.minPrice === "number" ? args.minPrice : undefined,
      maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
      availability: args.inStockOnly === true ? "in_stock" : undefined,
      discounted: args.discountedOnly === true ? true : undefined,
      systemType: Array.isArray(args.systemType) ? (args.systemType as string[]) : undefined,
      sort: typeof args.sort === "string" ? (args.sort as NonNullable<CatalogQuery["sort"]>) : "featured",
      page: 1,
      pageSize: Math.max(6, limit),
    },
    typeof args.category === "string" ? args.category : undefined
  );

  const items = result.items.slice(0, limit);
  if (items.length === 0) {
    return ok("لم نجد منتجًا يطابق هذه الشروط في الكتالوج.", { items: [], total: result.total });
  }
  return ok(
    `وجدنا ${result.total} منتجًا، نعرض ${items.length} منها.`,
    { items: items.map(summaryPayload), total: result.total, query }
  );
}

function getProduct(args: Record<string, unknown>): ToolResult {
  const id = typeof args.id === "string" ? args.id : "";
  const summary = resolveSummary(id);
  if (!summary) return fail("NOT_FOUND", "لم نجد هذا المنتج في الكتالوج الحالي.", true);
  return ok(`${summary.name} — ${priceLine(summary)} — ${availabilityLabel(summary)}.`, summaryPayload(summary));
}

async function listByCategory(args: Record<string, unknown>): Promise<ToolResult> {
  const category = typeof args.category === "string" ? args.category : "";
  const limit = typeof args.limit === "number" ? Math.min(8, Math.max(1, args.limit)) : 4;
  const result = await catalogApi.listProducts(
    {
      sort: typeof args.sort === "string" ? (args.sort as never) : "featured",
      page: 1,
      pageSize: Math.max(6, limit),
    },
    category,
    typeof args.subcategory === "string" ? args.subcategory : undefined
  );
  const items = result.items.slice(0, limit);
  if (items.length === 0) return fail("EMPTY_CATEGORY", "هذا القسم لا يحتوي منتجات متاحة الآن.", false);
  return ok(`${result.total} منتجًا في هذا القسم.`, { items: items.map(summaryPayload), total: result.total });
}

function checkAvailability(args: Record<string, unknown>): ToolResult {
  const summary = resolveSummary(typeof args.id === "string" ? args.id : "");
  if (!summary) return fail("NOT_FOUND", "لم نجد هذا المنتج في الكتالوج الحالي.", true);
  return ok(`${summary.name}: ${availabilityLabel(summary)}.`, {
    id: summary.id,
    name: summary.name,
    availability: availabilityLabel(summary),
    inStock: summary.inStock,
  });
}

function getPriceQuote(args: Record<string, unknown>): ToolResult {
  const summary = resolveSummary(typeof args.id === "string" ? args.id : "");
  if (!summary) return fail("NOT_FOUND", "لم نجد هذا المنتج في الكتالوج الحالي.", true);
  const quantity = typeof args.quantity === "number" ? Math.min(20, Math.max(1, Math.round(args.quantity))) : 1;
  const lineTotal = summary.price * quantity;
  const stockLine =
    summary.attributes?.installationIncluded === true
      ? "التركيب مشمول حسب بيانات المنتج."
      : "التركيب غير مذكور كمشمول في بيانات المنتج.";
  return ok(
    `${quantity} × ${summary.name} = ${formatMoney(lineTotal)}. ${stockLine} يُعاد التحقق من السعر النهائي في صفحة الدفع.`,
    {
      id: summary.id,
      name: summary.name,
      unitPrice: summary.price,
      compareAtPrice: summary.compareAtPrice,
      quantity,
      lineTotal,
      currency: summary.currency,
      installationIncluded: summary.attributes?.installationIncluded === true,
      freeShippingThreshold: shipping.freeShippingThreshold,
      paymentMethods: payments.status().methods,
    }
  );
}

async function compareProducts(args: Record<string, unknown>): Promise<ToolResult> {
  const ids = Array.isArray(args.ids) ? (args.ids as string[]) : [];
  const summaries = ids.map((id) => resolveSummary(id)).filter((entry): entry is ProductSummary => Boolean(entry));
  if (summaries.length < 2) return fail("NOT_ENOUGH_PRODUCTS", "أحتاج منتجين على الأقل لإجراء المقارنة.", false);

  const row = (label: string, pick: (summary: ProductSummary) => string | number | undefined, emphasis = false) => ({
    label,
    values: summaries.map((summary) => {
      const value = pick(summary);
      return value === undefined || value === "" ? "غير معلن" : String(value);
    }),
    emphasis,
  });

  const rows = [
    row("السعر", (s) => formatMoney(s.price), true),
    row("المراحل", (s) => (typeof s.attributes?.stages === "number" ? `${s.attributes.stages} مراحل` : undefined)),
    row("السعة", (s) => (typeof s.attributes?.capacityLiters === "number" ? `${s.attributes.capacityLiters} لتر` : undefined)),
    row("معدل التدفق", (s) => (typeof s.attributes?.flowRateGpd === "number" ? `${s.attributes.flowRateGpd} جالون/يوم` : undefined)),
    row("نوع النظام", (s) => (typeof s.attributes?.systemType === "string" ? s.attributes.systemType : undefined)),
    row("الأبعاد", (s) => (typeof s.attributes?.dimensions === "string" ? s.attributes.dimensions : undefined)),
    row("الضمان", (s) => (typeof s.attributes?.warrantyMonths === "number" ? `${s.attributes.warrantyMonths} شهرًا` : undefined)),
    row("دورة الشمعات", (s) => (typeof s.attributes?.replacementMonths === "number" ? `كل ${s.attributes.replacementMonths} شهرًا` : undefined)),
    row("مضخة / خزان", (s) => {
      const pump = s.attributes?.hasPump === true ? "مضخة" : "";
      const tank = s.attributes?.hasTank === true ? "خزان" : "";
      return [pump, tank].filter(Boolean).join(" + ") || "غير معلن";
    }),
    row("الاستخدام", (s) => {
      const usage = s.attributes?.usage;
      return usage === "commercial" ? "تجاري" : usage === "both" ? "منزلي وتجاري" : usage === "home" ? "منزلي" : undefined;
    }),
    row("التوفر", (s) => availabilityLabel(s)),
  ];

  return ok(`مقارنة ${summaries.length} منتجات في ${rows.length} صفوف مبنية على بيانات الكتالوج.`, {
    products: summaries.map(summaryPayload),
    rows,
  });
}

function getProductMedia(args: Record<string, unknown>): ToolResult {
  const id = typeof args.id === "string" ? args.id : "";
  const product = resolveProduct(id);
  if (!product) return fail("NOT_FOUND", "لم نجد صورًا لهذا المنتج.", true);
  const role = typeof args.role === "string" ? args.role : "product";
  const images = product.images.slice(0, role === "parts" ? 2 : 4).map((image) => ({
    url: image.medium,
    alt: image.alt,
    ratio: image.ratio,
  }));
  if (images.length === 0) return fail("NO_MEDIA", "لا توجد صور مسجّلة لهذا المنتج في الكتالوج.", false);
  return ok(`${images.length} صورة من وسائط المنتج.`, { productId: product.id, name: product.name, images });
}

/* ------------------------------------------------------------------ */
/* توافق وصيانة                                                        */
/* ------------------------------------------------------------------ */

async function findCompatibleParts(args: Record<string, unknown>): Promise<ToolResult> {
  const query = typeof args.query === "string" ? args.query : "";
  if (!query.trim()) return fail("MISSING_QUERY", "أحتاج اسم الجهاز أو رقم الموديل.", false);
  const result = await compatibilityApi.search(query);
  if (result.parts.length === 0) {
    return ok(
      result.note ??
        "لا توجد بيانات توافق مسجّلة لهذا الاستعلام. أرسل رقم الموديل من ملصق الجهاز لنبحث مرة أخرى، ولا نؤكد توافقًا غير موجود في البيانات.",
      { parts: [], suggestions: result.suggestions, device: result.device, note: result.note }
    );
  }
  const confident = result.parts.filter((part) => part.confidence >= 60);
  return ok(
    `${result.parts.length} قطعة مرتبطة بالاستعلام، منها ${confident.length} بتطابق معلن في البيانات.`,
    {
      device: result.device,
      suggestions: result.suggestions,
      parts: result.parts.slice(0, 6).map((part) => ({
        ...summaryPayload(part.summary),
        confidence: part.confidence,
        reasons: part.reasons.map((reason) => reason.label),
        alternative: part.alternative,
      })),
    }
  );
}

async function getDeviceCartridgeSet(args: Record<string, unknown>): Promise<ToolResult> {
  const id = typeof args.id === "string" ? args.id : "";
  const summary = resolveSummary(id);
  if (!summary) return fail("NOT_FOUND", "لم نجد هذا الجهاز في الكتالوج.", true);
  const result = await compatibilityApi.forDevice(summary.slug);
  if (!result || result.parts.length === 0) {
    return ok("لم تُسجَّل قطعة متوافقة لهذا الجهاز في الكتالوج بعد.", { device: summaryPayload(summary), parts: [] });
  }
  const primary = result.parts.filter((part) => !part.alternative).slice(0, 3);
  return ok(`${result.parts.length} قطعة متوافقة معلنة، الطقم المقترح: ${primary[0]?.summary.name ?? "—"}.`, {
    device: summaryPayload(summary),
    setNote: result.setNote,
    recommended: primary.map((part) => ({
      ...summaryPayload(part.summary),
      confidence: part.confidence,
      reasons: part.reasons.map((reason) => reason.label),
    })),
    alternatives: result.parts
      .filter((part) => part.alternative)
      .slice(0, 3)
      .map((part) => summaryPayload(part.summary)),
  });
}

async function getMaintenanceSchedule(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const id = typeof args.id === "string" ? args.id : "";
  const summary = resolveSummary(id);
  const intervalMonths = summary?.attributes?.replacementMonths;

  if (ctx.user) {
    const devices = await maintenanceApi.list();
    const match = summary ? devices.find((entry) => entry.device.deviceSlug === summary.slug) : devices[0];
    if (match) {
      const plan = planFor(match.device);
      return ok(
        `${match.device.deviceName}: آخر تغيير ${match.device.lastCartridgeChange}، التغيير القادم ${plan.nextChangeAt} (${plan.stateLabel}).`,
        {
          deviceId: match.device.id,
          deviceName: match.device.deviceName,
          lastChange: match.device.lastCartridgeChange,
          nextChange: plan.nextChangeAt,
          percentRemaining: plan.percentRemaining,
          state: plan.state,
          cartridgeSet: plan.recommendedSet?.summary.name,
          cartridgeSetId: plan.recommendedSet?.summary.id,
        }
      );
    }
  }

  if (!summary) return fail("NOT_FOUND", "لم أتعرف على الجهاز. أرسل اسم الجهاز أو رقم الموديل.", true);
  if (typeof intervalMonths !== "number") {
    return ok("دورة استبدال الشمعات غير معلنة في بيانات هذا المنتج، ولا نخمّنها.", {
      device: summaryPayload(summary),
      intervalMonths: null,
      registered: false,
    });
  }
  return ok(
    `بيانات المنتج تذكر دورة استبدال كل ${intervalMonths} شهرًا. ${ctx.user ? "أضف الجهاز في مركز الصيانة لنتابع موعده بدقة." : "سجّل الجهاز في مركز الصيانة لنتابع الموعد بدقة."}`,
    { device: summaryPayload(summary), intervalMonths, registered: false }
  );
}

/* ------------------------------------------------------------------ */
/* معرفة وخدمات                                                        */
/* ------------------------------------------------------------------ */

function getKnowledge(args: Record<string, unknown>): ToolResult {
  const query = typeof args.query === "string" ? args.query : "";
  const kind = typeof args.kind === "string" ? (args.kind as "faq" | "guide" | "policy" | "service") : undefined;
  const hits = searchKnowledge(query, { kinds: kind ? [kind] : undefined, limit: 3 });
  if (hits.length === 0) {
    return fail("NO_KNOWLEDGE", "لا يوجد محتوى موثوق في الأدلة أو الأسئلة الشائعة يغطي هذا السؤال.", true);
  }
  return ok(
    `${hits.length} مصدرًا موثوقًا.`,
    {
      hits: hits.map((hit) => ({
        id: hit.doc.id,
        kind: hit.doc.kind,
        title: hit.doc.title,
        excerpt: hit.excerpt,
        href: hit.doc.href,
        updatedAt: hit.doc.updatedAt,
      })),
    }
  );
}

async function getServiceAvailability(args: Record<string, unknown>): Promise<ToolResult> {
  const city = typeof args.city === "string" ? args.city : "";
  if (!city.trim()) return fail("MISSING_CITY", "أحتاج اسم المدينة للتحقق من تغطية الخدمة.", false);
  const availability = await availabilityApi.forCity({
    city,
    district: typeof args.district === "string" ? args.district : undefined,
  });

  const fee = availability.installation.fee;
  const parts = [
    availability.covered ? `${availability.cityName} ضمن نطاق الخدمة المعلن.` : `${availability.cityName} خارج قائمة المدن المخدومة المعلنة.`,
    fee !== undefined && availability.installation.sampleFee
      ? `رسوم التركيب التقديرية ${formatMoney(fee)} (قيمة إعدادات قابلة للتعديل، تُحدَّد نهائيًا عند الحجز).`
      : "الرسوم تُحدَّد عند تأكيد الحجز.",
    availability.nearestSlot && availability.nearestSlot.sample ? `أقرب نافذة (بيانات عرض): ${availability.nearestSlot.label}.` : "",
    availability.note,
  ].filter(Boolean);

  return ok(parts.join(" "), {
    cityId: availability.cityId,
    cityName: availability.cityName,
    covered: availability.covered,
    source: availability.source,
    districts: availability.districts,
    fees: {
      installation: availability.installation.fee,
      maintenance: availability.maintenance.fee,
      waterTest: availability.waterTest.fee,
      sample: availability.installation.sampleFee,
    },
    nearestSlot: availability.nearestSlot,
    branch: availability.branch,
  });
}

async function getAvailableSlots(args: Record<string, unknown>): Promise<ToolResult> {
  const city = typeof args.city === "string" ? args.city : "";
  if (!city.trim()) return fail("MISSING_CITY", "أحتاج المدينة لعرض المواعيد.", false);
  const availability = await availabilityApi.forCity({ city });
  if (!availability.nearestSlot) {
    return ok(
      "لا تتوفر مواعيد مُعلنة لهذه المدينة من مصدر موثوق. يمكن لموظف الخدمة تأكيد أقرب موعد بعد إرسال الطلب.",
      { city: availability.cityName, slots: [], source: availability.source }
    );
  }
  return ok(
    `${availability.nearestSlot.sample ? "نافذة عرض تجريبية" : "أقرب نافذة متاحة"}: ${availability.nearestSlot.label}.`,
    { city: availability.cityName, slots: [availability.nearestSlot], source: availability.source }
  );
}

function getPaymentMethods(): ToolResult {
  const status = payments.status();
  const label = status.live
    ? "بوابة دفع حقيقية مهيأة."
    : status.testMode
      ? "بوابة دفع تجريبية للعرض فقط — لا تُحصَّل أي مبالغ حقيقية."
      : "لا توجد بوابة دفع مهيأة في هذا البناء، وتظهر فقط الطرق التي لا تحتاج بوابة.";
  return ok(`${label} الطرق المتاحة: ${status.methods.join(", ")}.`, {
    provider: status.id,
    live: status.live,
    testMode: status.testMode,
    methods: status.methods,
  });
}

/* ------------------------------------------------------------------ */
/* حساب العميل                                                         */
/* ------------------------------------------------------------------ */

async function trackOrder(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const orderNumber = typeof args.orderNumber === "string" ? args.orderNumber : "";
  const contact = typeof args.contact === "string" ? args.contact : undefined;
  if (!orderNumber.trim()) return fail("MISSING_ORDER", "أحتاج رقم الطلب بصيغة RWA-…", false);

  try {
    const record = await trackingApi.lookup({ reference: orderNumber, contact });
    return ok(`${record.reference}: ${record.statusLabel}. ${record.etaLabel}`, {
      reference: record.reference,
      statusLabel: record.statusLabel,
      etaLabel: record.etaLabel,
      steps: record.steps?.map((step) => ({ label: step.label, done: Boolean(step.at) })),
      carrier: record.carrier,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/جوال|صاحب الطلب/i.test(message)) {
      return fail("VERIFICATION_REQUIRED", "لحماية بياناتك أحتاج آخر 4 أرقام من جوال صاحب الطلب أو بريده للتأكد من ملكية الطلب.", false);
    }
    void ctx;
    return fail("NOT_FOUND", "لم نعثر على طلب بهذا الرقم. تأكد من الرقم كما ظهر في رسالة التأكيد.", false);
  }
}

async function listMyOrders(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.user) return fail("AUTH_REQUIRED", NOT_AVAILABLE, false);
  const limit = typeof args.limit === "number" ? Math.min(5, Math.max(1, args.limit)) : 3;
  const orders: Order[] = await ordersApi.list({ userId: ctx.user.id });
  if (orders.length === 0) return ok("لا توجد طلبات مسجّلة على هذا الحساب.", { orders: [] });
  return ok(`${orders.length} طلب على هذا الحساب.`, {
    orders: orders.slice(0, limit).map((order) => ({
      number: order.number,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => item.name).slice(0, 4),
    })),
  });
}

async function getMyDevices(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.user) return fail("AUTH_REQUIRED", NOT_AVAILABLE, false);
  const devices = await maintenanceApi.list();
  if (devices.length === 0) {
    return ok("لا توجد أجهزة مسجّلة في مركز الصيانة. يمكن إضافة الجهاز من تبويب «الصيانة» في حسابك.", { devices: [] });
  }
  return ok(`${devices.length} جهاز مسجّل.`, {
    devices: devices.map((entry) => ({
      id: entry.device.id,
      name: entry.device.deviceName,
      deviceSlug: entry.device.deviceSlug,
      lastChange: entry.device.lastCartridgeChange,
      nextChange: entry.plan.nextChangeAt,
      percentRemaining: entry.plan.percentRemaining,
      state: entry.plan.state,
      cartridgeSet: entry.plan.recommendedSet?.summary.name,
      cartridgeSetId: entry.plan.recommendedSet?.summary.id,
    })),
  });
}

async function getWarrantyStatus(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const id = typeof args.id === "string" ? args.id : "";
  const summary = id ? resolveSummary(id) : undefined;
  const productWarranty = summary?.attributes?.warrantyMonths;

  if (!ctx.user) {
    return ok(
      productWarranty
        ? `بيانات المنتج تذكر ضمانًا لمدة ${productWarranty} شهرًا. لتأكيد ضمان جهازك بالتحديد نحتاج تسجيل الدخول.`
        : "لتأكيد ضمان جهازك نحتاج تسجيل الدخول؛ بيانات الضمان عامة في صفحة كل منتج.",
      { warrantyMonths: productWarranty, registered: false }
    );
  }

  const claims = await warrantyApi.list();
  return ok(
    claims.length > 0 ? `${claims.length} طلب ضمان على هذا الحساب.` : "لا توجد طلبات ضمان على هذا الحساب.",
    {
      warrantyMonths: productWarranty,
      registered: true,
      claims: claims.slice(0, 3).map((claim) => ({ reference: claim.reference, status: claim.status, product: claim.productLabel })),
    }
  );
}

async function checkReturnEligibility(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const orderNumber = typeof args.orderNumber === "string" ? args.orderNumber : "";
  if (!orderNumber.trim()) return fail("MISSING_ORDER", "أحتاج رقم الطلب للتحقق من الأهلية.", false);
  try {
    const order = await returnsApi.findOrder(orderNumber);
    if (ctx.user && order.userId && order.userId !== ctx.user.id) {
      return fail("FORBIDDEN", "هذا الطلب مسجّل على حساب آخر.", true);
    }
    const days = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86_400_000);
    const eligible = days <= shipping.returnWindowDays;
    return ok(
      eligible
        ? `الطلب ${order.number} داخل نافذة الإرجاع (${shipping.returnWindowDays} يومًا). الإرجاع النهائي يعتمد على قبول النظام لتفاصيل الطلب.`
        : `الطلب ${order.number} خارج نافذة الإرجاع المعلنة (${shipping.returnWindowDays} يومًا من الاستلام).`,
      {
        orderNumber: order.number,
        daysSinceOrder: days,
        windowDays: shipping.returnWindowDays,
        eligible,
        items: order.items.map((item) => ({ name: item.name, sku: item.sku, quantity: item.quantity })),
      }
    );
  } catch {
    return fail("NOT_FOUND", "لم نعثر على هذا الطلب. تأكد من الرقم كما ظهر في رسالة التأكيد.", false);
  }
}

/* ------------------------------------------------------------------ */
/* حساب وترشيح                                                         */
/* ------------------------------------------------------------------ */

function recommendSystems(args: Record<string, unknown>): ToolResult {
  const answers: AdvisorAnswers = {
    city: typeof args.city === "string" ? args.city : "",
    housing: (typeof args.housing === "string" ? args.housing : "") as AdvisorAnswers["housing"],
    usage: (typeof args.usage === "string" ? args.usage : "") as AdvisorAnswers["usage"],
    users: (typeof args.users === "string" ? args.users : "") as AdvisorAnswers["users"],
    consumption: (typeof args.consumption === "string" ? args.consumption : "") as AdvisorAnswers["consumption"],
    source: (typeof args.source === "string" ? args.source : "") as AdvisorAnswers["source"],
    tds: (typeof args.tds === "string" ? args.tds : "") as AdvisorAnswers["tds"],
    problem: (typeof args.problem === "string" ? args.problem : "") as AdvisorAnswers["problem"],
  };

  const result = advise(answers);
  if (result.recommendations.length === 0) {
    return ok(result.notes[0] ?? "أحتاج معرفة الغرض من الاستخدام لعرض ترشيح حقيقي.", { recommendations: [], notes: result.notes });
  }
  return ok(
    `${result.recommendations.length} ترشيحًا من مستشار المياه نفسه. ${result.notes[0]}`,
    {
      coverage: result.coverage,
      notes: result.notes,
      recommendations: result.recommendations.map((entry) => ({
        ...summaryPayload(entry.summary),
        reasons: entry.reasons,
        cautions: entry.cautions,
      })),
    }
  );
}

function calculateSavings(args: Record<string, unknown>): ToolResult {
  const preset = BOTTLE_PRESETS.find((entry) => entry.id === "gallon") ?? BOTTLE_PRESETS[0];
  const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  const productId = typeof args.productId === "string" ? args.productId : undefined;
  const device = productId ? resolveProduct(productId) : undefined;
  const deviceSummary = productId ? resolveSummary(productId) : undefined;

  const input = {
    mode: (args.mode === "purchases" ? "purchases" : "estimate") as "estimate" | "purchases",
    estimate: {
      people: Math.min(20, Math.max(1, num(args.people, 4))),
      litersPerPersonPerDay: Math.min(15, Math.max(0.5, num(args.litersPerPersonPerDay, 3))),
      extraMonthlyCost: 0,
    },
    purchases: {
      presetId: preset.id,
      unitLiters: Math.min(100, Math.max(0.1, num(args.unitLiters, preset.unitLiters))),
      unitPrice: Math.min(1000, Math.max(0, num(args.unitPrice, preset.defaultUnitPrice))),
      unitsPerPeriod: Math.min(500, Math.max(0, num(args.unitsPerPeriod, 6))),
      frequency: (args.frequency === "weekly" ? "weekly" : "monthly") as "weekly" | "monthly",
    },
    ownership: {
      productSlug: device?.slug,
      productName: device?.name,
      devicePrice: device?.price ?? 0,
      installationCost: 0,
      initialAccessoriesCost: 0,
      replacementKitPrice: 0,
      replacementIntervalMonths: Number(deviceSummary?.attributes?.replacementMonths ?? 0),
      maintenancePrice: num(args.maintenancePrice, 0),
      maintenanceIntervalMonths: 12,
      extraMonthlyCost: 0,
      manual: true,
    },
    months: Math.min(240, Math.max(6, num(args.months, 60))),
    waterPriceGrowthPercent: 0,
  };

  const result = calculate(input);
  return ok(
    result.monthlyBottledCost <= 0 || result.monthlyLiters <= 0
      ? "أحتاج أرقام الاستهلاك أو المشتريات لحساب التوفير."
      : `التكلفة الحالية ${formatMoney(result.monthlyBottledCost)} شهريًا، ونقطة التعادل ${result.breakEvenMonth ? `بعد ${result.breakEvenMonth} شهرًا` : "لم تتحقق في المدة المختارة"}، والتوفير المتوقع ${formatMoney(Math.max(0, result.savings))} خلال ${result.months} شهرًا.`,
    {
      monthlyLiters: result.monthlyLiters,
      monthlyBottledCost: result.monthlyBottledCost,
      filterTotal: result.filterTotal,
      bottledTotal: result.bottledTotal,
      savings: result.savings,
      breakEvenMonth: result.breakEvenMonth,
      months: result.months,
      costPerLiterDropPercent: result.costPerLiterDropPercent,
      missingData: result.missingData,
      device: deviceSummary ? summaryPayload(deviceSummary) : undefined,
      input: {
        mode: input.mode,
        people: input.estimate.people,
        litersPerPersonPerDay: input.estimate.litersPerPersonPerDay,
        unitLiters: input.purchases.unitLiters,
        unitPrice: input.purchases.unitPrice,
        unitsPerPeriod: input.purchases.unitsPerPeriod,
        frequency: input.purchases.frequency,
        months: input.months,
      },
    }
  );
}

/* ------------------------------------------------------------------ */
/* إجراءات حساسة — تُوجَّه للنموذج الرسمي                               */
/* ------------------------------------------------------------------ */

/**
 * الإجراءات الحساسة (حجز/إرجاع/ضمان) لا تُنفَّذ من داخل المحادثة في هذا البناء:
 * لا نجمع بيانات شخصية في الشات، والنموذج الرسمي هو من يُنشئ الطلب.
 * تُرجع الأداة إجراءً يفتح النموذج مع تعبئة مسبقة غير شخصية.
 */
function sensitiveFlow(name: AiToolName, args: Record<string, unknown>): ToolResult {
  const form = name === "create_service_booking" ? "booking" : name === "submit_return_request" ? "return" : "warranty";
  const query: Record<string, string> = {};
  if (typeof args.productId === "string") query.product = args.productId;
  if (typeof args.serviceType === "string") query.type = args.serviceType;
  if (typeof args.city === "string") query.city = args.city;
  if (name === "submit_return_request" && typeof args.orderNumber === "string") query.order = args.orderNumber;

  return ok(
    name === "create_service_booking"
      ? "أفتح لك نموذج الحجز الرسمي مع تعبئة البيانات المتوفرة، ويصلك رقم مرجعي بعد التأكيد."
      : name === "submit_return_request"
        ? "أفتح لك نموذج الإرجاع الرسمي. لا يتم إرجاع أي مبلغ قبل مراجعة الطلب والموافقة عليه."
        : "أفتح لك نموذج طلب الضمان الرسمي. القبول يعتمد على مراجعة الفريق، ولا نضمن النتيجة مسبقًا.",
    { form, query }
  );
}

/* ------------------------------------------------------------------ */
/* المنفّذ                                                            */
/* ------------------------------------------------------------------ */

/** تشغيل أداة بالاسم مع التحقق من الوسائط والصلاحيات. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  if (!isAiToolName(name)) return fail("UNKNOWN_TOOL", "أداة غير معروفة.", false);
  const validation = validateToolArgs(name, args);
  if (!validation.ok) {
    return fail("INVALID_ARGS", `وسائط غير صحيحة: ${validation.errors.join(", ")}`, false);
  }

  switch (name) {
    case "search_products":
      return searchProducts(args);
    case "get_product":
      return getProduct(args);
    case "list_products_by_category":
      return listByCategory(args);
    case "check_availability":
      return checkAvailability(args);
    case "get_price_quote":
      return getPriceQuote(args);
    case "compare_products":
      return compareProducts(args);
    case "get_product_media":
      return getProductMedia(args);
    case "find_compatible_parts":
      return findCompatibleParts(args);
    case "get_device_cartridge_set":
      return getDeviceCartridgeSet(args);
    case "get_maintenance_schedule":
      return getMaintenanceSchedule(args, ctx);
    case "get_knowledge":
      return getKnowledge(args);
    case "get_service_availability":
      return getServiceAvailability(args);
    case "get_available_slots":
      return getAvailableSlots(args);
    case "get_payment_methods":
      return getPaymentMethods();
    case "track_order":
      return trackOrder(args, ctx);
    case "list_my_orders":
      return listMyOrders(args, ctx);
    case "get_my_devices":
      return getMyDevices(args, ctx);
    case "get_warranty_status":
      return getWarrantyStatus(args, ctx);
    case "check_return_eligibility":
      return checkReturnEligibility(args, ctx);
    case "recommend_systems":
      return recommendSystems(args);
    case "calculate_savings":
      return calculateSavings(args);
    case "create_service_booking":
    case "submit_return_request":
    case "submit_warranty_claim":
      return sensitiveFlow(name, args);
    case "save_to_wishlist":
      return ok("سأضيف المنتج إلى قائمة الرغبات.", { id: typeof args.id === "string" ? args.id : undefined });
    case "request_human_handoff":
      return ok("سأجهّز ملخصًا للموظف.", {
        topic: typeof args.topic === "string" ? args.topic : "طلب مساعدة",
        summary: typeof args.summary === "string" ? args.summary : "",
      });
    default:
      return fail("UNSUPPORTED", "هذه الأداة غير مفعّلة في هذا الوضع.", false);
  }
}

/** أدوات تحتاج بيانات جلسة/متجر ولا يمكن تشغيلها بلا تلك البيانات. */
export const CLIENT_ONLY_TOOLS: AiToolName[] = ["save_to_wishlist"];

/** هل الأداة قابلة للتنفيذ محليًا في وضع التطوير؟ */
export function isLocallyRunnable(name: AiToolName, hasUser: boolean): boolean {
  if (!hasUser && ["list_my_orders", "get_my_devices"].includes(name)) return false;
  return true;
}

export { productApi };

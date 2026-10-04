import type {
  ContactMessage,
  ContactMessageInput,
  ReturnRequest,
  ReturnRequestInput,
  TrackingLookup,
  TrackingRecord,
  TrackingStep,
  WarrantyClaim,
  WarrantyClaimInput,
} from "@/types/service";
import type { Order } from "@/types/order";
import { ApiError } from "@/types/product";
import { readJSON, writeJSON } from "@/lib/localStore";
import { serviceApi } from "./serviceApi";
import { ordersApi } from "./api";

/**
 * After-sales API: order/service tracking, warranty claims, return requests,
 * contact messages and the newsletter simulation.
 */

const CLAIMS_KEY = "rewaa_warranty_claims";
const RETURNS_KEY = "rewaa_return_requests";
const MESSAGES_KEY = "rewaa_contact_messages";
const NEWSLETTER_KEY = "rewaa_newsletter_subscribers";

function delay(ms = 620): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sequence(existing: number): string {
  return String(10000 + existing + 1).slice(-5);
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */
const ORDER_STEPS: { id: string; label: string; description: string }[] = [
  { id: "received", label: "تم استلام الطلب", description: "وصلنا طلبك وتم إنشاء رقم الطلب." },
  { id: "confirmed", label: "تأكيد الطلب والدفع", description: "تم تأكيد الدفع ومطابقة الأصناف مع المخزون." },
  { id: "preparing", label: "قيد التجهيز", description: "جارٍ تجهيز المنتجات وفحصها قبل التسليم." },
  { id: "shipped", label: "تم الشحن", description: "تم تسليم الشحنة لشركة الشحن مع رقم تتبع." },
  { id: "out_for_delivery", label: "خارج للتسليم", description: "الشحنة مع المندوب وفي طريقها إلى عنوانك." },
  { id: "delivered", label: "تم التسليم", description: "تم تسليم الطلب. نتمنى لك تجربة موفقة." },
];

const SERVICE_STEPS: { id: string; label: string; description: string }[] = [
  { id: "submitted", label: "تم استلام طلب الخدمة", description: "سجّلنا طلبك وسيتواصل معك فريق التنسيق." },
  { id: "confirmed", label: "تأكيد الطلب", description: "تم تأكيد الطلب وتحديد الفريق الفني المناسب." },
  { id: "technician_assigned", label: "تعيين الفني", description: "تم تعيين فني معتمد لحالتك." },
  { id: "scheduled", label: "تثبيت الموعد", description: "تم الاتفاق على موعد الزيارة." },
  { id: "in_progress", label: "تنفيذ الزيارة", description: "الفني في الموقع ويعمل على حالة النظام." },
  { id: "completed", label: "إكمال الخدمة", description: "تم إنهاء الزيارة وتسليم تقرير الصيانة." },
];

const ORDER_STATUS_INDEX: Record<Order["status"], number> = {
  processing: 1,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  delivered: 5,
  cancelled: 0,
};

function buildSteps(
  template: { id: string; label: string; description: string }[],
  currentIndex: number,
  timestamps: (string | undefined)[] = []
): TrackingStep[] {
  return template.map((step, index) => ({
    id: step.id,
    label: step.label,
    description: step.description,
    at: timestamps[index],
    state: index < currentIndex ? "done" : index === currentIndex ? "current" : "pending",
  }));
}

function orderToTracking(order: Order): TrackingRecord {
  const index = ORDER_STATUS_INDEX[order.status] ?? 0;
  const timestamps = ORDER_STEPS.map((_, i) => order.timeline[i]?.at);
  const carrierNumber = `SMS-${order.number.replace(/[^0-9]/g, "").slice(-8)}`;

  return {
    reference: order.number,
    kind: "order",
    statusLabel: ORDER_STEPS[index]?.label ?? "قيد المعالجة",
    statusNote: ORDER_STEPS[index]?.description ?? "",
    createdAt: order.createdAt,
    summary: [
      { label: "عدد الأصناف", value: String(order.items.reduce((sum, item) => sum + item.quantity, 0)) },
      { label: "طريقة الشحن", value: order.shippingLabel },
      { label: "طريقة الدفع", value: order.paymentLabel },
      { label: "الإجمالي", value: `${order.total.toFixed(2)} ر.س` },
    ],
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      image: item.image,
      note: item.selectionLabel,
    })),
    steps: buildSteps(ORDER_STEPS, index, timestamps),
    carrier:
      index >= 3
        ? { name: "سمسا إكسبرس", trackingNumber: carrierNumber, phone: "920001234" }
        : undefined,
    etaLabel:
      order.status === "delivered"
        ? "تم التسليم"
        : `التسليم المتوقع ${new Date(order.estimatedDeliveryFrom).toLocaleDateString("ar-SA-u-nu-latn", {
            day: "numeric",
            month: "long",
          })} – ${new Date(order.estimatedDeliveryTo).toLocaleDateString("ar-SA-u-nu-latn", {
            day: "numeric",
            month: "long",
          })}`,
    address: `${order.address.cityName} · ${order.address.district}`,
  };
}

export const trackingApi = {
  /** GET /v1/tracking/:reference?contact= */
  async lookup({ reference, contact }: TrackingLookup): Promise<TrackingRecord> {
    const clean = reference.trim().toUpperCase();
    if (clean.length < 6) {
      throw new ApiError("رقم الطلب قصير جدًا — تأكد من الرقم كاملًا", "VALIDATION", 422);
    }

    await delay(760);

    // Service requests first (RWA-SRV-…)
    if (clean.startsWith("RWA-SRV")) {
      const request = await serviceApi.getByReference(clean).catch(() => null);
      if (!request) throw new ApiError("لم نعثر على طلب خدمة بهذا الرقم", "NOT_FOUND", 404);
      const index = ["submitted", "confirmed", "technician_assigned", "scheduled", "in_progress", "completed"].indexOf(
        request.status
      );
      return {
        reference: request.reference,
        kind: "service",
        statusLabel: request.timeline[index]?.label ?? "قيد المعالجة",
        statusNote: request.timeline[index]?.label
          ? "يمكنك متابعة حالة الزيارة من هذه الصفحة أو من حسابك."
          : "",
        createdAt: request.createdAt,
        summary: [
          { label: "نوع الخدمة", value: request.typeLabel },
          { label: "المدينة", value: `${request.cityName} · ${request.district}` },
          { label: "الموعد المفضل", value: `${request.preferredDate} · ${request.preferredSlot}` },
          { label: "الحالة", value: request.timeline[index]?.label ?? "قيد المعالجة" },
        ],
        steps: buildSteps(SERVICE_STEPS, Math.max(0, index), request.timeline.map((step) => step.at)),
        technician: request.technician,
        etaLabel: request.estimatedVisit,
        address: `${request.cityName} · ${request.district}`,
      };
    }

    // Orders (RWA-YYYYMMDD-####)
    const orders = await ordersApi.list({ userId: undefined }).catch(() => [] as Order[]);
    const localStored = readJSON<Order[]>("rewaa_orders_db", []);
    const candidates = [...orders, ...localStored];
    const match = candidates.find((order) => order.number.toUpperCase() === clean);
    if (!match) {
      throw new ApiError(
        "لم نعثر على طلب بهذا الرقم. تأكد من الرقم كما ظهر في رسالة التأكيد.",
        "NOT_FOUND",
        404
      );
    }
    if (contact?.trim()) {
      const digits = contact.replace(/\D/g, "");
      const expected = match.address.phone.replace(/\D/g, "");
      const matchesContact =
        expected.endsWith(digits.slice(-4)) || (match.guestEmail ?? "").toLowerCase() === contact.trim().toLowerCase();
      if (digits.length >= 4 && !matchesContact) {
        throw new ApiError("رقم الجوال لا يطابق صاحب الطلب", "FORBIDDEN", 403);
      }
    }
    return orderToTracking(match);
  },
};

/* ------------------------------------------------------------------ */
/* Warranty claims                                                     */
/* ------------------------------------------------------------------ */
const ISSUE_LABELS: Record<WarrantyClaimInput["issueType"], string> = {
  not_powering: "الجهاز لا يعمل / لا يصل تيار",
  low_flow: "ضعف في تدفق المياه",
  leak: "تسريب مياه",
  noise: "صوت غير معتاد",
  taste_odor: "تغير في طعم أو رائحة المياه",
  high_tds: "ارتفاع قراءة TDS بعد الفلتر",
  damaged_on_arrival: "تلف عند الاستلام",
  other: "مشكلة أخرى",
};

export const warrantyApi = {
  /** POST /v1/warranty-claims */
  async create(input: WarrantyClaimInput): Promise<WarrantyClaim> {
    await delay(940);
    if (!input.orderNumber.trim()) throw new ApiError("رقم الطلب مطلوب", "VALIDATION", 422);
    if (!input.serialNumber.trim()) throw new ApiError("رقم الجهاز التسلسلي مطلوب", "VALIDATION", 422);
    if (!input.acceptedTerms) throw new ApiError("يجب الإقرار بشروط الضمان", "VALIDATION", 422);

    const existing = readJSON<WarrantyClaim[]>(CLAIMS_KEY, []);
    const claim: WarrantyClaim = {
      id: `wcl_${Date.now()}`,
      reference: `RWA-WAR-${new Date().getFullYear()}-${sequence(existing.length)}`,
      orderNumber: input.orderNumber.trim(),
      productSlug: input.productSlug,
      productLabel: input.productLabel,
      serialNumber: input.serialNumber.trim(),
      purchaseDate: input.purchaseDate,
      issueType: input.issueType,
      issueLabel: ISSUE_LABELS[input.issueType],
      description: input.description.trim(),
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      city: input.city,
      attachmentName: input.attachmentName,
      status: "received",
      createdAt: new Date().toISOString(),
      expectedResponseHours: 24,
    };
    writeJSON(CLAIMS_KEY, [claim, ...existing].slice(0, 60));
    return claim;
  },

  /** GET /v1/warranty-claims */
  async list(): Promise<WarrantyClaim[]> {
    await delay(260);
    return readJSON<WarrantyClaim[]>(CLAIMS_KEY, []);
  },
};

export const warrantyIssueOptions = Object.entries(ISSUE_LABELS).map(([id, label]) => ({ id, label }));

/* ------------------------------------------------------------------ */
/* Returns                                                             */
/* ------------------------------------------------------------------ */
const RETURN_REASON_LABELS: Record<ReturnRequestInput["reason"], string> = {
  changed_mind: "غيّرت رأيي / لا أحتاجه",
  wrong_item: "استلمت منتجًا مختلفًا",
  damaged: "وصل المنتج متضررًا",
  not_as_described: "المنتج لا يطابق الوصف",
  defective: "عيب مصنعي",
  other: "سبب آخر",
};

const REFUND_LABELS: Record<ReturnRequestInput["refundMethod"], string> = {
  original: "إعادة إلى وسيلة الدفع الأصلية",
  wallet: "رصيد في محفظة رواء",
  bank: "تحويل بنكي",
};

export const returnsApi = {
  /** GET /v1/orders/:number (used by the returns wizard to preview items) */
  async findOrder(orderNumber: string): Promise<Order> {
    await delay(520);
    const clean = orderNumber.trim().toUpperCase();
    const stored = readJSON<Order[]>("rewaa_orders_db", []);
    const match = stored.find((order) => order.number.toUpperCase() === clean);
    if (!match) {
      throw new ApiError("لم نعثر على طلب بهذا الرقم", "NOT_FOUND", 404);
    }
    return match;
  },

  /** POST /v1/returns */
  async create(input: ReturnRequestInput): Promise<ReturnRequest> {
    await delay(880);
    if (!input.orderNumber.trim()) throw new ApiError("رقم الطلب مطلوب", "VALIDATION", 422);
    if (input.items.length === 0) throw new ApiError("اختر منتجًا واحدًا على الأقل", "VALIDATION", 422);

    const existing = readJSON<ReturnRequest[]>(RETURNS_KEY, []);
    const request: ReturnRequest = {
      id: `ret_${Date.now()}`,
      reference: `RWA-RET-${new Date().getFullYear()}-${sequence(existing.length)}`,
      orderNumber: input.orderNumber.trim(),
      reason: input.reason,
      reasonLabel: RETURN_REASON_LABELS[input.reason],
      items: input.items,
      description: input.description.trim(),
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      refundMethod: input.refundMethod,
      refundLabel: REFUND_LABELS[input.refundMethod],
      status: "requested",
      createdAt: new Date().toISOString(),
      estimatedRefundDays: 5,
    };
    writeJSON(RETURNS_KEY, [request, ...existing].slice(0, 60));
    return request;
  },

  /** GET /v1/returns */
  async list(): Promise<ReturnRequest[]> {
    await delay(260);
    return readJSON<ReturnRequest[]>(RETURNS_KEY, []);
  },
};

export const returnReasonOptions = Object.entries(RETURN_REASON_LABELS).map(([id, label]) => ({ id, label }));
export const refundMethodOptions = Object.entries(REFUND_LABELS).map(([id, label]) => ({ id, label }));

/* ------------------------------------------------------------------ */
/* Contact & newsletter                                                */
/* ------------------------------------------------------------------ */
export const supportApi = {
  /** POST /v1/support/messages */
  async sendMessage(input: ContactMessageInput): Promise<ContactMessage> {
    await delay(860);
    if (!input.name.trim() || !input.phone.trim()) throw new ApiError("الاسم ورقم الجوال مطلوبان", "VALIDATION", 422);
    if (input.message.trim().length < 10) throw new ApiError("اكتب وصفًا أوضح للطلب (10 أحرف على الأقل)", "VALIDATION", 422);

    const existing = readJSON<ContactMessage[]>(MESSAGES_KEY, []);
    const message: ContactMessage = {
      id: `msg_${Date.now()}`,
      reference: `RWA-MSG-${new Date().getFullYear()}-${sequence(existing.length)}`,
      createdAt: new Date().toISOString(),
      expectedResponseHours: input.category === "complaint" ? 12 : 24,
      category: input.category,
    };
    writeJSON(MESSAGES_KEY, [message, ...existing].slice(0, 100));
    return message;
  },

  /** GET /v1/support/messages */
  async listMessages(): Promise<ContactMessage[]> {
    await delay(220);
    return readJSON<ContactMessage[]>(MESSAGES_KEY, []);
  },

  /** POST /v1/newsletter */
  async subscribe(email: string): Promise<{ email: string; duplicate: boolean }> {
    await delay(720);
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      throw new ApiError("صيغة البريد الإلكتروني غير صحيحة", "VALIDATION", 422);
    }
    const subscribers = readJSON<string[]>(NEWSLETTER_KEY, []);
    if (subscribers.includes(normalized)) {
      return { email: normalized, duplicate: true };
    }
    writeJSON(NEWSLETTER_KEY, [...subscribers, normalized].slice(0, 500));
    return { email: normalized, duplicate: false };
  },
};

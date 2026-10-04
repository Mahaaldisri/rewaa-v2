/**
 * مواصفات أدوات المساعد (Tool specifications).
 *
 * هذا الملف هو المصدر الوحيد لقائمة الأدوات المسموح بها، ووسائطها، وتصنيف
 * صلاحياتها. يقرأه:
 *   - الخادم (`server/ai/tools/registry.mjs` عبر جسر esbuild) لبناء Tool Calling
 *     ورفض أي استدعاء غير موجود في القائمة.
 *   - الواجهة للتحقق من الوسائط قبل التنفيذ المحلي في وضع التطوير.
 *
 * ⚠️ لا يُنفَّذ أي استدعاء لمسار (endpoint) من إنتاج النموذج: النموذج يختار من
 * هذه القائمة فقط، والخادم هو من ينفّذ.
 */
import type { AiToolName, AiToolPermission } from "@/types/ai";
import { AI_TOOL_PERMISSIONS } from "@/types/ai";

export interface ToolParameterSpec {
  type: "string" | "number" | "boolean" | "string[]";
  description: string;
  required?: boolean;
  enum?: string[];
  /** الحدود المضبوطة على الخادم — لا يُقبل خارجها. */
  min?: number;
  max?: number;
  maxItems?: number;
  maxLength?: number;
}

export interface ToolSpec {
  name: AiToolName;
  /** وصف موجَّه للنموذج: متى تُستدعى الأداة وماذا تُرجع. */
  description: string;
  parameters: Record<string, ToolParameterSpec>;
  permission: AiToolPermission;
  /** تتطلب جلسة مستخدم مسجّل. */
  requiresAuth?: boolean;
  /** زمن التنفيذ الأقصى بالمللي ثانية (يُطبَّق على الخادم). */
  timeoutMs?: number;
  /** تحتاج تأكيدًا صريحًا من المستخدم قبل التنفيذ. */
  requiresConfirmation?: boolean;
}

const productIdParam: ToolParameterSpec = {
  type: "string",
  description: "معرّف المنتج من الكتالوج (id أو slug).",
  required: true,
  maxLength: 120,
};

export const TOOL_SPECS: ToolSpec[] = [
  /* --------------------------- كتالوج ومنتجات --------------------------- */
  {
    name: "search_products",
    description:
      "البحث في كتالوج رواء بالكلمات أو الفلاتر المنظمة (القسم، الاستخدام، عدد الأفراد، السعر، التوفر). استخدمها لأي سؤال عن منتج أو ترشيح.",
    permission: "read",
    parameters: {
      query: { type: "string", description: "نص البحث كما كتبه العميل (عربي أو إنجليزي).", maxLength: 120 },
      category: { type: "string", description: "slug القسم مثل water-filters أو cartridges.", maxLength: 60 },
      useCase: {
        type: "string",
        description: "حسب الاستخدام.",
        enum: ["home", "apartment", "villa", "office", "restaurant", "cafe", "commercial"],
      },
      users: { type: "string", description: "عدد الأفراد.", enum: ["1", "2-3", "4-6", "7-plus"] },
      installationType: {
        type: "string",
        description: "موقع التركيب.",
        enum: ["under-sink", "countertop", "central", "standalone"],
      },
      maxPrice: { type: "number", description: "أعلى سعر بالريال.", min: 1, max: 100000 },
      minPrice: { type: "number", description: "أدنى سعر بالريال.", min: 0, max: 100000 },
      inStockOnly: { type: "boolean", description: "المنتجات المتوفرة فقط." },
      discountedOnly: { type: "boolean", description: "المنتجات التي عليها خصم فقط." },
      systemType: {
        type: "string[]",
        description: "نوع النظام كما هو معلن في بيانات المنتج.",
        maxItems: 3,
      },
      sort: {
        type: "string",
        description: "ترتيب النتائج بنفس مفاتيح ترتيب صفحة الفئة.",
        enum: ["featured", "newest", "price_asc", "price_desc", "rating", "best_selling", "savings_desc"],
      },
      limit: { type: "number", description: "عدد النتائج (1–8).", min: 1, max: 8 },
    },
    timeoutMs: 4000,
  },
  {
    name: "get_product",
    description: "بيانات منتج واحد: السعر، الخصم، المخزون، الضمان، المواصفات، الصور المتوفرة، والرابط.",
    permission: "read",
    parameters: { id: productIdParam },
    timeoutMs: 3000,
  },
  {
    name: "list_products_by_category",
    description: "عرض منتجات قسم أو قسم فرعي مع إمكانية الترتيب والتصفية.",
    permission: "read",
    parameters: {
      category: { type: "string", description: "slug القسم.", required: true, maxLength: 60 },
      subcategory: { type: "string", description: "slug القسم الفرعي.", maxLength: 60 },
      sort: { type: "string", description: "الترتيب.", enum: ["featured", "price_asc", "price_desc", "rating_desc", "savings_desc"] },
      limit: { type: "number", description: "عدد النتائج (1–8).", min: 1, max: 8 },
    },
    timeoutMs: 4000,
  },
  {
    name: "check_availability",
    description: "حالة التوفر الحالية لمنتج (متوفر/نفد/قريبًا) مع نص الحالة المعروض في المتجر.",
    permission: "read",
    parameters: { id: productIdParam },
    timeoutMs: 2500,
  },
  {
    name: "get_price_quote",
    description: "السعر الحالي والخصم الضريبي وطرق التقسيط المتاحة لمنتج وكمية محددة. لا تُخمّن السعر أبدًا بنفسك.",
    permission: "read",
    parameters: {
      id: productIdParam,
      quantity: { type: "number", description: "الكمية.", min: 1, max: 20 },
    },
    timeoutMs: 3000,
  },
  {
    name: "compare_products",
    description: "مقارنة منتَجين أو أكثر في الصفوف المفيدة فقط (السعر، المراحل، السعة، التدفق، الأبعاد، الضمان، الصيانة، الاستخدام).",
    permission: "read",
    parameters: {
      ids: { type: "string[]", description: "معرّفات المنتجات (2–4).", required: true, maxItems: 4 },
    },
    timeoutMs: 4000,
  },
  {
    name: "get_product_media",
    description: "صور المنتج الحقيقية من الكتالوج. استخدمها عندما يطلب العميل رؤية الجهاز أو الشمعات.",
    permission: "read",
    parameters: {
      id: productIdParam,
      role: { type: "string", description: "نوع الصورة المطلوبة.", enum: ["product", "parts", "installation"] },
    },
    timeoutMs: 3000,
  },

  /* ---------------------------- توافق وصيانة ---------------------------- */
  {
    name: "find_compatible_parts",
    description:
      "البحث عن القطع/الشمعات المتوافقة مع جهاز أو رقم موديل أو SKU من بيانات الكتالوج. لا تؤكد أي توافق غير موجود في النتيجة.",
    permission: "read",
    parameters: {
      query: { type: "string", description: "اسم الجهاز أو رقم الموديل أو SKU.", required: true, maxLength: 120 },
    },
    timeoutMs: 4000,
  },
  {
    name: "get_device_cartridge_set",
    description: "طقم الشمعات الموصى به لجهاز معيّن مع بدائله، من بيانات الكتالوج.",
    permission: "read",
    parameters: { id: productIdParam },
    timeoutMs: 3000,
  },
  {
    name: "get_maintenance_schedule",
    description:
      "جدول استبدال الشمعات لجهاز: الدورة المعلنة في بيانات المنتج، وتاريخ آخر تغيير وأجهزة العميل المسجّلة عند وجود جلسة.",
    permission: "read",
    parameters: {
      id: { type: "string", description: "معرّف المنتج أو slug الجهاز.", maxLength: 120 },
      city: { type: "string", description: "مدينة العميل إن ذُكرت.", maxLength: 60 },
    },
    timeoutMs: 3000,
  },

  /* ---------------------------- معرفة وخدمات ---------------------------- */
  {
    name: "get_knowledge",
    description:
      "البحث في الأسئلة الشائعة والمقالات والأدلة والسياسات (الضمان، الإرجاع، الشحن، التركيب، الاستخدام). استخدمها للأسئلة غير المنتجية.",
    permission: "read",
    parameters: {
      query: { type: "string", description: "سؤال العميل أو موضوعه.", required: true, maxLength: 200 },
      kind: { type: "string", description: "نوع المصدر.", enum: ["faq", "guide", "policy", "service"] },
    },
    timeoutMs: 2500,
  },
  {
    name: "get_service_availability",
    description: "تغطية الخدمة (تركيب/صيانة/فحص) لمدينة أو حي، مع الرسوم التقديرية إن كانت متاحة. لا تخترع تغطية.",
    permission: "read",
    parameters: {
      city: { type: "string", description: "اسم المدينة أو معرّفها.", required: true, maxLength: 60 },
      district: { type: "string", description: "الحي.", maxLength: 60 },
    },
    timeoutMs: 3000,
  },
  {
    name: "get_available_slots",
    description: "أقرب المواعيد المتاحة لزيارة فني. لا تُنشئ حجزًا بهذه الأداة.",
    permission: "read",
    parameters: {
      city: { type: "string", description: "المدينة.", required: true, maxLength: 60 },
      serviceType: { type: "string", description: "نوع الخدمة.", maxLength: 60 },
    },
    timeoutMs: 3000,
  },
  {
    name: "get_payment_methods",
    description: "طرق الدفع المتاحة فعليًا في هذا البناء، مع بيان ما إذا كانت البوابة حقيقية أم تجريبية.",
    permission: "read",
    parameters: {},
    timeoutMs: 2000,
  },

  /* ------------------------- حساب العميل (يحتاج جلسة) ------------------------- */
  {
    name: "track_order",
    description:
      "تتبع طلب برقم الطلب. في وضع الزائر يلزم تأكيد آخر 4 أرقام من الجوال أو البريد؛ لا تُطلب بيانات حساسة في المحادثة.",
    permission: "read",
    parameters: {
      orderNumber: { type: "string", description: "رقم الطلب بصيغة RWA-…", required: true, maxLength: 40 },
      contact: { type: "string", description: "آخر 4 أرقام من الجوال أو البريد للتأكيد.", maxLength: 80 },
    },
    timeoutMs: 4000,
  },
  {
    name: "list_my_orders",
    description: "طلبات العميل المسجّل. تتطلب جلسة مستخدم.",
    permission: "read",
    requiresAuth: true,
    parameters: { limit: { type: "number", description: "عدد الطلبات (1–5).", min: 1, max: 5 } },
    timeoutMs: 4000,
  },
  {
    name: "get_my_devices",
    description: "أجهزة العميل المسجّل في مركز الصيانة مع موعد التغيير القادم والنسبة المتبقية.",
    permission: "read",
    requiresAuth: true,
    parameters: {},
    timeoutMs: 3500,
  },
  {
    name: "get_warranty_status",
    description: "حالة الضمان للعميل المسجّل حسب بيانات منتج أو جهاز مسجّل. لا تؤكد تغطية غير موجودة.",
    permission: "read",
    requiresAuth: true,
    parameters: { id: { type: "string", description: "معرّف المنتج أو الجهاز.", maxLength: 120 } },
    timeoutMs: 3500,
  },
  {
    name: "check_return_eligibility",
    description: "أهلية الإرجاع لطلب معيّن حسب سياسة الإرجاع وعدد الأيام. لا تضمن الموافقة النهائية.",
    permission: "read",
    parameters: {
      orderNumber: { type: "string", description: "رقم الطلب.", required: true, maxLength: 40 },
      productId: { type: "string", description: "معرّف المنتج داخل الطلب.", maxLength: 120 },
    },
    timeoutMs: 3500,
  },

  /* ------------------------------- حساب ------------------------------- */
  {
    name: "recommend_systems",
    description:
      "ترشيح أنظمة التنقية بمحرك مستشار المياه نفسه (يرشّح حسب الاستخدام، عدد الأفراد، المساحة، مصدر المياه، TDS، والمشكلة). لا تنشئ منطق ترشيح موازيًا.",
    permission: "read",
    parameters: {
      usage: { type: "string", description: "الغرض.", enum: ["drinking", "whole-home", "kitchen", "cartridge"] },
      housing: { type: "string", description: "نوع السكن.", enum: ["apartment", "villa", "office", "commercial"] },
      users: { type: "string", description: "عدد الأفراد.", enum: ["1-2", "3-5", "6-plus", "business"] },
      consumption: { type: "string", description: "معدل الاستهلاك.", enum: ["low", "medium", "high", "unknown"] },
      source: { type: "string", description: "مصدر المياه.", enum: ["network", "tank", "well", "unknown"] },
      tds: { type: "string", description: "نطاق الأملاح.", enum: ["unknown", "under-300", "300-600", "above-600"] },
      problem: { type: "string", description: "المشكلة الأساسية.", enum: ["salty", "taste", "sediment", "scale", "none"] },
      city: { type: "string", description: "المدينة.", maxLength: 60 },
      budget: { type: "number", description: "الميزانية بالريال.", min: 0, max: 100000 },
    },
    timeoutMs: 5000,
  },
  {
    name: "calculate_savings",
    description:
      "حساب التوفير بمحرك الحاسبة الموجود: التكلفة الحالية، تكلفة النظام، نقطة التعادل، التوفير المتوقع. لا تحسب أي رقم مالي من ذاكرتك.",
    permission: "read",
    parameters: {
      mode: { type: "string", description: "طريقة الإدخال.", enum: ["estimate", "purchases"] },
      people: { type: "number", description: "عدد الأفراد.", min: 1, max: 20 },
      litersPerPersonPerDay: { type: "number", description: "استهلاك الفرد اليومي باللتر.", min: 0.5, max: 15 },
      unitLiters: { type: "number", description: "حجم الوحدة المشتراة باللتر.", min: 0.1, max: 100 },
      unitPrice: { type: "number", description: "سعر الوحدة بالريال.", min: 0, max: 1000 },
      unitsPerPeriod: { type: "number", description: "عدد الوحدات لكل فترة.", min: 0, max: 500 },
      frequency: { type: "string", description: "معدل الشراء.", enum: ["weekly", "monthly"] },
      months: { type: "number", description: "مدة المقارنة بالأشهر.", min: 6, max: 240 },
      productId: { type: "string", description: "الجهاز المراد المقارنة به.", maxLength: 120 },
      maintenancePrice: { type: "number", description: "تكلفة زيارة الصيانة بالريال.", min: 0, max: 2000 },
    },
    timeoutMs: 5000,
  },

  /* --------------------------- إجراءات المستخدم --------------------------- */
  {
    name: "save_to_wishlist",
    description: "إضافة منتج إلى قائمة الرغبات. تُنفَّذ في المتصفح بعد موافقة العميل.",
    permission: "user_action",
    parameters: { id: productIdParam },
    timeoutMs: 2000,
  },

  /* ---------------------------- إجراءات حساسة ---------------------------- */
  {
    name: "create_service_booking",
    description:
      "إنشاء طلب خدمة (تركيب/صيانة/فحص) بعد تأكيد العميل الصريح على نوع الخدمة والمدينة والموعد. لا تُنشئ حجزًا بدون تأكيد.",
    permission: "sensitive",
    requiresConfirmation: true,
    parameters: {
      serviceType: { type: "string", description: "نوع الخدمة.", required: true, enum: ["install", "maintenance", "water-test", "inspection"] },
      city: { type: "string", description: "المدينة.", required: true, maxLength: 60 },
      district: { type: "string", description: "الحي.", maxLength: 60 },
      productId: { type: "string", description: "الجهاز المرتبط بالخدمة.", maxLength: 120 },
      customerName: { type: "string", description: "اسم العميل.", required: true, maxLength: 80 },
      phone: { type: "string", description: "جوال العميل بصيغة 05XXXXXXXX.", required: true, maxLength: 20 },
      preferredDate: { type: "string", description: "التاريخ المفضل بصيغة yyyy-mm-dd.", required: true, maxLength: 20 },
      preferredSlot: { type: "string", description: "الفترة المفضلة.", maxLength: 60 },
      description: { type: "string", description: "وصف مختصر للمشكلة.", maxLength: 400 },
    },
    timeoutMs: 8000,
  },
  {
    name: "submit_return_request",
    description: "تقديم طلب إرجاع بعد تأكيد العميل. لا تَعِد بالموافقة قبل رد النظام.",
    permission: "sensitive",
    requiresConfirmation: true,
    parameters: {
      orderNumber: { type: "string", description: "رقم الطلب.", required: true, maxLength: 40 },
      productId: { type: "string", description: "معرّف المنتج.", required: true, maxLength: 120 },
      reason: { type: "string", description: "سبب الإرجاع من قائمة السياسة.", required: true, maxLength: 60 },
      details: { type: "string", description: "تفاصيل إضافية.", maxLength: 400 },
      refundMethod: { type: "string", description: "طريقة الاسترداد المفضلة.", maxLength: 40 },
    },
    timeoutMs: 8000,
  },
  {
    name: "submit_warranty_claim",
    description: "تقديم طلب ضمان بعد تأكيد العميل. لا تؤكد القبول قبل رد النظام.",
    permission: "sensitive",
    requiresConfirmation: true,
    parameters: {
      productId: { type: "string", description: "معرّف المنتج أو الجهاز.", required: true, maxLength: 120 },
      issueType: {
        type: "string",
        description: "نوع المشكلة.",
        required: true,
        enum: ["not_powering", "low_flow", "leak", "noise", "taste_odor", "high_tds", "damaged_on_arrival", "other"],
      },
      description: { type: "string", description: "وصف المشكلة.", required: true, maxLength: 500 },
      orderNumber: { type: "string", description: "رقم الطلب إن وُجد.", maxLength: 40 },
    },
    timeoutMs: 8000,
  },
  {
    name: "request_human_handoff",
    description:
      "تحويل العميل إلى موظف مع ملخص للمشكلة. استخدمها عند طلب العميل، أو الشكوى، أو مشكلة دفع، أو فشل متكرر في الأدوات، أو عدم تأكد التوافق.",
    permission: "sensitive",
    parameters: {
      topic: { type: "string", description: "موضوع التحويل.", required: true, maxLength: 120 },
      summary: { type: "string", description: "ملخص موجز لما حدث.", required: true, maxLength: 600 },
      orderNumber: { type: "string", description: "رقم الطلب إن وُجد.", maxLength: 40 },
      includeContact: { type: "boolean", description: "هل وافق العميل على إرسال بيانات التواصل." },
    },
    timeoutMs: 2000,
  },
];

export const TOOL_SPECS_BY_NAME: Record<string, ToolSpec> = Object.fromEntries(TOOL_SPECS.map((spec) => [spec.name, spec]));

export function toolSpec(name: string): ToolSpec | undefined {
  return TOOL_SPECS_BY_NAME[name];
}

/** التحقق من الوسائط محليًا (نفس القيود المطبَّقة على الخادم). */
export function validateToolArgs(name: string, args: Record<string, unknown>): { ok: boolean; errors: string[] } {
  const spec = toolSpec(name);
  if (!spec) return { ok: false, errors: [`unknown_tool:${name}`] };
  const errors: string[] = [];

  Object.entries(spec.parameters).forEach(([key, param]) => {
    const value = args[key];
    if (value === undefined || value === null || value === "") {
      if (param.required) errors.push(`missing:${key}`);
      return;
    }
    switch (param.type) {
      case "string":
        if (typeof value !== "string") errors.push(`type:${key}`);
        else {
          if (param.maxLength && value.length > param.maxLength) errors.push(`too_long:${key}`);
          if (param.enum && !param.enum.includes(value)) errors.push(`enum:${key}`);
        }
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`type:${key}`);
        else {
          if (param.min !== undefined && value < param.min) errors.push(`min:${key}`);
          if (param.max !== undefined && value > param.max) errors.push(`max:${key}`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") errors.push(`type:${key}`);
        break;
      case "string[]":
        if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) errors.push(`type:${key}`);
        else if (param.maxItems && value.length > param.maxItems) errors.push(`too_many:${key}`);
        break;
    }
  });

  // رفض أي وسيطة غير معلَنة — لا نمرّر للنموذج مساحة حرة.
  Object.keys(args).forEach((key) => {
    if (!(key in spec.parameters)) errors.push(`unknown_arg:${key}`);
  });

  return { ok: errors.length === 0, errors };
}

export const AI_TOOL_PERMISSION_MAP = AI_TOOL_PERMISSIONS;

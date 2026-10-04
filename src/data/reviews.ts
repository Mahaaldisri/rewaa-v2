import type { ProductQuestion, Review } from "@/types/product";
import { photo } from "./images";

/**
 * Reviews & Q&A data source.
 *
 * The flagship RO-7 keeps its hand-written reviews (they are the ones the
 * storefront shipped with). Every other catalog product gets a deterministic
 * generated set so lists, filters and pagination all behave exactly as they
 * would with a real API — without shipping thousands of hand-written rows.
 */

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/* ------------------------------------------------------------------ */
/* Deterministic generator                                             */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const AUTHORS = [
  "عبدالله الحربي", "نورة العتيبي", "محمد الشهري", "سارة القحطاني", "فهد الدوسري",
  "ريم الزهراني", "خالد المطيري", "هند العنزي", "ماجد الغامدي", "أسماء البلوي",
  "تركي السبيعي", "لطيفة القرني", "بندر الشمري", "دانة الصالح", "مشعل العجمي",
  "جواهر الرشيد", "عمر باوزير", "غادة الحمود",
] as const;

const CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر", "أبها", "بريدة", "تبوك", "الطائف"] as const;

interface Template {
  title: string;
  body: string;
  rating: 5 | 4 | 3;
  images?: number[];
}

/** Tone-neutral templates: they praise measurable behaviour, never health claims. */
const TEMPLATES: Template[] = [
  {
    title: "التركيب سريع والنتيجة واضحة",
    body:
      "وصل الفني في الموعد المتفق عليه وأنهى التركيب دون أي فوضى، ثم قاس TDS قبل وبعد وأعطاني القراءتين مكتوبتين. الفرق واضح في الطعم وفي تقليل الرواسب على الأكواب.",
    rating: 5,
    images: [6419128],
  },
  {
    title: "جودة تستحق السعر",
    body:
      "قارنت أكثر من خيار قبل الشراء، وهذا كان الأفضل من ناحية المواد وسهولة تغيير الشمعات. الشمعات قياسية ومتوفرة، وهذا أهم شيء على المدى الطويل.",
    rating: 5,
  },
  {
    title: "خدمة ما بعد البيع هي الفرق",
    body:
      "احتجت زيارة صيانة بعد عدة أشهر، وحجزت الموعد من الموقع. جاء الفني في نفس الأسبوع وشرح لي ما تم عمله بالتفصيل. التعامل مرتب من البداية للنهاية.",
    rating: 5,
    images: [16509869],
  },
  {
    title: "جيد لكن يحتاج ضغطًا مناسبًا",
    body:
      "المنتج جيد والأداء مطابق للوصف، لكن في منطقتنا ضغط المياه منخفض فاحتجت إضافة مضخة تعزيز. لو كان ذلك موضحًا بشكل أبرز قبل الشراء لكان أفضل.",
    rating: 4,
  },
  {
    title: "قيمة مقابل السعر ممتازة",
    body:
      "استخدمته أكثر من ستة أشهر بدون أي مشكلة، وقراءة الجودة مستقرة. أعتبره خيارًا عمليًا لمن يريد نتيجة مضمونة بسعر معقول.",
    rating: 5,
  },
  {
    title: "التغليف والقطع كاملة",
    body:
      "وصل الطلب مغلفًا بشكل جيد وكل القطع موجودة كما في الوصف، مع دليل عربي واضح. التركيب استغرق وقتًا أقل مما توقعت.",
    rating: 4,
  },
  {
    title: "مناسب لكن يحتاج متابعة دورية",
    body:
      "الأداء جيد مع الاستخدام اليومي، لكن يجب الالتزام بمواعيد تغيير الشمعات. عندما تأخرت في التبديل لاحظت فرقًا في الطعم مباشرة.",
    rating: 4,
  },
  {
    title: "خدمة العملاء متعاونة",
    body:
      "تواصلت عبر واتساب لسؤال عن القطعة المناسبة وأرسلوا لي المقاس الصحيح برقم الموديل. الطلب وصل في يومين.",
    rating: 5,
  },
  {
    title: "أداء ثابت لكن السعر مرتفع قليلًا",
    body:
      "المنتج يؤدي ما وعد به، ولا توجد ملاحظات على الجودة. أتمنى أن تكون أسعار القطع البديلة أقل قليلًا لتقليل تكلفة الاستخدام السنوية.",
    rating: 4,
  },
  {
    title: "تجربة شراء مرتبة",
    body:
      "الطلب والدفع سهلان، ووصلت رسالة بتأكيد الطلب وموعد التسليم. لم أواجه أي مشكلة في الاستبدال أو الاستفسار.",
    rating: 5,
  },
  {
    title: "يناسب احتياج المنزل",
    body:
      "اخترته بعد قياس جودة المياه في المنزل، والقرار كان صحيحًا. الاستهلاك اليومي مغطى ولا نحتاج الانتظار طويلًا.",
    rating: 5,
  },
  {
    title: "مقبول لكن التدفق متوسط",
    body:
      "الأداء مقبول للاستخدام العادي، لكن عند استخدام أكثر من نقطة في الوقت نفسه يقل التدفق قليلًا. أنصح بمراجعة المقاس قبل الشراء للمنازل الكبيرة.",
    rating: 3,
  },
];

function pick<T>(rnd: () => number, list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length)];
}

export function generateReviews(productId: string, rating: number, reviewCount: number): Review[] {
  const rnd = mulberry32(seedFromString(productId));
  const target = Math.min(14, Math.max(4, Math.round(reviewCount / 22)));
  const reviews: Review[] = [];

  for (let i = 0; i < target; i += 1) {
    const template = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)];
    // Keep the generated distribution roughly aligned with the product rating.
    const adjustedRating: Review["rating"] =
      rating >= 4.7 && template.rating === 3 ? 4 : rating <= 4.3 && template.rating === 5 && rnd() > 0.6 ? 4 : template.rating;
    const days = 3 + Math.floor(rnd() * 240);
    const hasReply = rnd() > 0.62;

    reviews.push({
      id: `${productId}-rev-${i + 1}`,
      productId,
      author: pick(rnd, AUTHORS),
      avatarHue: Math.floor(rnd() * 360),
      city: pick(rnd, CITIES),
      rating: adjustedRating,
      title: template.title,
      body: template.body,
      createdAt: daysAgo(days),
      verifiedPurchase: rnd() > 0.12,
      images: template.images?.map((id) => photo(id, 480, 480)),
      helpfulCount: Math.floor(rnd() * 60),
      sellerReply: hasReply
        ? {
            body: "شكرًا لك على التقييم 💧 فريقنا في خدمتك دائمًا، ولأي استفسار عن الصيانة أو قطع الغيار تواصل معنا على واتساب الدعم الفني.",
            createdAt: daysAgo(Math.max(1, days - 2)),
          }
        : undefined,
    });
  }

  return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/* ------------------------------------------------------------------ */
/* Flagship RO-7 — hand-written reviews (unchanged content)            */
/* ------------------------------------------------------------------ */
export const flagshipReviews: Review[] = [
  {
    id: "rev-1",
    productId: "prd_ro7_84c21",
    author: "عبدالله الحربي",
    avatarHue: 212,
    city: "الرياض",
    rating: 5,
    title: "قراءة TDS نزلت من 620 إلى 21",
    body: "مياه البيت عندنا كانت عسرة ومالحة. الفني جاء في اليوم التالي للطلب وركّب الجهاز خلال ساعتين وترك كل شيء نظيفًا. قاس الـ TDS قبل التركيب 620 وبعده 21 وأعطاني ورقة موثّقة بالقراءتين. طعم الماء صار ممتازًا وزوجتي لاحظت الفرق في طعم الشاي والقهوة.",
    createdAt: daysAgo(4),
    verifiedPurchase: true,
    variantLabel: "أبيض لؤلؤي • 7 مراحل",
    images: [photo(36847822, 480, 480), photo(6419128, 480, 480)],
    helpfulCount: 73,
    sellerReply: {
      body: "شكرًا لك أ. عبدالله 💧 سعداء بالنتيجة، وسنراسلك بتذكير تغيير الشمعات بعد 6 أشهر ضمن باقة العناية.",
      createdAt: daysAgo(3),
    },
  },
  {
    id: "rev-2",
    productId: "prd_ro7_84c21",
    author: "نورة العتيبي",
    avatarHue: 190,
    city: "جدة",
    rating: 5,
    title: "وفّرنا شراء قوارير المياه نهائيًا",
    body: "كنا نشتري كراتين مياه أسبوعيًا. بعد تركيب الفلتر توقفنا تمامًا، والتكلفة استرجعناها خلال أقل من سنة. الحنفية شكلها أنيق وما خربت منظر المطبخ، والصوت أثناء التعبئة خفيف جدًا.",
    createdAt: daysAgo(10),
    verifiedPurchase: true,
    variantLabel: "أزرق محيطي • 9 مراحل + UV",
    helpfulCount: 44,
  },
  {
    id: "rev-3",
    productId: "prd_ro7_84c21",
    author: "محمد الشهري",
    avatarHue: 150,
    city: "أبها",
    rating: 4,
    title: "ممتاز لكن الصرف أعلى مما توقعت",
    body: "الجهاز شغّال بكفاءة والمياه نظيفة. الملاحظة الوحيدة أن نسبة مياه الصرف ملحوظة، والفني شرح لي أنها طبيعية في أنظمة RO ووجّهني لاستخدام خط الصرف لري الحديقة. أربع نجوم فقط بسبب هذه النقطة وليست عيبًا في المنتج.",
    createdAt: daysAgo(18),
    verifiedPurchase: true,
    variantLabel: "أبيض لؤلؤي • 7 مراحل",
    helpfulCount: 29,
  },
  {
    id: "rev-4",
    productId: "prd_ro7_84c21",
    author: "سارة القحطاني",
    avatarHue: 265,
    city: "الدمام",
    rating: 5,
    title: "خدمة الصيانة هي الفرق الحقيقي",
    body: "اشتريت باقة العناية السنوية ولا أندم. اتصلت لما لاحظت ضعف في التدفق، وجاء الفني في نفس اليوم واكتشف أن الفلتر الأول متسخ بسبب أعمال الشبكة في الحي، غيّره بدون أي رسوم. التعامل محترف جدًا.",
    createdAt: daysAgo(26),
    verifiedPurchase: true,
    variantLabel: "ستانلس ستيل • 7 مراحل",
    images: [photo(16509869, 480, 480)],
    helpfulCount: 51,
  },
  {
    id: "rev-5",
    productId: "prd_ro7_84c21",
    author: "فهد الدوسري",
    avatarHue: 30,
    city: "الرياض",
    rating: 5,
    title: "أخذت الطراز المباشر وشغّال ممتاز",
    body: "احترت بين الطراز بسبع مراحل والطراز المباشر، وشرح لي الفريق الفرق بأن المباشر أفضل إذا كانت المساحة ضيقة والاستهلاك مستمر. اخترته فعليًا ولا انتظر تعبئة الخزان، والتدفق جيد جدًا للشرب والطبخ.",
    createdAt: daysAgo(38),
    verifiedPurchase: true,
    variantLabel: "أبيض لؤلؤي • فلتر مباشر 600G",
    helpfulCount: 22,
  },
  {
    id: "rev-6",
    productId: "prd_ro7_84c21",
    author: "ريم الزهراني",
    avatarHue: 320,
    city: "المدينة المنورة",
    rating: 4,
    title: "جيد جدًا مع ملاحظة على الصوت",
    body: "الأداء ممتاز والطعم تغيّر للأفضل من أول يوم. الصوت عند إعادة تعبئة الخزان مسموع في المطبخ، وشرح لي الفني أنه من المضخة وأنه طبيعي، لكني أفضّل أن يكون أهدأ قليلًا.",
    createdAt: daysAgo(52),
    verifiedPurchase: true,
    variantLabel: "أسود جرافيت • 7 مراحل",
    helpfulCount: 18,
  },
];

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */
interface QuestionTemplate {
  question: string;
  answer: string;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    question: "هل أحتاج كهرباء لتشغيله؟ وكم يستهلك؟",
    answer:
      "الأنظمة المزوّدة بمضخة تعزيز تعمل على 24 فولت باستهلاك منخفض جدًا (غالبًا أقل من 25 واط). الأجهزة الميكانيكية مثل الفلاتر تحت المغسلة وأجهزة القياس لا تحتاج كهرباء إطلاقًا.",
  },
  {
    question: "ما موعد تغيير الشمعات ومَن يقوم بالاستبدال؟",
    answer:
      "المراحل الميكانيكية والكربونية عادة كل 6 أشهر، والممبرين كل 24–36 شهرًا. يمكنك الاستبدال بنفسك بالدليل المرفق أو حجز زيارة فني من رواء، والزيارة مشمولة في باقة العناية السنوية.",
  },
  {
    question: "هل يناسب مياه الآبار أو الخزانات الأرضية؟",
    answer:
      "يحتاج الأمر معرفة قراءة TDS ودرجة العسر أولًا. إذا كانت الأملاح مرتفعة جدًا فقد ننصح بوحدة تحلية بدل النظام المنزلي العادي — أرسل لنا نتيجة تحليل المياه أو احجز زيارة لقياسها.",
  },
  {
    question: "هل يشمل التركيب؟ وما مدة انتظار الفني؟",
    answer:
      "نعم، التركيب متوفر عبر فنيين معتمدين، ويتم جدولة الموعد عادة خلال 24–48 ساعة في المدن المخدومة، مع تحديد موعد مبدئي بعد تأكيد الطلب.",
  },
  {
    question: "ما الضمان وماذا يغطي بالضبط؟",
    answer:
      "مدة الضمان مذكورة في صفحة كل منتج، وتغطي عيوب التصنيع على الوحدة الرئيسية. القطع الاستهلاكية مثل الشمعات والممبرينات بعد التشغيل، وأعمال التركيب من غير فني معتمد، خارج نطاق الضمان.",
  },
  {
    question: "هل يمكن إرجاع المنتج إذا لم يناسبني؟",
    answer:
      "يمكن إرجاع الوحدات غير المركّبة وبكامل ملحقاتها خلال 14 يومًا. الوحدات المركّبة تخضع للاستبدال أو الإصلاح بدلًا من الإرجاع النقدي، ويمكنك بدء الطلب من صفحة الإرجاع والاستبدال.",
  },
  {
    question: "هل تتوفر قطع الغيار مستقبلًا؟",
    answer:
      "نعم، القطع المذكورة في صفحة المنتج متوفرة في قسم قطع الغيار، وجميع الشمعات بمقاسات قياسية شائعة يمكن العثور عليها بسهولة عند الحاجة.",
  },
  {
    question: "ما الفرق بين هذا الطراز والطراز الأغلى؟",
    answer:
      "الفرق غالبًا في عدد المراحل، ومعدل الإنتاج، وسعة الخزان، وهل يوجد تعقيم UV. إذا كانت قراءة الأملاح في مياهك مرتفعة أو الاستهلاك اليومي كبير، فالطراز الأعلى سيكون أوفر على المدى الطويل.",
  },
];

export function generateQuestions(productId: string, count = 4): ProductQuestion[] {
  const rnd = mulberry32(seedFromString(`${productId}-q`));
  const items: ProductQuestion[] = [];

  for (let i = 0; i < count; i += 1) {
    const template = QUESTION_TEMPLATES[Math.floor(rnd() * QUESTION_TEMPLATES.length)];
    const days = 6 + Math.floor(rnd() * 120);
    const answered = rnd() > 0.25;
    items.push({
      id: `${productId}-q-${i + 1}`,
      productId,
      author: pick(rnd, AUTHORS).split(" ")[0],
      city: pick(rnd, CITIES),
      question: template.question,
      createdAt: daysAgo(days),
      helpfulCount: Math.floor(rnd() * 30),
      answer: answered
        ? {
            body: template.answer,
            answeredBy: "الدعم الفني – رواء",
            createdAt: daysAgo(Math.max(1, days - 1)),
          }
        : undefined,
    });
  }

  // De-duplicate templates so the list never shows the same question twice.
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.question)) return false;
    seen.add(item.question);
    return true;
  }).concat(items.filter((item) => !seen.has(item.question))).slice(0, count);
}

/** Flagship Q&A — the original four questions shipped with the storefront. */
export const flagshipQuestions: ProductQuestion[] = [
  {
    id: "q-1",
    productId: "prd_ro7_84c21",
    author: "سلطان",
    city: "الرياض",
    question: "هل يحتاج الجهاز إلى كهرباء؟ وكم يستهلك شهريًا؟",
    createdAt: daysAgo(5),
    helpfulCount: 19,
    answer: {
      body: "نعم، طرازات 7 و9 مراحل مزوّدة بمضخة تعزيز تعمل على 24 فولت باستهلاك 24 واط فقط — أقل من 3 ريالات شهريًا تقريبًا. أما طراز الفلتر المباشر 600G فيعمل بضغط الشبكة في المناطق ذات الضغط المرتفع.",
      answeredBy: "الدعم الفني – رواء",
      createdAt: daysAgo(4),
    },
  },
  {
    id: "q-2",
    productId: "prd_ro7_84c21",
    author: "أمل",
    city: "جدة",
    question: "كم تكلفة تغيير الشمعات سنويًا؟ وهل أستطيع تغييرها بنفسي؟",
    createdAt: daysAgo(9),
    helpfulCount: 24,
    answer: {
      body: "طقم شمعات المراحل 1–3 بسعر 145 ر.س ويُغيَّر كل 6 أشهر، والممبرين 260 ر.س كل سنتين تقريبًا. يمكنك تغييرها بنفسك بمفتاح الشمعات المرفق، لكن ننصح بزيارة الفني ضمن باقة العناية للحفاظ على الضمان وضبط الضغط.",
      answeredBy: "الدعم الفني – رواء",
      createdAt: daysAgo(8),
    },
  },
  {
    id: "q-3",
    productId: "prd_ro7_84c21",
    author: "ماجد",
    city: "الدمام",
    question: "مياه الحي عندنا TDS حوالي 1100، هل 7 مراحل تكفي أم أحتاج مرحلة إضافية؟",
    createdAt: daysAgo(14),
    helpfulCount: 16,
    answer: {
      body: "قراءة 1100 ملجم/لتر مرتفعة نسبيًا، ويعمل معها النظام بسبع مراحل بشرط تركيب مضخة تعزيز وتقصير دورة تغيير الشمعات إلى 4–5 أشهر. إن كانت القراءة أعلى من 1500 فننصح بوحدة تحلية مخصصة؛ تواصل معنا لتحليل مياه دقيق.",
      answeredBy: "الدعم الفني – رواء",
      createdAt: daysAgo(13),
    },
  },
  {
    id: "q-4",
    productId: "prd_ro7_84c21",
    author: "خديجة",
    city: "مكة المكرمة",
    question: "هل يمكن تركيب الجهاز في خزانة المطبخ الضيقة؟",
    createdAt: daysAgo(21),
    helpfulCount: 11,
  },
];

/* ------------------------------------------------------------------ */
/* Public accessors (cached per product)                                */
/* ------------------------------------------------------------------ */
const reviewCache = new Map<string, Review[]>();
const questionCache = new Map<string, ProductQuestion[]>();

/** Reviews for any catalog product — hand-written for the flagship, generated otherwise. */
export function reviewsForProduct(
  productId: string,
  rating = 4.5,
  reviewCount = 40,
  productSlug?: string
): Review[] {
  const cached = reviewCache.get(productId);
  if (cached) return cached;
  const items =
    productSlug === "water-filters/rewaa-pro-ro7"
      ? flagshipReviews
      : generateReviews(productId, rating, reviewCount);
  reviewCache.set(productId, items);
  return items;
}

/** Q&A entries for any catalog product. */
export function questionsForProduct(productId: string, productSlug?: string, count = 4): ProductQuestion[] {
  const cached = questionCache.get(productId);
  if (cached) return cached;
  const items = productSlug === "water-filters/rewaa-pro-ro7" ? flagshipQuestions : generateQuestions(productId, count);
  questionCache.set(productId, items);
  return items;
}

/** Finds a review by id across every cached product set (used by mark-helpful). */
export function findReviewById(reviewId: string): Review | undefined {
  for (const items of reviewCache.values()) {
    const found = items.find((review) => review.id === reviewId);
    if (found) return found;
  }
  return flagshipReviews.find((review) => review.id === reviewId);
}

/** Finds a Q&A entry by id across every cached product set. */
export function findQuestionById(questionId: string): ProductQuestion | undefined {
  for (const items of questionCache.values()) {
    const found = items.find((item) => item.id === questionId);
    if (found) return found;
  }
  return flagshipQuestions.find((item) => item.id === questionId);
}

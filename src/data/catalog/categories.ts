import type { CategoryNode } from "@/types/catalog";

/**
 * Category tree.
 * Roots, subcategories, filter schema and on-page SEO copy all live here so a
 * new category can be added without touching a single component.
 */

const filterDefaults = ["price", "brand", "availability", "rating", "usage"] as const;

export const categories: CategoryNode[] = [
  {
    id: "cat-water-filters",
    slug: "water-filters",
    name: "فلاتر المياه",
    nameEn: "Water Filters",
    shortDescription: "أنظمة تنقية مياه الشرب للمنازل والمكاتب.",
    description:
      "اختر نظام التنقية المناسب لاحتياجك: أنظمة التناضح العكسي (RO) بخزانات، الأنظمة المباشرة بلا خزان، وحدات تحت المغسلة، وأجهزة على الطاولة. كل الأنظمة تأتي بشمعات أصلية وقطع غيار متوفرة، مع إمكانية إضافة التركيب والصيانة الدورية.",
    icon: "droplet",
    accent: "aqua",
    productCountPlaceholder: 5,
    benefits: [
      { title: "تركيب من فرق رواء", description: "فنيون مختصون يركّبون النظام ويشرحون طريقة الاستخدام والصيانة.", icon: "settings" },
      { title: "شمعات متوفرة دائمًا", description: "قطع غيار أصلية بنفس المقاسات، تصلك عند الحاجة.", icon: "package" },
      { title: "صيانة دورية اختيارية", description: "باقة عناية تذكّرك بموعد تغيير الشمعات وزيارة الفحص.", icon: "shield" },
    ],
    buyingGuide: {
      title: "كيف تختار فلتر المياه المناسب؟",
      steps: [
        "حدّد الاستخدام: شرب وطبخ فقط أم استخدام كامل للمنزل.",
        "اعرف نسبة الأملاح في مياه الشبكة عبر جهاز TDS أو تحليل مياه.",
        "اختر بين نظام بخزان (تعبئة تدريجية) ونظام مباشر (تدفق فوري).",
        "راجع السعة اليومية للأسرة ومساحة التركيب المتوفرة تحت المغسلة.",
      ],
    },
    filterGroups: [...filterDefaults, "stages", "systemType", "installation", "warranty", "flowRate"],
    seo: {
      title: "فلاتر المياه المنزلية | أنظمة تنقية وتناضح عكسي",
      description:
        "تسوّق أنظمة تنقية المياه بأنواعها: تناضح عكسي، أنظمة مباشرة، وحدات تحت المغسلة وأجهزة على الطاولة، مع تركيب وشمعات أصلية.",
      intro:
        "كل نظام في هذه الصفحة يمكن تركيبه في يوم واحد، وستجد له شمعات بديلة وقطع غيار داخل المتجر — لا حاجة للبحث خارج رواء عند الصيانة.",
      sections: [
        {
          id: "choosing",
          title: "الفروق بين أنواع الأنظمة",
          body: [
            "أنظمة التناضح العكسي تمرّ بالمياه عبر غشاء مُحكم يقلل الأملاح الذائبة، وتأتي عادة مع خزان لتخزين المياه المعالجة.",
            "الأنظمة المباشرة تعتمد على أكثر من مرحلة فلترة وتنتج تدفقًا فوريًا بدون خزان، ما يجعلها مناسبة للمساحات الضيقة.",
          ],
        },
      ],
      faqIds: ["faq-products-1", "faq-products-2", "faq-installation-1", "faq-maintenance-1"],
    },
    children: [
      {
        id: "cat-ro-systems",
        slug: "ro-systems",
        aliases: ["ro"],
        name: "أجهزة التناضح العكسي (RO)",
        nameEn: "Reverse Osmosis Systems",
        shortDescription: "أنظمة بخزان تنتج مياه شرب منخفضة الأملاح.",
        description:
          "أنظمة RO بخزان تخزين، متوفرة بخمس وست وسبع مراحل، مع مضخة أو بدون، ومساحات تركيب تناسب الوحدات الصغيرة والمطابخ المنزلية.",
        icon: "droplet",
        accent: "brand",
        productCountPlaceholder: 3,
        filterGroups: [...filterDefaults, "stages", "pump", "tank", "flowRate", "warranty", "installation"],
        seo: {
          title: "أجهزة التناضح العكسي RO بالسعودية | أنظمة بخزان",
          description:
            "أنظمة تناضح عكسي 5 و6 و7 مراحل بخزان تخزين، مع خيار مضخة تعزيز وتركيب من فرق رواء.",
          intro:
            "النظام الأنسب لمن يحتاج مياه شرب أقل أملاحًا بكميات يومية منتظمة؛ اسأل فريق الدعم عن حجم الخزان المناسب لعدد أفراد الأسرة.",
          faqIds: ["faq-products-1", "faq-maintenance-1", "faq-maintenance-4", "faq-installation-2"],
        },
        children: [],
      },
      {
        id: "cat-direct-flow",
        slug: "direct-flow",
        name: "الأنظمة المباشرة",
        nameEn: "Direct Flow Systems",
        shortDescription: "تدفق فوري بدون خزان تخزين.",
        description:
          "أنظمة تصفية مباشرة بلا خزان، تركّب تحت المغسلة وتوفّر مياه شرب بلا انتظار — مناسبة للأسر الصغيرة والمكاتب.",
        icon: "bolt",
        accent: "flow",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "stages", "flowRate", "warranty", "installation"],
        seo: {
          title: "أنظمة فلترة مباشرة بدون خزان | تنقية فورية",
          description: "أنظمة تنقية مباشرة بلا خزان توفّر مياه شرب بتدفق فوري، بأكثر من مرحلة فلترة مع تركيب اختياري.",
          intro: "مثالية للمساحات الضيقة تحت المغسلة، ولأنها بلا خزان فلا تحتاج مساحة تخزين إضافية.",
          faqIds: ["faq-products-2", "faq-installation-1"],
        },
        children: [],
      },
      {
        id: "cat-under-sink",
        slug: "under-sink",
        name: "فلاتر تحت المغسلة",
        nameEn: "Under Sink Filters",
        shortDescription: "وحدات فلترة متعددة المراحل أسفل الحوض.",
        description:
          "وحدات فلترة تركّب تحت المغسلة بصنبور مستقل، تخدم الشرب والطبخ مع استهلاك مياه أقل وتكلفة تشغيل اقتصادية.",
        icon: "layers",
        accent: "aqua",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "stages", "replacementInterval", "warranty"],
        seo: {
          title: "فلاتر تحت المغسلة | تنقية مياه الشرب والطبخ",
          description: "وحدات فلترة تحت المغسلة بصنبور مستقل، بمراحل فلترة متعددة وشمعات سهلة التبديل.",
          faqIds: ["faq-products-3", "faq-maintenance-2"],
        },
        children: [],
      },
      {
        id: "cat-countertop",
        slug: "countertop",
        name: "أجهزة على الطاولة",
        nameEn: "Countertop Filters",
        shortDescription: "حل سريع بلا تركيب للمياه.",
        description:
          "أجهزة تصفية توضع على الطاولة وتوصل بالصنابير مباشرة — الأنسب للأماكن المستأجرة أو الذين يفضلون حلاً بلا تركيب.",
        icon: "store",
        accent: "ink",
        productCountPlaceholder: 1,
        filterGroups: [...filterDefaults, "stages", "installation"],
        seo: {
          title: "أجهزة تنقية مياه توضع على الطاولة | بدون تركيب",
          description: "أجهزة تنقية مياه على الطاولة تُركّب على الصنبور مباشرة بدون أعمال تركيب.",
          faqIds: ["faq-products-3"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-cartridges",
    slug: "cartridges",
    name: "الشمعات والقطع",
    nameEn: "Cartridges & Spares",
    shortDescription: "شمعات بديلة، أغشية، وفلاتر ما بعد المعالجة.",
    description:
      "قسم قطع الغيار: أطقم شمعات بأطوال ومقاسات متعددة، أغشية تناضح عكسي، وفلاتر ما بعد المعالجة. استخدم بحث التوافق للتحقق من المقاس المناسب لنظامك.",
    icon: "package",
    accent: "flow",
    productCountPlaceholder: 6,
    buyingGuide: {
      title: "قبل شراء الشمعة",
      steps: [
        "اكتب رقم موديل الجهاز أو اسم النظام في خانة بحث التوافق.",
        "حدّد نوع الشمعة: مرحلة أولى، كربون، غشاء RO، أو ما بعد الكلور.",
        "راجع المقاس بالسنتيمتر (طول 10 أو 12 بوصة) وقطر الفتحة.",
        "اشترِ طقمًا كاملًا إن كان موعد تغيير أغلب المراحل قريبًا.",
      ],
    },
    filterGroups: [...filterDefaults, "replacementInterval", "compatibleModels"],
    seo: {
      title: "شمعات فلتر المياه وقطع الغيار الأصلية",
      description: "أطقم شمعات بديلة، أغشية تناضح عكسي RO، وفلاتر ما بعد المعالجة بمقاسات متعددة مع بحث توافق الموديل.",
      intro: "كل شمعة مذكور معها المقاس ودورة الاستبدال المقترحة والموديلات المتوافقة، ويمكن تصفية النتائج برقم الموديل.",
      faqIds: ["faq-maintenance-2", "faq-products-3", "faq-maintenance-1"],
    },
    children: [
      {
        id: "cat-cartridge-sets",
        slug: "cartridge-sets",
        name: "أطقم الشمعات",
        nameEn: "Cartridge Sets",
        shortDescription: "أطقم كاملة لمراحل ما قبل وبعد التناضح.",
        description: "أطقم شمعات مجمّعة حسب المرحلة، تحلّ محلّ الشمعات المنتهية وتعيد النظام إلى أدائه المعتاد.",
        icon: "layers",
        accent: "flow",
        productCountPlaceholder: 3,
        filterGroups: [...filterDefaults, "replacementInterval", "compatibleModels", "stages"],
        seo: {
          title: "أطقم شمعات فلتر المياه | مراحل ما قبل وبعد RO",
          description: "أطقم شمعات بديلة لفلاتر المياه: مرحلة أولى، كربون بلوك، وما بعد المعالجة، بمقاسات متعددة.",
          faqIds: ["faq-maintenance-2", "faq-maintenance-4"],
        },
        children: [],
      },
      {
        id: "cat-ro-membranes",
        slug: "ro-membranes",
        name: "أغشية التناضح العكسي",
        nameEn: "RO Membranes",
        shortDescription: "أغشية RO بالمعايير القياسية 75 و100 جالون.",
        description: "أغشية تناضح عكسي بمعدلات إنتاج مختلفة، توافق أغلب الأنظمة المنزلية المتوسطة والكبيرة.",
        icon: "droplet",
        accent: "aqua",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "flowRate", "replacementInterval", "compatibleModels"],
        seo: {
          title: "أغشية RO للتناضح العكسي | 75 و100 جالون",
          description: "أغشية تناضح عكسي بمعدلات إنتاج 75 و100 جالون يوميًا، متوافقة مع أغلب أنظمة RO المنزلية.",
          faqIds: ["faq-maintenance-4", "faq-water-quality-2"],
        },
        children: [],
      },
      {
        id: "cat-post-filters",
        slug: "post-filters",
        name: "فلاتر ما بعد المعالجة",
        nameEn: "Post Filters",
        shortDescription: "شمعات إضافية لتحسين الطعم والرائحة.",
        description: "فلتر ما بعد المعالجة مسؤول عن تحسين الطعم والرائحة بعد غشاء RO، ويأتي بمقاسات قياسية.",
        icon: "sparkles",
        accent: "brand",
        productCountPlaceholder: 1,
        filterGroups: [...filterDefaults, "replacementInterval", "compatibleModels"],
        seo: {
          title: "فلتر ما بعد المعالجة | تحسين طعم ورائحة المياه",
          description: "شمعات ما بعد المعالجة لما بعد غشاء التناضح العكسي، بمقاسات قياسية وتوافق واسع.",
          faqIds: ["faq-products-3"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-whole-house",
    slug: "whole-house",
    name: "فلترة المنزل بالكامل",
    nameEn: "Whole House",
    shortDescription: "فلترة مركزية وأجهزة تليين للمياه.",
    description:
      "عند نقطة دخول المياه للمنزل: فلاتر مركزية بعمود واحد أو أكثر لحجز الشوائب على كل نقاط الاستخدام، وأجهزة تليين تقلل عسر المياه لحماية المواسير والسخانات.",
    icon: "home",
    accent: "brand",
    productCountPlaceholder: 4,
    benefits: [
      { title: "حماية كل النقاط", description: "الفلترة المركزية تسبق جميع نقاط الاستخدام داخل المنزل.", icon: "shield" },
      { title: "دراسة قبل التركيب", description: "زيارة معاينة لتحديد مكان التركيب ومقاس العمود المناسب.", icon: "scale" },
    ],
    buyingGuide: {
      title: "هل تحتاج فلترة مركزية؟",
      steps: [
        "إذا لاحظت ترسّبات أو صدأ في الفلاتر أو السخانات، فالفلترة الأولى مفيدة.",
        "إن كان عسر المياه مرتفعًا من الأفضل دراسة تليين مياه قبل التركيب.",
        "حدّد عدد نقاط الاستخدام لاختيار فلتر بعمود واحد أو اثنين.",
        "تأكد من مساحة التركيب وتوفر مصدر تصريف قريب.",
      ],
    },
    filterGroups: [...filterDefaults, "installation", "warranty", "capacity"],
    seo: {
      title: "فلترة المنزل بالكامل | فلاتر مركزية وأجهزة تليين",
      description: "أنظمة فلترة مركزية عند مدخل المياه، وأجهزة تليين لتقليل عسر المياه وحماية المواسير والسخانات.",
      intro: "الفلترة المركزية لا تُغني عن فلتر الشرب، لكنها تحمي التمديدات والأجهزة من الشوائب وأثر العسر.",
      faqIds: ["faq-products-1", "faq-installation-3", "faq-water-quality-1"],
    },
    children: [
      {
        id: "cat-central-filters",
        slug: "central-filters",
        name: "الفلاتر المركزية",
        nameEn: "Central Filters",
        shortDescription: "فلترة كل نقاط المنزل من نقطة الدخول.",
        description: "فلاتر بعمود فلترة واحد أو أكثر تُركّب عند مدخل المياه وتحجز الشوائب العالقة قبل وصولها للتمديدات.",
        icon: "home",
        accent: "brand",
        productCountPlaceholder: 3,
        filterGroups: [...filterDefaults, "capacity", "installation", "warranty"],
        seo: {
          title: "فلتر مركزي للمنزل | فلترة عند مدخل المياه",
          description: "فلاتر مركزية بعمود واحد أو أكثر، تُركّب عند مدخل المياه لحجز الشوائب وحماية التمديدات.",
          faqIds: ["faq-products-1", "faq-installation-3"],
        },
        children: [],
      },
      {
        id: "cat-softeners",
        slug: "softeners",
        name: "أجهزة التليين",
        nameEn: "Water Softeners",
        shortDescription: "تقليل عسر المياه لحماية الأجهزة.",
        description:
          "أجهزة تليين تعمل بالملح وتقلل عسر المياه، ما يخفف الترسّبات في السخانات والغسالات ويساعد على تحسين أداء الصابون.",
        icon: "snow",
        accent: "aqua",
        productCountPlaceholder: 1,
        filterGroups: [...filterDefaults, "capacity", "installation", "warranty"],
        seo: {
          title: "جهاز تليين المياه للمنازل | تقليل العسر",
          description: "أجهزة تليين مياه منزلية تعمل بالملح لتقليل عسر المياه وحماية السخانات والتمديدات.",
          faqIds: ["faq-water-quality-1", "faq-installation-3"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-desalination",
    slug: "desalination",
    name: "التحلية",
    nameEn: "Desalination",
    shortDescription: "وحدات تحلية للاستخدام المنزلي والتجاري.",
    description:
      "وحدات تحلية تعمل بمبدأ التناضح العكسي بسعات إنتاج مناسبة للفيلا أو المشروع، مع دراسة مياه قبل التوريد لاختيار سعة الغشاء وعدد الأغشية.",
    icon: "waves",
    accent: "aqua",
    productCountPlaceholder: 4,
    buyingGuide: {
      title: "كيف تُحدد سعة وحدة التحلية؟",
      steps: [
        "احسب الاستهلاك اليومي التقريبي للمنشأة (لتر/يوم).",
        "اعرف درجة ملوحة المياه الخام (TDS) عبر تحليل مياه.",
        "اختر سعة الوحدة بهامش 20–30% فوق الاستهلاك اليومي.",
        "راجع التغذية الكهربائية والمساحة المتوفرة ومكان التصريف.",
      ],
    },
    filterGroups: [...filterDefaults, "capacity", "flowRate", "usage", "installation", "warranty"],
    seo: {
      title: "وحدات تحلية المياه المنزلية والتجارية",
      description: "وحدات تحلية مياه بسعات مختلفة للفيلات والمطاعم والمنشآت، مع دراسة مياه وتوريد وتركيب.",
      intro: "نبدأ دائمًا بتحليل مياه لتحديد سعة الوحدة المناسبة، ثم نرشح المواصفات قبل التركيب.",
      faqIds: ["faq-water-quality-2", "faq-commercial-1", "faq-commercial-2"],
    },
    children: [
      {
        id: "cat-home-desalination",
        slug: "home-desalination",
        name: "تحلية منزلية",
        nameEn: "Home Desalination",
        shortDescription: "سعات للفلل والمنازل الكبيرة.",
        description: "وحدات تحلية منزلية بسعات إنتاج متوسطة، مناسبة لاحتياج الفيلا اليومي مع خزان تخزين.",
        icon: "home",
        accent: "aqua",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "capacity", "flowRate", "installation", "warranty"],
        seo: {
          title: "وحدات تحلية منزلية للفلل | سعات 200 و400 جالون",
          description: "وحدات تحلية مياه منزلية بسعات 200 إلى 400 جالون يوميًا مع خزان تخزين وتركيب اختياري.",
          faqIds: ["faq-water-quality-2", "faq-installation-3"],
        },
        children: [],
      },
      {
        id: "cat-commercial-desalination",
        slug: "commercial-desalination",
        name: "تحلية تجارية",
        nameEn: "Commercial Desalination",
        shortDescription: "سعات للمطاعم والمنشآت والمشاريع.",
        description:
          "وحدات تحلية بسعات إنتاج كبيرة، تُحدد مواصفاتها بعد دراسة مياه وزيارة موقع لتحديد التمديدات وخزان التغذية.",
        icon: "building",
        accent: "brand",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "capacity", "flowRate", "usage", "installation", "warranty"],
        seo: {
          title: "وحدات تحلية تجارية للمطاعم والمنشآت",
          description: "وحدات تحلية مياه تجارية بسعات كبيرة للمطاعم والمنشآت، بدراسة مياه وعرض فني قبل التوريد.",
          faqIds: ["faq-commercial-1", "faq-commercial-2", "faq-commercial-3"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-pumps-equipment",
    slug: "pumps-equipment",
    name: "المضخات والمعدات",
    nameEn: "Pumps & Equipment",
    shortDescription: "مضخات تعزيز، خزانات ضغط، وملحقات التركيب.",
    description:
      "مضخات تعزيز لرفع ضغط المياه ودفعه للطوابق العليا، خزانات ضغط لتنظيم التدفق، وملحقات التركيب من وصلات ومحابس ولوازم.",
    icon: "settings",
    accent: "ink",
    productCountPlaceholder: 4,
    filterGroups: [...filterDefaults, "usage", "warranty"],
    seo: {
      title: "مضخات المياه وخزانات الضغط وملحقات التركيب",
      description: "مضخات تعزيز المياه، خزانات الضغط، وملحقات التركيب الأصلية لتمديدات المنازل والمنشآت.",
      faqIds: ["faq-installation-1", "faq-products-4"],
    },
    children: [
      {
        id: "cat-booster-pumps",
        slug: "booster-pumps",
        name: "مضخات تعزيز",
        nameEn: "Booster Pumps",
        shortDescription: "رفع ضغط المياه في الطوابق العليا.",
        description: "مضخات تعزز ضغط المياه للأنظمة والخزانات، باختيار قدرة حسب عدد النقاط وارتفاع الطوابق.",
        icon: "bolt",
        accent: "ink",
        productCountPlaceholder: 2,
        filterGroups: [...filterDefaults, "flowRate", "usage", "warranty"],
        seo: {
          title: "مضخات تعزيز ضغط المياه | منزلية وتجارية",
          description: "مضخات تعزيز ضغط المياه بقدرات مختلفة لتناسب المنازل والفلل والاستخدامات التجارية.",
          faqIds: ["faq-products-4"],
        },
        children: [],
      },
      {
        id: "cat-pressure-tanks",
        slug: "pressure-tanks",
        name: "خزانات الضغط",
        nameEn: "Pressure Tanks",
        shortDescription: "تنظيم التدفق وتقليل تشغيل المضخة.",
        description: "خزانات ضغط تحافظ على ضغط مستقر في الشبكة وتقلل عدد مرات تشغيل المضخة.",
        icon: "gauge",
        accent: "aqua",
        productCountPlaceholder: 1,
        filterGroups: [...filterDefaults, "capacity", "usage"],
        seo: {
          title: "خزانات ضغط المياه | تنظيم التدفق",
          description: "خزانات ضغط بسعات مختلفة لتنظيم تدفق المياه وتقليل تشغيل المضخة.",
          faqIds: ["faq-products-4"],
        },
        children: [],
      },
      {
        id: "cat-accessories",
        slug: "accessories",
        name: "ملحقات ولوازم",
        nameEn: "Accessories",
        shortDescription: "وصلات، محابس، وقطع تمديد.",
        description: "ملحقات التركيب والصيانة: وصلات، محابس، وأنابيب مرنة بمقاسات قياسية تناسب أغلب الأنظمة.",
        icon: "package",
        accent: "flow",
        productCountPlaceholder: 1,
        filterGroups: filterDefaults,
        seo: {
          title: "ملحقات ولوازم تركيب فلاتر المياه",
          description: "وصلات ومحابس وأنابيب مرنة لتركيب وصيانة أنظمة تنقية المياه بمقاسات قياسية.",
          faqIds: ["faq-installation-1"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-testing",
    slug: "testing",
    name: "فحص وتحليل المياه",
    nameEn: "Water Testing",
    shortDescription: "أجهزة TDS وأدوات فحص المياه.",
    description:
      "أدوات فحص مياه منزلية: أجهزة قياس الأملاح الذائبة (TDS)، وأشرطة واختبارات كيميائية سريعة لمراقبة جودة مياه الشبكة والأنظمة.",
    icon: "gauge",
    accent: "flow",
    productCountPlaceholder: 3,
    buyingGuide: {
      title: "ماذا تقيس أدوات الفحص؟",
      steps: [
        "جهاز TDS يقيس إجمالي الأملاح الذائبة، وهو مؤشر تشغيلي يتغير بحسب مصدر المياه.",
        "أشرطة pH تقيس حموضة أو قلوية المياه.",
        "اختبارات العسر تقيس تركيز المعادن التي تسبب الترسّبات.",
        "سجّل القراءة قبل وبعد الفلتر لمتابعة أداء النظام مع الوقت.",
      ],
    },
    filterGroups: filterDefaults,
    seo: {
      title: "أجهزة فحص وتحليل المياه | TDS واختبارات سريعة",
      description: "أجهزة قياس الأملاح الذائبة TDS وأدوات فحص مياه منزلية لمتابعة أداء فلتر المياه وكفاءته.",
      intro: "القراءات مؤشر تشغيلي يساعدك على متابعة النظام، ولا تُعد تقريرًا مخبريًا أو شهادة سلامة للمياه.",
      faqIds: ["faq-water-quality-2", "faq-water-quality-3"],
    },
    children: [
      {
        id: "cat-tds-meters",
        slug: "tds-meters",
        name: "أجهزة قياس TDS",
        nameEn: "TDS Meters",
        shortDescription: "قياس الأملاح الذائبة في المياه.",
        description: "أجهزة رقمية لقياس إجمالي الأملاح الذائبة في المياه، بمقاسات جيب ويد مناسبة للمنزل والمختبر الميداني.",
        icon: "gauge",
        accent: "flow",
        productCountPlaceholder: 2,
        filterGroups: filterDefaults,
        seo: {
          title: "جهاز قياس TDS لفحص المياه",
          description: "أجهزة قياس الأملاح الذائبة TDS رقمية لمتابعة جودة مياه الشرب قبل وبعد الفلتر.",
          faqIds: ["faq-water-quality-2"],
        },
        children: [],
      },
      {
        id: "cat-test-kits",
        slug: "test-kits",
        name: "أطقم فحص المياه",
        nameEn: "Test Kits",
        shortDescription: "اختبارات سريعة للعسر والحموضة.",
        description: "أطقم اختبار منزلية لقياس العسر والحموضة والكلور المتبقي بتعليمات عربية واضحة.",
        icon: "search",
        accent: "aqua",
        productCountPlaceholder: 1,
        filterGroups: filterDefaults,
        seo: {
          title: "أطقم فحص المياه المنزلية | عسر وحموضة وكلور",
          description: "أطقم فحص منزلية لقياس عسر المياه والحموضة والكلور المتبقي مع تعليمات استخدام عربية.",
          faqIds: ["faq-water-quality-1", "faq-water-quality-3"],
        },
        children: [],
      },
    ],
  },
  {
    id: "cat-dispensers",
    slug: "dispensers",
    name: "برادات ومبرّدات المياه",
    nameEn: "Water Dispensers",
    shortDescription: "برادات مكتبية ومنزلية بمياه ساخنة وباردة.",
    description: "برادات مياه بأحجام مختلفة، تشمل خيارات بمياه ساخنة وباردة، مع ملحقات توصيل المياه مباشرة.",
    icon: "store",
    accent: "ink",
    productCountPlaceholder: 2,
    filterGroups: filterDefaults,
    seo: {
      title: "برادات المياه | مبرّدات منزلية ومكتبية",
      description: "برادات ومبرّدات مياه منزلية ومكتبية بمياه ساخنة وباردة، مع خيارات توصيل الشبكة مباشرة.",
      faqIds: ["faq-products-2"],
    },
    children: [],
  },
];

const bySlug = new Map<string, CategoryNode>();
const byId = new Map<string, CategoryNode>();
const parentOf = new Map<string, CategoryNode>();

function register(node: CategoryNode, parent?: CategoryNode): void {
  bySlug.set(node.slug, node);
  byId.set(node.id, node);
  if (parent) parentOf.set(node.slug, parent);
  node.children.forEach((child) => register(child, node));
}

categories.forEach((category) => register(category));

export const allCategories: CategoryNode[] = [];
for (const root of categories) {
  allCategories.push(root);
  for (const child of root.children) allCategories.push(child);
}

export const topLevelCategories = categories;

/** Resolves a slug or alias to a category node. */
export function findCategoryBySlug(slug: string): CategoryNode | undefined {
  const direct = bySlug.get(slug);
  if (direct) return direct;
  return allCategories.find((category) => category.aliases?.includes(slug));
}

export function findCategoryById(id: string): CategoryNode | undefined {
  return byId.get(id);
}

export function parentCategory(slug: string): CategoryNode | undefined {
  return parentOf.get(slug);
}

/** Root → … → node trail used for breadcrumbs and the hero. */
export function categoryTrail(slug: string): CategoryNode[] {
  const node = findCategoryBySlug(slug);
  if (!node) return [];
  const trail: CategoryNode[] = [node];
  let parent = parentOf.get(node.slug);
  while (parent) {
    trail.unshift(parent);
    parent = parentOf.get(parent.slug);
  }
  return trail;
}

/** Flattens a category and its children (used for filtering product lists). */
export function categorySlugFamily(slug: string): string[] {
  const node = findCategoryBySlug(slug);
  if (!node) return [slug];
  return [node.slug, ...node.children.map((child) => child.slug)];
}

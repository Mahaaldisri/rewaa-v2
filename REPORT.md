# Rewaa — delivery report

Branch `arena/01a10035-rewaa`, built on top of the existing repo (`main`, commit `ce29647`). Nothing was rewritten: the React 19 + TS (strict) + Vite + Tailwind 4 + React Router app, its design language, RTL layout and component architecture are the same — features were added and hardened.

## 1. What already existed (kept, not replaced)

Product/catalog pages with gallery, variants, pricing, promotions, reviews, Q&A, compare, wishlist, cart, checkout, order tracking, account, auth screens, toasts, SEO helpers, a mock service layer and a localStorage layer. All of it still works; new code goes through the same service layer instead of reading mock data in components.

## 2. What was added or hardened

- **Production safety:** QA tools (`ScenarioSwitcher`) dev-only; `VITE_API_URL` from `import.meta.env` with an explicit configuration error in production instead of silently serving mock data; config validation (`validate-config.mjs`) warns loudly about placeholder official data; no fake IDs/credentials anywhere.
- **Checkout:** no raw card data is stored or sent; payment-provider abstraction (hosted fields/tokenization/SDK) with demo payments dev-only; encryption/payment claims removed until a real gateway is connected.
- **SEO:** generated `robots.txt` + `sitemap.xml` (118 URLs), per-page canonical/OG/Twitter/JSON-LD, prerendered static HTML for public, product, category, brand, service and article pages, noindex rules for cart/checkout/account/auth/wishlist/compare/search/track/return/warranty forms.
- **Observability:** analytics abstraction (activation only via env vars) covering `view_item`, `view_item_list`, `search`, cart/checkout/purchase events, `book_service`, `submit_warranty`, `submit_return`, `business_lead` plus filter/hero/calculator events; consent layer gating analytics & marketing; error-monitoring abstraction and Web Vitals hookable to Sentry later.
- **Quality gates:** ESLint + strict TS + 103 unit/integration tests + Playwright E2E specs + `scripts/route-smoke.mjs` + `scripts/link-audit.mjs`, all wired into `npm run verify`.
- **Features:** Compatibility Checker, Maintenance Center (customer devices, install date, last/next cartridge change, % remaining, correct cartridge set, Buy Again, book a technician, reminder-channel scaffolding), Product Finder → Water Advisor (city, source, TDS, users, housing, problem, consumption; ranked with reasons and no invented lab results), Service Availability component (per city/district availability, fees, nearest slot; production refuses to invent coverage).
- **Catalog filtering (derived, data-only):** use case, household size, installation type, features (RO/UV), offers/discounts, availability, dual price range, savings sort, filter insights, empty-state “nearest available products”, bottom-sheet mobile filters.
- **Savings calculator `/calculator`:** estimate vs. actual-purchases modes, catalogue-priced device picker, editable assumptions, break-even month, 5-year savings, cost per litre, “what if” sliders, shareable URL (numbers only, no personal data), local save/restore; missing catalogue values are surfaced, never guessed.
- **Homepage:** data-driven hero slider (3 slides, autoplay paused on hover/focus/hidden-tab/reduced-motion, keyboard + swipe), announcements strip that renders nothing when nothing is live, calculator teaser computed from a real catalogue device.
- **Design/identity:** logo, colours (navy #16306B / cyan #22A9E0 / teal #22B573), RTL and responsive behaviour unchanged; every new block uses existing tokens and components.

## 3. Pages, routes and components

- **New routes:** `/calculator`, `/brands` (plus earlier `/compatibility`, `/services`, `/product-finder` rewrite, account tab `maintenance`). 118 prerendered documents.
- **New components:** `components/calculator/{CalculatorForm,CalculatorResults,BreakEvenChart}`, `components/home/{HeroSlider,Announcements,CalculatorTeaser}`, `components/catalog/CatalogFilters` (rebuilt), `components/services/{CompatibilityChecker,ServiceAvailabilityPanel}`, `components/account/MaintenanceCenter`, `components/system/{ConfigErrorScreen,DemoDataBanner,ConsentBanner,AnalyticsRouteTracker}`.
- **New data/libs/services:** `data/content/{hero,announcements}.ts`, `lib/{filter-model,filter-insights,calculator-logic,compatibility,maintenance,water-advisor}.ts`, `services/{calculatorApi,compatibilityApi,maintenanceApi,serviceAvailability,analytics/*,monitoring,consent,payments}.ts`.

## 4. Architecture notes

- Components never read mock data directly: every dynamic value comes from `src/services/*`, which today reads the catalogue/content data, and can be swapped for `VITE_API_URL` endpoints without touching the UI.
- `src/lib/*` holds pure, testable rules (filters, compatibility, maintenance, calculator); `src/data/*` holds editable content/config; `src/config/site.ts` is the single editable place for business data.
- Prerendering and the sitemap come from a framework-free route model (`src/lib/seo-routes.ts`) shared by the app and the build script.

## 5. Business information still needed (placeholders in `src/config/site.ts`)

Unified phone, WhatsApp service number, national address, CR number, VAT number, founded year, and the Instagram/X/TikTok/YouTube/Snapchat handles. Production builds and `npm run config:check:strict` fail/warn until they are replaced. Also needed before launch: the real API URL, payment provider keys (via env), and confirmation of the published service coverage/fees.

## 6. Build result (latest full `npm run verify`)

- `tsc --noEmit` (app + tests): clean
- `eslint .`: 0 errors, 6 pre-existing `react-hooks/exhaustive-deps` warnings
- `vitest run`: 13 files / 103 tests passing
- `audit:links`: 34 static internal targets, all resolve
- `npm run build`: 118 static pages + `sitemap.xml` + `robots.txt`; `dist/index.html` 1,517.42 kB (gzip 397.68 kB); `dist/` 4.2 MB
- `smoke:routes`: 38/38 routes render a real `<h1>`; the homepage, calculator and brands pages were additionally checked for their key content

## 7. What still needs a backend

Real product/order/auth APIs, payment gateway, shipping rates and tracking, service-booking and availability feeds, warranty/return intake, reviews/Q&A moderation, file uploads for claims, and the email/WhatsApp/SMS reminder dispatchers behind the maintenance centre. Every one of those is already isolated behind a service function, so switching them on is an implementation task rather than a refactor.

## 8. مساعد رواء الذكي (AI assistant) — الحالة والبنية

**الوضع الحالي: المرحلة A مكتملة ومختبَرة. لا يوجد مزوّد ذكاء اصطناعي متصل، وهذا مقصود ومعلَن.**

- الواجهة **لا** تتصل بأي مزوّد ولا تحمل أي مفتاح: لا يوجد `VITE_AI_*_KEY`، وكل شيء يمر عبر
  `POST {VITE_AI_URL | نفس الأصل}/api/ai/chat` ببروتوكول SSE.
- ثلاث حالات فقط للمساعد: `server` (بوابة مهيّأة) · `dev` (مساعد تطويري قائم على قواعد،
  موسوم في الواجهة) · `disabled` (لا يظهر أي زر — الموقع يعمل كاملًا بلا المساعد).
  في الإنتاج بلا `VITE_AI_URL` **لا تظهر واجهة مساعد إطلاقًا** بدل واجهة كاذبة.
- الأدوات (27) تُنفَّذ عبر نفس خدمات الموقع (`src/services/ai/tools.ts`): كتالوج، بحث، توفر،
  مقارنة، صور، توافق، صيانة، مواعيد خدمة، طلبات، ضمان، إرجاع، معرفة، حاسبة، مستشار المياه.
  الأدوات الحسّاسة (حجز/إرجاع/ضمان) **لا تُنفَّذ** من المحادثة: تُفتح النماذج الرسمية مع تعبئة مسبقة.
- الكتل المنظّمة (14 نوعًا) تُتحقَّق مرتين (خادم + واجهة)، ومعرّف منتج غير موجود ⇒ لا بطاقة.
- الخصوصية: لا طلب لبيانات بطاقة/OTP عمدًا، تنقية البيانات الحساسة قبل الحفظ والتسجيل،
  وعدم إرسال أي محتوى محادثة في أحداث التحليلات.
- الخادم المرجعي `server/ai-server.mjs` + عقده في `server/README.md`: يعمل بمزوّد `mock`
  ويرفض المفاتيح في الواجهة، ويوضح ما ينقص لتشغيل إنتاجي حقيقي.

### ملفات المرحلة A

`src/types/ai.ts` · `src/lib/ai/{sanitize,blocks,tool-specs,attachment}.ts` ·
`src/services/ai/{knowledge,catalog-resolver,tools,devAssistant,gateway,conversation,handoff,analytics,starters}.ts` ·
`src/hooks/useAiAssistant.ts` · `src/components/ai/{AiAssistant,AiChatPanel,AiMessage,BlockCatalog,BlockSystem}.tsx` ·
`src/components/layout/AppLayout.tsx` (تحميل كسول) · `src/services/analytics/types.ts` (18 حدث `ai_*`) ·
`server/{ai-server.mjs,README.md}` · `vite.config.ts` (بروكسي `/api/ai`) · `.env.*` (كتلة `VITE_AI_*`).

### اختبارات المرحلة A

- `tests/unit/ai-dev-assistant.test.ts` (13 اختبارًا): سيناريو القبول الأول، صدق الأسعار،
  منع اختلاق المنتجات، رفض بيانات البطاقة، مقاومة حقن التعليمات، وعدم الادّعاء بإزالة 100%.
- `tests/integration/ai-assistant.test.tsx` (4 اختبارات): عدم الفتح التلقائي، وسم الوضع التجريبي،
  البثّ، وبطاقات منتجات مرتبطة بالكتالوج الحقيقي.

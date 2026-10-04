# REWAA Storefront

واجهة متجر **رواء | REWAA** المبنية بـ React 19 + TypeScript + Vite + Tailwind CSS، مع كتالوج المنتجات والخدمات والحاسبة الذكية ومركز الصيانة ومساعد رواء التجريبي.

> هذه النسخة هي نقطة البداية المقترحة قبل إضافة Backend / Admin / PostgreSQL. لا تحتوي على مفاتيح سرية أو `node_modules` أو ملفات build.

## المتطلبات

- Node.js 22 LTS
- npm 10+

## التشغيل المحلي

```bash
npm ci
npm run dev
```

يفتح Vite افتراضيًا على `http://localhost:5173`.

## الفحص الكامل

```bash
npm run verify
```

يتضمن TypeScript وESLint واختبارات Vitest وفحص الروابط والبناء وفحص المسارات.

اختبارات المتصفح منفصلة:

```bash
npm run test:e2e:install
npm run test:e2e
```

## ملفات البيئة

- `.env.development`: تشغيل محلي ببيانات تجريبية.
- `.env.demo`: معاينة لأصحاب المصلحة ببيانات تجريبية معلّمة بوضوح.
- `.env.staging`: إعدادات Staging.
- `.env.production`: قالب Production بدون Mock fallback.
- `.env.example`: مرجع المتغيرات.

لا تضع أي Secret في متغير يبدأ بـ `VITE_` لأنه يصل إلى المتصفح.

قبل الإطلاق الفعلي يجب ضبط API والدفع وبيانات النشاط الرسمية. راجع `REPORT.md` و`src/config/site.ts`.

## مساعد رواء

المساعد الحالي يملك **Phase A** فقط كما هو موثق في `REPORT.md` و`server/README.md`. الوضع التجريبي يعمل بقواعد محلية وموسوم بوضوح، أما ربط مزود AI حقيقي وTool Calling كامل فيؤجل إلى مرحلة لاحقة بعد إنشاء Backend الحقيقي.

تشغيل البوابة المرجعية محليًا:

```bash
npm run ai:gateway
```

## البنية الأساسية

```text
src/        واجهة المتجر والمكونات والخدمات والبيانات الحالية
server/     بوابة AI المرجعية الحالية
scripts/    البناء وSEO وفحوصات الروابط والمسارات
public/     الأصول العامة
tests/      unit / integration / e2e
```

## المرحلة التالية

الخطة المقترحة هي تحويل المستودع إلى Monorepo وإضافة Commerce Backend + PostgreSQL + Admin Dashboard، مع إبقاء الـStorefront الحالي مستقرًا ثم ربطه تدريجيًا بالـAPI الحقيقي.

## أوامر GitHub لأول رفع

بعد فك الضغط داخل مجلد المشروع:

```bash
git init
git add .
git commit -m "Initial REWAA storefront"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

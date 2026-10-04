import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Product, ProductQuestion } from "@/types/product";
import { questionsApi } from "@/services/api";
import { formatRelativeDate } from "@/lib/format";
import { useStore } from "@/store/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

export function QuestionsSection({ product }: { product: Product }) {
  const { pushToast } = useStore();
  const [items, setItems] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ question: "", author: "" });
  const [submitting, setSubmitting] = useState(false);
  const [helpful, setHelpful] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await questionsApi.list(product.id));
    } catch {
      setError("تعذّر تحميل أسئلة العملاء.");
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.question.trim().length < 8) {
      pushToast({ tone: "warning", title: "اكتب سؤالًا أوضح (8 أحرف على الأقل)" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await questionsApi.ask(product.id, draft);
      setItems((prev) => [created, ...prev]);
      setDraft({ question: "", author: "" });
      setFormOpen(false);
      pushToast({
        tone: "success",
        title: "تم إرسال سؤالك",
        description: "سيجيبك البائع أو فريق رواء خلال 24 ساعة.",
      });
    } catch {
      pushToast({ tone: "error", title: "تعذّر إرسال السؤال", description: "حاول مرة أخرى بعد قليل." });
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (question: ProductQuestion) => {
    if (helpful[question.id]) return;
    setHelpful((prev) => ({ ...prev, [question.id]: true }));
    setItems((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, helpfulCount: q.helpfulCount + 1 } : q))
    );
    try {
      await questionsApi.markHelpful(question.id);
    } catch {
      setHelpful((prev) => ({ ...prev, [question.id]: false }));
      setItems((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, helpfulCount: Math.max(0, q.helpfulCount - 1) } : q))
      );
    }
  };

  const answered = items.filter((q) => q.answer).length;

  return (
    <section id="questions" className="scroll-mt-24">
      <SectionHeading
        eyebrow="قبل أن تشتري"
        title="أسئلة العملاء"
        description={`${answered} من ${items.length} سؤالًا تمت الإجابة عليه بواسطة البائع أو فريق رواء.`}
        action={
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            aria-expanded={formOpen}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink-950 px-3.5 py-2 text-[12.5px] font-semibold text-aqua-200 transition hover:bg-ink-900"
          >
            <Icon name="message" size={15} />
            اطرح سؤالًا
          </button>
        }
      />

      {formOpen && (
        <form onSubmit={submit} className="mb-4 rounded-xl border border-ink-100 bg-surface p-4 shadow-card animate-slide-up">
          <label htmlFor="q-text" className="mb-1.5 block text-[12.5px] font-bold text-ink-800">
            سؤالك حول المنتج
          </label>
          <textarea
            id="q-text"
            rows={3}
            required
            value={draft.question}
            onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
            placeholder="مثال: هل يناسب الاستخدام في الصيف؟"
            className="w-full resize-y rounded-md border border-ink-200 bg-surface p-3 text-[13px] leading-6 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={draft.author}
              onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
              placeholder="اسمك (اختياري)"
              aria-label="اسمك"
              className="h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-52"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-700 px-4 text-[13px] font-bold text-white transition hover:bg-brand-800 disabled:opacity-70"
            >
              {submitting && <Icon name="refresh" size={15} className="animate-spin-slow" />}
              {submitting ? "جارٍ الإرسال…" : "إرسال السؤال"}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-ink-100 bg-surface p-4">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-6 text-center">
          <p className="font-display text-[14px] font-bold text-ink-900">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ink-950 px-4 py-2 text-[12.5px] font-semibold text-aqua-200 transition hover:bg-ink-900"
          >
            <Icon name="refresh" size={14} />
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink-50 text-ink-300">
            <Icon name="message" size={22} />
          </span>
          <p className="mt-3 font-display text-[15px] font-bold text-ink-900">لا توجد أسئلة بعد</p>
          <p className="mt-1 text-[12.5px] text-ink-500">كن أول من يسأل عن هذا المنتج — نجيب خلال 24 ساعة.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ink-950 font-display text-[13px] font-bold text-aqua-300">
                  س
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-6 text-ink-900">{item.question}</p>
                  <p className="mt-1 text-[11.5px] text-ink-400">
                    {item.author}
                    {item.city ? ` · ${item.city}` : ""} · {formatRelativeDate(item.createdAt)}
                  </p>
                </div>
              </div>

              {item.answer ? (
                <div className="mt-3 flex items-start gap-3 rounded-lg bg-brand-50/50 p-3 ring-1 ring-inset ring-brand-100">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-700 font-display text-[13px] font-bold text-white">
                    ج
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-brand-900">{item.answer.answeredBy}</p>
                    <p className="mt-1 text-[13px] leading-6 text-ink-700">{item.answer.body}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{formatRelativeDate(item.answer.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-warning">
                  <Icon name="clock" size={13} />
                  بانتظار إجابة البائع
                </p>
              )}

              <button
                type="button"
                onClick={() => void markHelpful(item)}
                aria-pressed={Boolean(helpful[item.id])}
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition active:scale-95",
                  helpful[item.id]
                    ? "border-brand-300 bg-brand-50 text-brand-800"
                    : "border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-800"
                )}
              >
                <Icon name="thumbUp" size={13} filled={Boolean(helpful[item.id])} />
                هل كانت الإجابة مفيدة؟ ({item.helpfulCount})
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

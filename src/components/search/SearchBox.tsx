import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SearchSuggestion } from "@/types/catalog";
import { POPULAR_SEARCHES, searchApi, searchHistory } from "@/services/searchApi";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

/** Highlights the matched part of a suggestion label. */
function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (term.length < 2) return <>{text}</>;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-aqua-50 px-0.5 text-ink-950">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

const KIND_META: Record<SearchSuggestion["kind"], { icon: "search" | "layers" | "tag" | "file" | "headset" | "package"; label: string }> = {
  product: { icon: "package", label: "منتج" },
  category: { icon: "layers", label: "قسم" },
  brand: { icon: "tag", label: "علامة" },
  guide: { icon: "file", label: "مقال" },
  service: { icon: "headset", label: "خدمة" },
  term: { icon: "search", label: "بحث" },
};

/** Header search trigger + overlay with suggestions, recent and keyboard navigation. */
export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [history, setHistory] = useState<string[]>(() => searchHistory.read());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestId = useRef(0);

  /* Cmd/Ctrl + K opens the palette from anywhere. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(-1);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      searchApi
        .suggest(term)
        .then((items) => {
          if (id === requestId.current) setSuggestions(items);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const flatItems = useMemo(() => suggestions, [suggestions]);

  const go = useCallback(
    (href: string, record?: string) => {
      if (record) setHistory(searchHistory.push(record));
      setOpen(false);
      setQuery("");
      navigate(href);
    },
    [navigate]
  );

  const submit = (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    go(`/search?q=${encodeURIComponent(clean)}`, clean);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, flatItems.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && flatItems[active]) go(flatItems[active].href, flatItems[active].label);
      else submit(query);
    }
  };

  const showHistory = query.trim().length < 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ابحث في المتجر"
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-ink-200 bg-paper px-3 text-[12.5px] text-ink-500 transition hover:border-ink-300 hover:bg-ink-50",
          className
        )}
      >
        <Icon name="search" size={16} />
        <span className="hidden lg:inline">ابحث عن نظام أو شمعة…</span>
        <kbd className="ms-1 hidden items-center rounded border border-ink-200 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 lg:inline-flex">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="البحث في المتجر">
          <button
            type="button"
            aria-label="إغلاق البحث"
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-x-0 top-0 mx-auto w-full max-w-2xl px-3 pt-[10vh]">
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-pop">
              <div className="flex items-center gap-2 border-b border-ink-100 px-3.5 py-3">
                <Icon name="search" size={18} className="shrink-0 text-ink-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="اكتب اسم المنتج أو القسم أو رقم الموديل…"
                  aria-label="كلمة البحث"
                  className="h-7 w-full bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="مسح البحث"
                    className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-ink-100"
                  >
                    <Icon name="close" size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="hidden shrink-0 rounded-md border border-ink-200 px-2 py-1 text-[11px] text-ink-500 sm:block"
                >
                  إغلاق
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {loading && flatItems.length === 0 && (
                  <div className="space-y-1.5 p-2">
                    {[0, 1, 2].map((key) => (
                      <div key={key} className="skeleton h-11 rounded-lg" />
                    ))}
                  </div>
                )}

                {!loading && !showHistory && flatItems.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <p className="text-[13px] font-bold text-ink-800">لا توجد نتائج مطابقة</p>
                    <p className="mt-1 text-[12px] text-ink-500">جرّب كلمة أقصر، أو ابحث برقم الموديل، أو تصفّح الأقسام.</p>
                    <Link
                      to="/product-finder"
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-[12px] font-bold text-white"
                    >
                      استخدم أداة اختيار المنتج
                    </Link>
                  </div>
                )}

                {flatItems.length > 0 && (
                  <ul role="listbox" aria-label="اقتراحات البحث">
                    {flatItems.map((item, index) => {
                      const meta = KIND_META[item.kind];
                      return (
                        <li key={`${item.kind}-${item.id}`} role="option" aria-selected={index === active}>
                          <Link
                            to={item.href}
                            onClick={() => go(item.href, item.label)}
                            onMouseEnter={() => setActive(index)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
                              index === active ? "bg-brand-50" : "hover:bg-ink-50"
                            )}
                          >
                            {item.image ? (
                              <img src={item.image} alt="" className="size-9 shrink-0 rounded-md object-cover" />
                            ) : (
                              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-ink-50 text-ink-500">
                                <Icon name={meta.icon} size={16} />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-ink-900">
                                <Highlight text={item.label} query={query} />
                              </span>
                              {item.meta && <span className="block truncate text-[11.5px] text-ink-500">{item.meta}</span>}
                            </span>
                            <span className="shrink-0 text-[10.5px] font-semibold text-ink-400">{meta.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {showHistory && (
                  <div className="p-1.5">
                    {history.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-[11.5px] font-bold text-ink-500">بحث سابق</p>
                          <button
                            type="button"
                            onClick={() => {
                              searchHistory.clear();
                              setHistory([]);
                            }}
                            className="text-[11px] text-ink-400 hover:text-danger"
                          >
                            مسح
                          </button>
                        </div>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                          {history.map((term) => (
                            <li key={term}>
                              <button
                                type="button"
                                onClick={() => submit(term)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-paper px-2.5 py-1 text-[11.5px] text-ink-600 hover:border-ink-300"
                              >
                                <Icon name="refresh" size={12} />
                                {term}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="px-2 text-[11.5px] font-bold text-ink-500">الأكثر بحثًا</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                      {POPULAR_SEARCHES.map((term) => (
                        <li key={term}>
                          <button
                            type="button"
                            onClick={() => submit(term)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 hover:bg-aqua-50 hover:text-aqua-800"
                          >
                            <Icon name="search" size={12} />
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 border-t border-ink-100 p-2">
                      <Link
                        to="/product-finder"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-ink-50"
                      >
                        <span className="grid size-9 place-items-center rounded-md bg-aqua-50 text-aqua-700">
                          <Icon name="sparkles" size={16} />
                        </span>
                        <span>
                          <span className="block text-[12.5px] font-bold text-ink-900">أداة اختيار المنتج</span>
                          <span className="block text-[11.5px] text-ink-500">أجب عن أسئلة قصيرة لنرشّح النظام المناسب</span>
                        </span>
                        <Icon name="chevronLeft" size={15} className="ms-auto text-ink-300" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-ink-100 bg-paper px-3.5 py-2 text-[11px] text-ink-400">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-ink-200 bg-surface px-1">↑</kbd>
                    <kbd className="rounded border border-ink-200 bg-surface px-1">↓</kbd>
                    للتنقل
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-ink-200 bg-surface px-1">Enter</kbd>
                    للاختيار
                  </span>
                </span>
                <span>Esc للإغلاق</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

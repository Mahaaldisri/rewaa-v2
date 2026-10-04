import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/StoreProvider";
import { useAuth } from "@/store/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { HeaderSearch } from "@/components/search/SearchBox";
import { Logo } from "@/components/brand/Logo";
import { formatMoney } from "@/lib/format";
import { cn } from "@/utils/cn";

const NAV: { label: string; href: string; accent?: boolean; service?: boolean }[] = [
  { label: "فلاتر المياه", href: "/c/water-filters" },
  { label: "الشمعات وقطع الغيار", href: "/c/cartridges" },
  { label: "أجهزة التحلية", href: "/c/desalination" },
  { label: "المضخات والمعدات", href: "/c/pumps-equipment" },
  { label: "خدمات الصيانة", href: "/services/maintenance", service: true },
  { label: "العروض", href: "/offers", accent: true },
];

export function SiteHeader() {
  const { cartCount, cartTotal, cartBump, wishlist, compare } = useStore();
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  /* Reading progress — written straight to the DOM so scrolling never triggers a render. */
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${ratio})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-ink-100 bg-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/72">
        <div className="container-x flex h-[var(--header-h)] items-center gap-3 lg:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="القائمة"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-ink-200 text-ink-700 transition hover:border-ink-300 hover:bg-ink-50 lg:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} size={18} />
          </button>

          <Logo />

          <nav aria-label="التصنيفات الرئيسية" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  item.accent
                    ? "text-danger hover:bg-danger-soft"
                    : item.service
                      ? "text-flow-700 hover:bg-flow-50"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
                )}
              >
                {item.label}
                {item.accent && (
                  <span className="absolute -top-0.5 end-1 size-1.5 animate-pulse rounded-full bg-danger" />
                )}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5 lg:gap-2">
            <HeaderSearch className="hidden sm:flex" />
            <Link
              to="/services/book"
              className="hidden items-center gap-1.5 rounded-md border border-flow-200 bg-flow-50 px-3 py-1.5 text-[12px] font-bold text-flow-700 transition hover:border-flow-300 hover:bg-flow-100 xl:inline-flex"
            >
              <Icon name="headset" size={14} />
              احجز فني صيانة
            </Link>

            <div className="hidden xl:block">
              <ScenarioSwitcher />
            </div>

            <Link
              to={isAuthenticated ? "/account" : "/login"}
              aria-label={isAuthenticated ? `حسابي — ${user?.name}` : "تسجيل الدخول"}
              className="relative hidden size-9 place-items-center rounded-md text-ink-600 transition hover:bg-ink-50 hover:text-ink-950 sm:grid"
            >
              {isAuthenticated && user ? (
                <span className="grid size-6 place-items-center rounded-full bg-ink-950 text-[10px] font-bold text-aqua-300">
                  {user.name.slice(0, 1)}
                </span>
              ) : (
                <Icon name="user" size={19} />
              )}
            </Link>

            <Link
              to="/compare"
              aria-label={`قائمة المقارنة (${compare.length})`}
              className="relative hidden size-9 place-items-center rounded-md text-ink-600 transition hover:bg-ink-50 hover:text-ink-950 sm:grid"
            >
              <Icon name="compare" size={19} />
              {compare.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid size-[17px] place-items-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                  {compare.length}
                </span>
              )}
            </Link>

            <Link
              to="/wishlist"
              aria-label={`المفضلة (${wishlist.length})`}
              className="relative grid size-9 place-items-center rounded-md text-ink-600 transition hover:bg-ink-50 hover:text-ink-950"
            >
              <Icon name="heart" size={19} />
              {wishlist.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid size-[17px] place-items-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className={cn(
                "flex items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-white transition hover:bg-ink-800",
                cartBump && "cart-bump"
              )}
              aria-label={`سلة التسوق، ${cartCount} منتجات، الإجمالي ${formatMoney(cartTotal)}`}
            >
              <span className="relative">
                <Icon name="cart" size={19} />
                {cartCount > 0 && (
                  <span className="absolute -end-2 -top-2 grid min-w-[17px] place-items-center rounded-full bg-aqua-400 px-1 text-[10px] font-extrabold text-ink-950">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="hidden text-[12.5px] font-semibold tabular-nums md:inline">
                {formatMoney(cartTotal)}
              </span>
            </Link>
          </div>
        </div>

        {/* Reading progress (RTL: grows from the start edge) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden" aria-hidden="true">
          <div
            ref={progressRef}
            className="aqua-rule h-full w-full origin-right scale-x-0 transition-transform duration-150 ease-out"
          />
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        className={cn(
          "overflow-hidden border-b border-ink-100 bg-surface transition-[max-height,opacity] duration-300 lg:hidden",
          menuOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav aria-label="التصنيفات الرئيسية" className="container-x flex flex-col py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between border-b border-ink-100 py-3 text-sm font-medium text-ink-700 last:border-b-0"
            >
              {item.label}
              <Icon name="chevronLeft" size={16} className="text-ink-300" />
            </Link>
          ))}
          <Link
            to={isAuthenticated ? "/account" : "/login"}
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-between border-b border-ink-100 py-3 text-sm font-medium text-ink-700"
          >
            {isAuthenticated ? "حسابي" : "تسجيل الدخول"}
            <Icon name="chevronLeft" size={16} className="text-ink-300" />
          </Link>
          <div className="border-b border-ink-100 py-3">
            <HeaderSearch className="w-full justify-start" />
          </div>
          <div className="pt-3">
            <ScenarioSwitcher />
          </div>
        </nav>
      </div>
    </header>
  );
}

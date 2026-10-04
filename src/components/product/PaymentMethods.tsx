import type { PaymentMethod } from "@/types/product";
import { Icon } from "@/components/ui/Icon";
import { payments } from "@/services/payments";
import { cn } from "@/utils/cn";

/**
 * Payment glyphs are hand-drawn placeholders (no third-party logo assets or
 * network requests). Replace the `GLYPHS` map with official brand assets once
 * the payment provider integration is signed off.
 */
type GlyphSpec = {
  label: string;
  bg: string;
  fg: string;
  mark: "text" | "circles" | "wave" | "apple" | "g" | "truck";
  wide?: boolean;
};

const GLYPHS: Record<string, GlyphSpec> = {
  mada: { label: "mada", bg: "#0b3d91", fg: "#ffffff", mark: "wave" },
  visa: { label: "VISA", bg: "#14204a", fg: "#ffffff", mark: "text" },
  mastercard: { label: "Mastercard", bg: "#141a1f", fg: "#ffffff", mark: "circles" },
  amex: { label: "AMEX", bg: "#1f72cf", fg: "#ffffff", mark: "text" },
  applepay: { label: " Pay", bg: "#0a0a0a", fg: "#ffffff", mark: "apple", wide: true },
  googlepay: { label: "Pay", bg: "#ffffff", fg: "#3c4043", mark: "g", wide: true },
  stcpay: { label: "stc pay", bg: "#4a2a7a", fg: "#ffffff", mark: "text" },
  tabby: { label: "tabby", bg: "#d9fbe9", fg: "#0f5c3c", mark: "text" },
  tamara: { label: "tamara", bg: "#fdeaf1", fg: "#a02257", mark: "text" },
  cod: { label: "عند الاستلام", bg: "#eef3f9", fg: "#2a3a51", mark: "truck", wide: true },
  bank: { label: "تحويل بنكي", bg: "#eef3f9", fg: "#2a3a51", mark: "truck", wide: true },
};

function GlyphMark({ spec }: { spec: GlyphSpec }) {
  switch (spec.mark) {
    case "circles":
      return (
        <svg viewBox="0 0 26 16" className="h-3.5 w-auto" aria-hidden="true">
          <circle cx="10" cy="8" r="6.4" fill="#eb001b" />
          <circle cx="16" cy="8" r="6.4" fill="#f79e1b" fillOpacity="0.92" />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 34 16" className="h-3.5 w-auto" aria-hidden="true" fill="none">
          <path d="M2 10.5c3.2-4.6 6.4-4.6 9.6 0s6.4 4.6 9.6 0 6.4-4.6 9.6 0" stroke="#4fd1c5" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 16 18" className="h-3.5 w-auto" aria-hidden="true" fill="currentColor">
          <path d="M11.3 9.4c0-2 1.6-2.9 1.7-3-0.9-1.4-2.4-1.5-2.9-1.6-1.2-0.1-2.3 0.7-2.9 0.7-0.6 0-1.5-0.7-2.5-0.7C3.3 4.9 2 6 2 8.2c0 1.4 0.5 2.8 1.2 3.8 0.6 0.9 1.3 1.6 2.2 1.6 0.8 0 1.2-0.6 2.2-0.6s1.3 0.6 2.2 0.6c0.9 0 1.5-0.7 2.1-1.5 0.4-0.6 0.7-1.2 0.9-1.8-1.6-0.6-2.7-2-2.7-3.9zM9.9 3.6c0.5-0.6 0.8-1.4 0.7-2.2-0.7 0-1.6 0.5-2.1 1.1-0.4 0.5-0.8 1.3-0.7 2.1 0.8 0.1 1.6-0.4 2.1-1z" />
        </svg>
      );
    case "g":
      return (
        <svg viewBox="0 0 18 18" className="h-3.5 w-auto" aria-hidden="true">
          <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" fill="#4285F4" />
          <path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05" />
          <path d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6z" fill="#EA4335" />
        </svg>
      );
    case "truck":
      return <Icon name="truck" size={15} className="shrink-0" />;
    default:
      return null;
  }
}

export function PaymentGlyph({ id, className }: { id: string; className?: string }) {
  const spec = GLYPHS[id] ?? { ...GLYPHS.visa, label: id };
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[7px] px-2 ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5",
        spec.wide ? "min-w-[74px]" : "min-w-[52px]",
        spec.fg === "#ffffff" ? "ring-white/10" : "ring-ink-200/70",
        className
      )}
      style={{ backgroundColor: spec.bg, color: spec.fg }}
      title={spec.label}
    >
      <GlyphMark spec={spec} />
      {spec.mark !== "circles" && spec.mark !== "wave" && (
        <span className="text-[10.5px] font-bold leading-none tracking-tight">{spec.label}</span>
      )}
    </span>
  );
}

/** Compact row of accepted payment marks (header/footer/summary contexts). */
export function PaymentGlyphs({
  variant = "light",
  ids = ["mada", "visa", "mastercard", "applepay", "googlepay", "tabby", "tamara"],
}: {
  variant?: "light" | "dark";
  ids?: string[];
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", variant === "dark" && "[&_*]:shadow-none")}>
      {ids.map((id) => (
        <PaymentGlyph key={id} id={id} className={variant === "dark" ? "opacity-95" : undefined} />
      ))}
    </div>
  );
}

interface PaymentMethodsPanelProps {
  methods: PaymentMethod[];
  className?: string;
}

const KIND_LABEL: Record<PaymentMethod["kind"], string> = {
  card: "البطاقات البنكية",
  wallet: "المحافظ الرقمية",
  bnpl: "الدفع بالتقسيط",
  cod: "الدفع عند الاستلام",
  bank: "التحويل البنكي",
};

/** Full payment section — grouped by kind, with per-method notes and states. */
export function PaymentMethodsPanel({ methods, className }: PaymentMethodsPanelProps) {
  const groups = (["card", "wallet", "bnpl", "cod", "bank"] as const)
    .map((kind) => ({ kind, label: KIND_LABEL[kind], items: methods.filter((m) => m.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <section className={cn("rounded-lg border border-ink-100 bg-surface p-4 shadow-hair", className)}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink-900">
          <span className="grid size-7 place-items-center rounded-md bg-brand-50 text-brand-700">
            <Icon name="card" size={15} />
          </span>
          طرق الدفع المتاحة
        </h3>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
          <Icon name={payments.current().live ? "lock" : "info"} size={13} className={payments.current().live ? "text-success" : "text-ink-400"} />
          {payments.current().live ? "بوابة دفع متصلة" : payments.current().id === "demo" ? "وضع تجريبي" : "طرق الدفع المتاحة"}
        </span>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.kind}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-ink-400">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((method) => (
                <span
                  key={method.id}
                  className={cn(
                    "group/pay relative inline-flex items-center gap-1.5 rounded-md border border-ink-100 bg-ink-50/40 pe-2.5 ps-1.5 py-1 transition",
                    method.enabled ? "hover:border-brand-200 hover:bg-brand-50/60" : "opacity-55"
                  )}
                  title={method.note ?? method.nameAr}
                >
                  <PaymentGlyph id={method.id} />
                  <span className="text-[11.5px] font-medium text-ink-600">{method.nameAr}</span>
                  {!method.enabled && (
                    <span className="rounded-xs bg-ink-100 px-1 text-[9.5px] font-bold text-ink-500">قريبًا</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3.5 flex items-start gap-2 rounded-md bg-ink-50/70 p-2.5 text-[11.5px] leading-5 text-ink-500">
        <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-success" />
        تُعالج المدفوعات عبر بوابة دفع إلكترونية، ولا يُحتفظ ببيانات بطاقتك في المتجر أو على
        خوادمنا. الأسعار المعروضة شاملة ضريبة القيمة المضافة 15%.
      </p>
    </section>
  );
}

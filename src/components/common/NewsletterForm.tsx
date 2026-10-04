import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { supportApi } from "@/services/helpApi";
import { useStore } from "@/store/StoreProvider";
import { cn } from "@/utils/cn";

interface Props {
  /** `dark` is used inside the footer, `light` on content pages. */
  tone?: "dark" | "light";
  className?: string;
  compact?: boolean;
}

/**
 * Newsletter signup with real validation, loading and duplicate handling.
 * Nothing leaves the browser — the mock API stores the address locally.
 */
export function NewsletterForm({ tone = "light", className, compact = false }: Props) {
  const { pushToast } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [state, setState] = useState<"idle" | "loading" | "done" | "duplicate">("idle");

  const isDark = tone === "dark";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    if (!email.trim()) {
      setError("البريد الإلكتروني مطلوب");
      return;
    }

    setState("loading");
    try {
      const result = await supportApi.subscribe(email);
      if (result.duplicate) {
        setState("duplicate");
        pushToast({ tone: "info", title: "أنت مشترك بالفعل", description: "سنستمر بإرسال تذكيرات الصيانة والعروض." });
      } else {
        setState("done");
        pushToast({
          tone: "success",
          title: "تم الاشتراك",
          description: "سيصلك تذكير مواعيد الشمعات وأحدث العروض على بريدك.",
        });
      }
      setEmail("");
    } catch (caught) {
      setState("idle");
      const message = caught instanceof Error ? caught.message : "تعذّر إكمال الاشتراك.";
      setError(message);
    }
  };

  return (
    <form onSubmit={submit} className={cn("w-full", className)} noValidate>
      {!compact && (
        <label
          htmlFor="newsletter-email"
          className={cn("mb-2 block text-[12px] font-semibold", isDark ? "text-ink-200" : "text-ink-600")}
        >
          اشترك ليصلك تذكير مواعيد تغيير الشمعات والعروض
        </label>
      )}

      <div
        className={cn(
          "flex overflow-hidden rounded-lg transition",
          isDark ? "bg-white/5 ring-1 ring-white/10 focus-within:ring-aqua-400/60" : "border border-ink-200 bg-surface focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200"
        )}
      >
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(undefined);
            if (state !== "idle") setState("idle");
          }}
          placeholder="بريدك الإلكتروني"
          aria-label="البريد الإلكتروني"
          aria-invalid={Boolean(error)}
          disabled={state === "loading"}
          className={cn(
            "w-full bg-transparent px-3.5 py-2.5 text-[13px] focus:outline-none",
            isDark ? "text-white placeholder:text-ink-300" : "text-ink-900 placeholder:text-ink-400"
          )}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-4 text-[12.5px] font-bold transition disabled:opacity-70",
            isDark ? "bg-aqua-400 text-ink-950 hover:bg-aqua-300" : "bg-brand-700 text-white hover:bg-brand-800"
          )}
        >
          {state === "loading" ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              …
            </>
          ) : state === "done" ? (
            <>
              <Icon name="check" size={14} />
              تم
            </>
          ) : state === "duplicate" ? (
            "مشترك"
          ) : (
            "اشترك"
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-danger">
          <Icon name="alert" size={12} strokeWidth={2.2} />
          {error}
        </p>
      )}

      {!error && (state === "done" || state === "duplicate") && (
        <p className={cn("mt-1.5 flex items-center gap-1.5 text-[11.5px]", isDark ? "text-aqua-300" : "text-flow-700")}>
          <Icon name="checkCircle" size={13} />
          {state === "duplicate" ? "هذا البريد مشترك مسبقًا — لا حاجة لإعادة التسجيل." : "تم تسجيل بريدك بنجاح."}
        </p>
      )}
    </form>
  );
}

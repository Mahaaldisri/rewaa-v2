import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureException } from "@/services/monitoring";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { contact, whatsappLink } from "@/config/site";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time failures so a single broken block never blanks the store.
 * The recovery path is always actionable (reload, home, or contact the team).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console trace for developers + the monitoring adapter (inert until a
    // provider and DSN are configured through env vars).
    console.error("[REWAA] Unhandled UI error", error, info.componentStack);
    captureException(error, { componentStack: info.componentStack ?? undefined, boundary: "app" });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
        <div className="w-full max-w-lg rounded-xl border border-ink-100 bg-surface p-7 text-center shadow-hair">
          <span className="mx-auto grid size-14 place-items-center rounded-xl bg-danger-soft text-danger">
            <Icon name="alert" size={26} />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold text-ink-950">حدث خطأ غير متوقع</h1>
          <p className="mt-2 text-[13.5px] leading-7 text-ink-600">
            تعذّر عرض هذا الجزء من الصفحة. يمكنك إعادة المحاولة، وإن تكرر الخطأ تواصل معنا وسنعالجه سريعًا.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-5 text-[13px] font-bold text-white shadow-brand transition hover:bg-brand-800"
            >
              <Icon name="refresh" size={16} />
              إعادة تحميل الصفحة
            </button>
            <Link
              to="/"
              onClick={() => this.setState({ error: null })}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-bold text-ink-700 transition hover:bg-ink-50"
            >
              العودة للرئيسية
            </Link>
          </div>

          <div className="mt-6 border-t border-ink-100 pt-5 text-[12px] text-ink-500">
            <p>
              الدعم الفني:{" "}
              <a href={`tel:${contact.phone}`} className="font-bold text-ink-800">
                {contact.phoneDisplay}
              </a>{" "}
              ·{" "}
              <a
                href={whatsappLink("مرحبًا، واجهت مشكلة في الموقع وأحتاج مساعدة.")}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-flow-700"
              >
                واتساب
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }
}

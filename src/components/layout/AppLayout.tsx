import { Outlet, useLocation } from "react-router-dom";
import { env } from "@/config/env";
import { lazy, Suspense, useEffect } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { WhatsAppFab } from "./WhatsAppFab";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { DemoDataBanner } from "@/components/system/DemoDataBanner";
import { ConsentBanner } from "@/components/system/ConsentBanner";
import { AnalyticsRouteTracker } from "@/components/system/AnalyticsRouteTracker";

/** المساعد يُحمَّل عند الحاجة فقط (حزمة منفصلة). */
const AiAssistant = lazy(() =>
  import("@/components/ai/AiAssistant").then((module) => ({ default: module.AiAssistant })),
);

/** Shared chrome for every route — header/footer stay mounted across navigations. */
export function AppLayout() {
  const location = useLocation();

  // Scroll to top on every route change (checkout steps handle their own scroll).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsRouteTracker />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-aqua-300"
      >
        تخطَّ إلى المحتوى الرئيسي
      </a>

      {env.mock.forced && <DemoDataBanner />}
      <AnnouncementBar />
      <SiteHeader />

      <main id="main-content" className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <SiteFooter />
      <WhatsAppFab />
      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
      <ConsentBanner />
      <ToastViewport />
    </div>
  );
}

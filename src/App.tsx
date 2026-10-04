import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { StoreProvider } from "@/store/StoreProvider";
import { AuthProvider } from "@/store/AuthProvider";
import { router } from "@/router";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { ConfigErrorScreen } from "@/components/system/ConfigErrorScreen";
import { collectConfigIssues, fatalIssues, hasFatalIssues } from "@/config/config-checks";
import { initMonitoring } from "@/services/monitoring";

/**
 * Storefront root.
 * Routing lives in `src/router.tsx`; this component wires the global providers
 * (cart/wishlist/toasts + auth session) around the router, and refuses to render
 * the shop when the build has no usable data source in a non-development env.
 */
export default function App() {
  const issues = useMemo(() => {
    const collected = collectConfigIssues();
    initMonitoring(collected);
    return collected;
  }, []);

  if (hasFatalIssues(issues)) {
    return <ConfigErrorScreen issues={fatalIssues(issues)} />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

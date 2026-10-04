import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { reportStartupConfiguration } from "@/config/startup";
import { initAnalytics } from "@/services/analytics";

// Configuration report first, then analytics — so a bad build is reported even
// when no provider is configured.
reportStartupConfiguration();
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

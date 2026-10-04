import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions, type UserConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * بروكسي التطوير لبوابة المساعد الذكي.
 *
 * المتصفح لا يتصل أبدًا بالخادم مباشرة عبر localhost: يطلب `/api/ai/chat` من
 * نفس الأصل، وهذا البروكسي (على جهة الخادم فقط) يمرّر الطلب إلى بوابة التطوير
 * إن كانت تعمل. الإعداد: `AI_GATEWAY_PROXY_TARGET` (افتراضيًا http://127.0.0.1:8787)
 * مع `VITE_AI_URL=same-origin` في `.env.development`.
 */
function aiProxy(): Record<string, ProxyOptions> | undefined {
  if (process.env.AI_GATEWAY_PROXY === "off") return undefined;
  const target = process.env.AI_GATEWAY_PROXY_TARGET ?? "http://127.0.0.1:8787";
  return {
    "/api/ai": {
      target,
      changeOrigin: true,
      ws: false,
      // البوابة غير المشغّلة لا تكسر التطوير: نعيد حالة واضحة بدل تعليق الطلب.
      configure: (proxy) => {
        proxy.on("error", (_error, _req, res) => {
          if ("writeHead" in res && !res.headersSent) {
            res.writeHead(503, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "ai_gateway_unavailable" }));
          }
        });
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  const proxy = aiProxy();

  const config: UserConfig = {
    plugins: [react(), tailwindcss(), viteSingleFile()],
    server: {
      host: true,
      // The sandbox proxies the dev server under a *.e2b.app preview host.
      allowedHosts: true,
      ...(proxy ? { proxy } : {}),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };

  return config;
});

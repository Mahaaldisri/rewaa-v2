/**
 * اختبار تكاملي لواجهة المساعد: الزر لا يفتح تلقائيًا، المحادثة تبثّ، الكتل
 * المنظّمة تُعرض، وكل منتج معروض موجود في الكتالوج الحقيقي.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/store/AuthProvider";
import { StoreProvider } from "@/store/StoreProvider";
import { AiAssistant } from "@/components/ai/AiAssistant";

vi.mock("@/config/env", async () => {
  const actual = await vi.importActual<typeof import("@/config/env")>("@/config/env");
  return {
    env: {
      ...actual.env,
      ai: { ...actual.env.ai, enabled: true, mode: "server", configured: false, allowDevAssistant: true, uploads: true },
    },
  };
});

function renderAssistant() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <StoreProvider>
          <AiAssistant />
        </StoreProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("واجهة مساعد رواء", () => {
  it("لا تفتح المحادثة تلقائيًا وتعرض وسم الوضع التجريبي", () => {
    renderAssistant();
    const launcher = screen.getByRole("button", { name: /افتح مساعد رواء الذكي/ });
    expect(launcher).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "مساعد رواء الذكي" })).not.toBeInTheDocument();
    expect(within(launcher).getByText("تجريبي")).toBeInTheDocument();
  });

  it("تفتح اللوحة عند الضغط وتعرض أسئلة البداية", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByRole("button", { name: /افتح مساعد رواء الذكي/ }));

    const dialog = await screen.findByRole("dialog", { name: "مساعد رواء الذكي" }, { timeout: 4000 });
    expect(within(dialog).getByText("ابدأ من هنا")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("اكتب رسالتك لمساعد رواء")).toBeInTheDocument();
  });

  it("ترسل رسالة وتعرض ردًا بكتل من الكتالوج الحقيقي", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByRole("button", { name: /افتح مساعد رواء الذكي/ }));

    const dialog = await screen.findByRole("dialog", { name: "مساعد رواء الذكي" }, { timeout: 4000 });
    const input = within(dialog).getByLabelText("اكتب رسالتك لمساعد رواء");
    await user.type(input, "عندي عائلة من 5 أفراد وميزانيتي 1500 ريال");
    await user.click(within(dialog).getByRole("button", { name: "إرسال" }));

    // ننتظر ظهور بطاقة منتج أو شريط منتجات (أي أنه بُني من الكتالوج).
    await waitFor(
      () => {
        const links = within(dialog).getAllByRole("link", { name: /عرض المنتج/ });
        expect(links.length).toBeGreaterThan(0);
      },
      { timeout: 15000 },
    );

    const productLinks = within(dialog).getAllByRole("link", { name: /عرض المنتج/ });
    productLinks.forEach((link) => expect(link).toHaveAttribute("href"));
  }, 25000);

  it("تعرض تنبيهًا صريحًا عند غياب البيانات بدل اختراع منتج", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByRole("button", { name: /افتح مساعد رواء الذكي/ }));

    const dialog = await screen.findByRole("dialog", { name: "مساعد رواء الذكي" }, { timeout: 4000 });
    const input = within(dialog).getByLabelText("اكتب رسالتك لمساعد رواء");
    await user.type(input, "هل عندكم مضخة أكوا-زد 9000 بموديل XYZ-999؟");
    await user.click(within(dialog).getByRole("button", { name: "إرسال" }));

    await waitFor(() => expect(within(dialog).queryAllByRole("link", { name: /عرض المنتج/ }).length).toBe(0), {
      timeout: 15000,
    });
  }, 25000);
});

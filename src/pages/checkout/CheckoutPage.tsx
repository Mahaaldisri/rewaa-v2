import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Address } from "@/types/auth";
import type { PaymentMethodId, ShippingMethodId } from "@/types/order";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { ordersApi } from "@/services/api";
import { ApiError } from "@/types/product";
import { computeCartTotals } from "@/lib/cart-logic";
import { getGuestToken } from "@/lib/localStore";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import { AddressStep } from "@/components/checkout/AddressStep";
import { ShippingStep } from "@/components/checkout/ShippingStep";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { ReviewStep } from "@/components/checkout/ReviewStep";
import { PaymentProcessingModal } from "@/components/checkout/PaymentProcessingModal";
import { Icon } from "@/components/ui/Icon";
import { usePageSeo } from "@/lib/seo";
import { track } from "@/services/analytics";
import { itemFromCartLine } from "@/services/analytics/map";
import { captureMessage } from "@/services/monitoring";
import { legal } from "@/config/site";

const STEPS = [
  { id: "address", label: "الشحن", icon: "mapPin" as const },
  { id: "shipping", label: "التوصيل", icon: "truck" as const },
  { id: "payment", label: "الدفع", icon: "card" as const },
  { id: "review", label: "التأكيد", icon: "check" as const },
];

export function CheckoutPage() {
  usePageSeo({
    title: "إتمام الطلب | رواء",
    description: "أكمل بيانات الشحن والدفع لإتمام طلبك.",
    canonical: "/checkout",
    robots: "noindex, nofollow",
  });
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, couponCode, clearCart, pushToast } = useStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [completedIndex, setCompletedIndex] = useState(0);

  const [address, setAddress] = useState<Address | null>(null);
  const [guestEmail, setGuestEmail] = useState("");

  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>("standard");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("شحن قياسي");
  const [shippingChosen, setShippingChosen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [paymentLabel, setPaymentLabel] = useState("");
  /** Opaque gateway token returned by the payment provider — never card data. */
  const [paymentTokenId, setPaymentTokenId] = useState<string | undefined>();
  const [paymentIsTest, setPaymentIsTest] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [paymentFailure, setPaymentFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cart.length === 0 && !processing) {
      navigate("/cart", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  const totals = computeCartTotals(cart, couponCode, shippingChosen ? shippingCost : undefined);
  const currencyLabel = legal.currency;
  const cartItems = cart.map(itemFromCartLine);

  /* Funnel events. All of them are consent-gated inside the analytics facade. */
  useEffect(() => {
    track("begin_checkout", {
      currency: currencyLabel,
      value: totals.total,
      coupon: totals.coupon?.code,
      items: cartItems,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (index: number) => {
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advance = (index: number) => {
    setCompletedIndex((prev) => Math.max(prev, index));
    goTo(index);
  };

  const finalizeOrder = async () => {
    if (!address || !paymentMethod) return;
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        items: cart.map(({ id: _id, ...rest }) => rest),
        address,
        shippingMethod,
        shippingLabel,
        shippingCost: totals.shippingCost,
        paymentMethod,
        paymentLabel,
        paymentTokenId,
        couponCode: totals.coupon?.code,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatIncluded: totals.vatIncluded,
        total: totals.total,
        userId: user?.id,
        guestEmail: isAuthenticated ? undefined : guestEmail || undefined,
      });
      if (!isAuthenticated) {
        // Guest orders are still retrievable later via the stable browser token.
        getGuestToken();
      }
      track("purchase", {
        transaction_id: order.id,
        currency: currencyLabel,
        value: totals.total,
        tax: totals.vatIncluded,
        shipping: totals.shippingCost,
        coupon: totals.coupon?.code,
        items: cartItems,
      });
      if (paymentIsTest) {
        captureMessage("purchase completed with the demo payment provider", "warning", { orderId: order.id });
      }
      clearCart();
      navigate(`/order/${order.id}`, { replace: true });
    } catch (error) {
      setPaymentFailure(error instanceof ApiError ? error.message : "حاول مرة أخرى أو اختر وسيلة دفع أخرى.");
      pushToast({
        tone: "error",
        title: "تعذّر إتمام عملية الدفع",
        description: "الطلب لم يُنشأ — يمكنك إعادة المحاولة الآن.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) return null;

  return (
    <div className="bg-ambient">
      <div className="container-x py-5 sm:py-7">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "سلة التسوق", href: "/cart" },
            { label: "إتمام الطلب", href: "/checkout" },
          ]}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold text-ink-950">إتمام الطلب</h1>
          <Link to="/cart" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-500 transition hover:text-brand-700">
            <Icon name="arrowRight" size={14} />
            العودة للسلة
          </Link>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <CheckoutStepper steps={STEPS} activeIndex={stepIndex} completedIndex={completedIndex} onStepClick={goTo} />

            <div className="rounded-2xl border border-ink-100 bg-surface/60 p-4 shadow-hair sm:p-5">
              {stepIndex === 0 && (
                <AddressStep
                  selectedAddress={address}
                  onSelect={setAddress}
                  guestEmail={guestEmail}
                  onGuestEmailChange={setGuestEmail}
                  onContinue={() => advance(1)}
                />
              )}

              {stepIndex === 1 && address && (
                <ShippingStep
                  address={address}
                  orderValue={totals.subtotal - totals.discount}
                  selected={shippingMethod}
                  onSelect={(id, cost, label) => {
                    setShippingMethod(id);
                    setShippingCost(cost);
                    setShippingLabel(label);
                    setShippingChosen(true);
                    track("add_shipping_info", {
                      currency: currencyLabel,
                      value: totals.total,
                      shipping_tier: label,
                      items: cartItems,
                    });
                  }}
                  onBack={() => goTo(0)}
                  onContinue={() => advance(2)}
                />
              )}

              {stepIndex === 2 && (
                <PaymentStep
                  total={totals.total}
                  onBack={() => goTo(1)}
                  onContinue={(id, label, token) => {
                    setPaymentMethod(id);
                    setPaymentLabel(label);
                    setPaymentTokenId(token.id);
                    setPaymentIsTest(token.test);
                    track("add_payment_info", {
                      currency: currencyLabel,
                      value: totals.total,
                      payment_type: id,
                      items: cartItems,
                    });
                    advance(3);
                  }}
                />
              )}

              {stepIndex === 3 && address && paymentMethod && (
                <ReviewStep
                  address={address}
                  shippingLabel={shippingLabel}
                  shippingCost={totals.shippingCost}
                  paymentMethod={paymentMethod}
                  paymentLabel={paymentLabel}
                  total={totals.total}
                  onEditAddress={() => goTo(0)}
                  onEditShipping={() => goTo(1)}
                  onEditPayment={() => goTo(2)}
                  onConfirm={() => setProcessing(true)}
                  submitting={submitting}
                />
              )}
            </div>
          </div>

          <OrderSummaryCard items={cart} totals={totals} className="lg:sticky lg:top-[calc(var(--header-h)+16px)]" />
        </div>
      </div>

      <PaymentProcessingModal
        open={processing}
        onDone={finalizeOrder}
        failure={paymentFailure}
        onRetry={() => {
          setPaymentFailure(null);
          void finalizeOrder();
        }}
        onBack={() => {
          setPaymentFailure(null);
          setProcessing(false);
          goTo(2);
        }}
      />
    </div>
  );
}

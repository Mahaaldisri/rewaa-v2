import type { Address } from "./auth";

export type PaymentMethodId =
  | "mada"
  | "visa"
  | "mastercard"
  | "applepay"
  | "googlepay"
  | "stcpay"
  | "tabby"
  | "tamara"
  | "cod"
  | "bank";

export type ShippingMethodId = "standard" | "express" | "same_day" | "pickup";

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  selectionLabel: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

export type OrderStatus = "processing" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  at?: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  items: OrderItem[];
  address: Address;
  shippingMethod: ShippingMethodId;
  shippingLabel: string;
  paymentMethod: PaymentMethodId;
  paymentLabel: string;
  /** Opaque gateway token. Never contains card data; absent for COD/bank. */
  paymentTokenId?: string;
  couponCode?: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  vatIncluded: number;
  total: number;
  createdAt: string;
  estimatedDeliveryFrom: string;
  estimatedDeliveryTo: string;
  timeline: OrderTimelineStep[];
  userId?: string;
  guestEmail?: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  address: Address;
  shippingMethod: ShippingMethodId;
  shippingLabel: string;
  shippingCost: number;
  paymentMethod: PaymentMethodId;
  paymentLabel: string;
  /** Opaque token from the payment provider (no PAN, no CVV). */
  paymentTokenId?: string;
  couponCode?: string;
  subtotal: number;
  discount: number;
  vatIncluded: number;
  total: number;
  userId?: string;
  guestEmail?: string;
}

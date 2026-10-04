import type { Address, User } from "@/types/auth";
import type { Order } from "@/types/order";
import { mockProduct } from "./mockProduct";
import { photo } from "./images";

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

/** Demo account — mentioned on the login screen so reviewers can sign in instantly. */
export const DEMO_CREDENTIALS = { email: "demo@rewaa.sa", password: "123456" };

export const DEMO_USER: User = {
  id: "usr_demo_001",
  name: "سارة العتيبي",
  email: DEMO_CREDENTIALS.email,
  phone: "0551234567",
  createdAt: daysAgo(210),
};

export const DEMO_ADDRESSES: Address[] = [
  {
    id: "addr_1",
    label: "المنزل",
    fullName: "سارة العتيبي",
    phone: "0551234567",
    cityId: "riyadh",
    cityName: "الرياض",
    district: "حي الملقا",
    street: "شارع الأمير متعب بن عبدالعزيز",
    buildingNo: "4821",
    additionalInfo: "فيلا بوابة سوداء، بجانب صيدلية النهدي",
    isDefault: true,
  },
  {
    id: "addr_2",
    label: "العمل",
    fullName: "سارة العتيبي",
    phone: "0551234567",
    cityId: "riyadh",
    cityName: "الرياض",
    district: "حي العليا",
    street: "طريق الملك فهد",
    buildingNo: "22",
    additionalInfo: "برج الأعمال، الدور السابع",
    isDefault: false,
  },
];

const sampleItems = (over: Partial<Order["items"][number]> = {}) => [
  {
    productId: mockProduct.id,
    variantId: "var-pearl-white-s7",
    sku: "RWA-RO7-PEA",
    name: mockProduct.name,
    selectionLabel: "أبيض لؤلؤي • 7 مراحل",
    unitPrice: 1290,
    quantity: 1,
    image: photo(36847822, 200, 200),
    ...over,
  },
];

export const DEMO_ORDERS: Order[] = [
  {
    id: "ord_1001",
    number: "RWA-20260110-1001",
    status: "delivered",
    items: sampleItems(),
    address: DEMO_ADDRESSES[0],
    shippingMethod: "standard",
    shippingLabel: "شحن قياسي",
    paymentMethod: "mada",
    paymentLabel: "مدى •••• 4512",
    subtotal: 1290,
    discount: 0,
    shippingCost: 0,
    vatIncluded: 168.26,
    total: 1290,
    createdAt: daysAgo(52),
    estimatedDeliveryFrom: daysAgo(50),
    estimatedDeliveryTo: daysAgo(49),
    timeline: [
      { status: "confirmed", label: "تم تأكيد الطلب", at: daysAgo(52) },
      { status: "preparing", label: "جارٍ تجهيز الطلب", at: daysAgo(51) },
      { status: "shipped", label: "تم شحن الطلب", at: daysAgo(50) },
      { status: "delivered", label: "تم التسليم", at: daysAgo(49) },
    ],
    userId: DEMO_USER.id,
  },
  {
    id: "ord_1002",
    number: "RWA-20260224-1002",
    status: "shipped",
    items: sampleItems({
      name: "طقم شمعات بديلة 3 مراحل – 10 إنش",
      sku: "RWA-CART-SET3",
      selectionLabel: "طقم قياسي",
      unitPrice: 145,
      image: photo(12142829, 200, 200),
    }),
    address: DEMO_ADDRESSES[0],
    shippingMethod: "express",
    shippingLabel: "شحن سريع",
    paymentMethod: "tabby",
    paymentLabel: "تابي — 4 دفعات",
    subtotal: 145,
    discount: 0,
    shippingCost: 59,
    vatIncluded: 18.91,
    total: 204,
    createdAt: daysAgo(6),
    estimatedDeliveryFrom: daysAgo(4),
    estimatedDeliveryTo: daysAgo(3),
    timeline: [
      { status: "confirmed", label: "تم تأكيد الطلب", at: daysAgo(6) },
      { status: "preparing", label: "جارٍ تجهيز الطلب", at: daysAgo(5) },
      { status: "shipped", label: "تم شحن الطلب", at: daysAgo(4) },
      { status: "delivered", label: "تم التسليم" },
    ],
    userId: DEMO_USER.id,
  },
  {
    id: "ord_1003",
    number: "RWA-20260301-1003",
    status: "processing",
    items: sampleItems({ unitPrice: 1790, selectionLabel: "أزرق محيطي • 9 مراحل + UV", variantId: "var-ocean-blue-s9" }),
    address: DEMO_ADDRESSES[1],
    shippingMethod: "standard",
    shippingLabel: "شحن قياسي",
    paymentMethod: "cod",
    paymentLabel: "الدفع عند الاستلام",
    subtotal: 1790,
    discount: 100,
    shippingCost: 0,
    vatIncluded: 220.43,
    total: 1690,
    createdAt: daysAgo(1),
    estimatedDeliveryFrom: daysFromNow(1),
    estimatedDeliveryTo: daysFromNow(2),
    timeline: [
      { status: "confirmed", label: "تم تأكيد الطلب", at: daysAgo(1) },
      { status: "preparing", label: "جارٍ تجهيز الطلب", at: daysAgo(1) },
      { status: "shipped", label: "تم شحن الطلب" },
      { status: "delivered", label: "تم التسليم" },
    ],
    userId: DEMO_USER.id,
  },
];

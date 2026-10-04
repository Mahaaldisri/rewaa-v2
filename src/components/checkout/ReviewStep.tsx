import { useState } from "react";
import type { Address } from "@/types/auth";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { PaymentGlyph } from "@/components/product/PaymentMethods";
import type { PaymentMethodId } from "@/types/order";

interface Props {
  address: Address;
  shippingLabel: string;
  shippingCost: number;
  paymentMethod: PaymentMethodId;
  paymentLabel: string;
  total: number;
  onEditAddress: () => void;
  onEditShipping: () => void;
  onEditPayment: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

function Row({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: "mapPin" | "truck" | "card";
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-surface p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[12.5px] font-bold text-ink-500">{title}</h3>
          <button type="button" onClick={onEdit} className="text-[11.5px] font-semibold text-brand-700 hover:underline">
            تعديل
          </button>
        </div>
        <div className="mt-1 text-[13px] leading-6 text-ink-900">{children}</div>
      </div>
    </div>
  );
}

export function ReviewStep({
  address,
  shippingLabel,
  shippingCost,
  paymentMethod,
  paymentLabel,
  total,
  onEditAddress,
  onEditShipping,
  onEditPayment,
  onConfirm,
  submitting,
}: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-3">
      <Row icon="mapPin" title="عنوان الشحن" onEdit={onEditAddress}>
        <p className="font-bold">{address.fullName} · {address.phone}</p>
        <p className="text-ink-500">
          {address.district}، {address.street}
          {address.buildingNo ? `، مبنى ${address.buildingNo}` : ""} — {address.cityName}
        </p>
      </Row>

      <Row icon="truck" title="طريقة الشحن" onEdit={onEditShipping}>
        <p className="flex items-center justify-between">
          <span className="font-bold">{shippingLabel}</span>
          <span className="font-display font-extrabold tabular-nums">
            {shippingCost === 0 ? "مجاني" : formatMoney(shippingCost)}
          </span>
        </p>
      </Row>

      <Row icon="card" title="طريقة الدفع" onEdit={onEditPayment}>
        <span className="flex items-center gap-2">
          <PaymentGlyph id={paymentMethod} />
          <span className="font-bold">{paymentLabel}</span>
        </span>
      </Row>

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-[12.5px] leading-5 text-ink-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-700)]"
        />
        أقرّ بأنني راجعت تفاصيل الطلب وأوافق على
        <a href="/legal/terms" className="font-semibold text-brand-700 underline underline-offset-2">
          الشروط والأحكام
        </a>
        و
        <a href="/legal/privacy" className="font-semibold text-brand-700 underline underline-offset-2">
          سياسة الخصوصية
        </a>
      </label>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!agreed || submitting}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-l from-brand-700 to-brand-600 px-5 py-4 font-display text-[15px] font-extrabold text-white shadow-brand transition hover:from-brand-800 hover:to-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="lock" size={18} />
        ادفع الآن — {formatMoney(total)}
      </button>
    </div>
  );
}

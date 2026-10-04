import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Address, AddressInput } from "@/types/auth";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { addressApi } from "@/services/api";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/primitives";
import { AddressForm } from "./AddressForm";
import { cn } from "@/utils/cn";

interface Props {
  selectedAddress: Address | null;
  onSelect: (address: Address) => void;
  guestEmail: string;
  onGuestEmailChange: (value: string) => void;
  onContinue: () => void;
}

export function AddressStep({ selectedAddress, onSelect, guestEmail, onGuestEmailChange, onContinue }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { pushToast } = useStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [showForm, setShowForm] = useState(!isAuthenticated);
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    addressApi
      .list(user.id)
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        const chosen = list.find((a) => a.isDefault) ?? list[0];
        if (chosen && !selectedAddress) onSelect(chosen);
        setShowForm(list.length === 0);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handleCreate = async (values: AddressInput) => {
    setSaving(true);
    try {
      if (isAuthenticated && user) {
        const created = await addressApi.create(user.id, values);
        setAddresses((prev) => [...prev, created]);
        onSelect(created);
      } else {
        const fallback: Address = { ...values, id: `guest_${Date.now()}`, isDefault: true };
        onSelect(fallback);
      }
      setShowForm(false);
      pushToast({ tone: "success", title: "تم حفظ عنوان الشحن", duration: 2400 });
    } catch {
      pushToast({ tone: "error", title: "تعذّر حفظ العنوان", description: "حاول مرة أخرى." });
    } finally {
      setSaving(false);
    }
  };

  const canContinue = Boolean(selectedAddress) && (isAuthenticated || /\S+@\S+\.\S+/.test(guestEmail));

  const handleContinue = () => {
    if (!isAuthenticated && !/\S+@\S+\.\S+/.test(guestEmail)) {
      setEmailError("أدخل بريدًا إلكترونيًا صحيحًا لإرسال تأكيد الطلب");
      return;
    }
    if (!selectedAddress) {
      pushToast({ tone: "warning", title: "اختر عنوان الشحن أولًا" });
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-4">
      {!isAuthenticated && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-aqua-200 bg-aqua-50/60 p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-surface text-aqua-700 shadow-hair">
              <Icon name="user" size={17} />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink-900">لديك حساب في رواء؟</p>
              <p className="text-[11.5px] text-ink-500">سجّل الدخول لاستخدام عناوينك المحفوظة وتتبّع طلباتك.</p>
            </div>
          </div>
          <Link
            to="/login?redirect=/checkout"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-ink-950 px-3.5 text-[12px] font-bold text-aqua-200 transition hover:bg-ink-900"
          >
            تسجيل الدخول
          </Link>
        </div>
      )}

      {!isAuthenticated && (
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">البريد الإلكتروني لتأكيد الطلب</span>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => {
              onGuestEmailChange(e.target.value);
              setEmailError(null);
            }}
            placeholder="example@email.com"
            dir="ltr"
            className={cn(
              "h-11 w-full rounded-md border bg-surface px-3 text-[13px] text-end focus:outline-none focus:ring-2",
              emailError ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
            )}
          />
          {emailError && <p className="mt-1 text-[11px] text-danger">{emailError}</p>}
        </label>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {addresses.length > 0 && (
            <div className="space-y-2.5" role="radiogroup" aria-label="عنوان الشحن">
              {addresses.map((address) => {
                const isSelected = selectedAddress?.id === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelect(address)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-start transition",
                      isSelected ? "border-brand-600 bg-brand-50/50 shadow-hair" : "border-ink-100 bg-surface hover:border-ink-300"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                        isSelected ? "border-brand-700 bg-brand-700" : "border-ink-300"
                      )}
                    >
                      {isSelected && <span className="size-2 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-ink-900">{address.label}</span>
                        {address.isDefault && (
                          <span className="rounded-xs bg-aqua-50 px-1.5 py-0.5 text-[10px] font-bold text-aqua-700">
                            افتراضي
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[12px] leading-5 text-ink-500">
                        {address.fullName} · {address.phone}
                        <br />
                        {address.district}، {address.street}
                        {address.buildingNo ? `، مبنى ${address.buildingNo}` : ""} — {address.cityName}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {showForm ? (
            <div className="rounded-xl border border-ink-100 bg-surface p-4">
              <h3 className="mb-3 font-display text-[13.5px] font-bold text-ink-900">عنوان شحن جديد</h3>
              <AddressForm
                submitLabel="حفظ ومتابعة"
                onSubmit={handleCreate}
                submitting={saving}
                onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
                showDefaultToggle={isAuthenticated}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-3.5 text-[12.5px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
            >
              <Icon name="plus" size={14} />
              إضافة عنوان جديد
            </button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue && !showForm}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-display text-[14px] font-extrabold text-white shadow-brand transition hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        متابعة إلى طريقة الشحن
        <Icon name="arrowLeft" size={16} />
      </button>
    </div>
  );
}

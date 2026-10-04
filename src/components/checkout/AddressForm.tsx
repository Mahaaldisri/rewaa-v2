import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Address, AddressInput } from "@/types/auth";
import { referenceApi } from "@/services/referenceApi";
import { useAsync } from "@/hooks/useAsync";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

export type AddressFormValues = AddressInput;

interface Props {
  initial?: Address | null;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: AddressFormValues) => void;
  submitting?: boolean;
  showDefaultToggle?: boolean;
}

const EMPTY: AddressFormValues = {
  label: "المنزل",
  fullName: "",
  phone: "",
  cityId: "",
  cityName: "",
  district: "",
  street: "",
  buildingNo: "",
  additionalInfo: "",
  isDefault: false,
};

const SAUDI_PHONE = /^0?5\d{8}$/;

export function AddressForm({ initial, submitLabel = "حفظ العنوان", onCancel, onSubmit, submitting, showDefaultToggle = true }: Props) {
  const [values, setValues] = useState<AddressFormValues>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  // Cities come from the reference service, never from a data file directly.
  const cities = useAsync(() => referenceApi.listCities(), []);
  const cityList = useMemo(() => cities.data ?? [], [cities.data]);

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  // Default to the first served city once the list arrives.
  useEffect(() => {
    const first = cityList[0];
    if (!first) return;
    setValues((prev) => (prev.cityId ? prev : { ...prev, cityId: first.id, cityName: first.name }));
  }, [cityList]);

  const set = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof AddressFormValues, string>> = {};
    if (!values.fullName.trim()) next.fullName = "الاسم الكامل مطلوب";
    if (!SAUDI_PHONE.test(values.phone.replace(/\s/g, ""))) next.phone = "أدخل رقم جوال سعودي صحيح (05xxxxxxxx)";
    if (!values.cityId) next.cityId = "اختر المدينة";
    if (!values.district.trim()) next.district = "الحي مطلوب";
    if (!values.street.trim()) next.street = "اسم الشارع مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const city = cityList.find((c) => c.id === values.cityId);
    onSubmit({ ...values, cityName: city?.name ?? values.cityName });
  };

  const field = (key: keyof AddressFormValues) => errors[key];

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">تسمية العنوان</span>
          <div className="flex gap-1.5">
            {["المنزل", "العمل", "أخرى"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => set("label", label)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-2 text-[12px] font-semibold transition",
                  values.label === label
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-ink-200 text-ink-600 hover:bg-ink-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">الاسم الكامل</span>
          <input
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="الاسم الثلاثي لاستلام الطلب"
            className={cn(
              "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
              field("fullName") ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
            )}
          />
          {field("fullName") && <p className="mt-1 text-[11px] text-danger">{field("fullName")}</p>}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">رقم الجوال</span>
          <div className="relative">
            <Icon name="phone" size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="05xxxxxxxx"
              inputMode="numeric"
              dir="ltr"
              className={cn(
                "h-11 w-full rounded-md border bg-surface pe-3 ps-9 text-[13px] focus:outline-none focus:ring-2",
                field("phone") ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
              )}
            />
          </div>
          {field("phone") && <p className="mt-1 text-[11px] text-danger">{field("phone")}</p>}
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">المدينة</span>
          <div className="relative">
            <select
              value={values.cityId}
              onChange={(e) => set("cityId", e.target.value)}
              className={cn(
                "h-11 w-full appearance-none rounded-md border bg-surface px-3 pe-8 text-[13px] focus:outline-none focus:ring-2",
                field("cityId") ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
              )}
            >
              {cities.loading && cityList.length === 0 && <option value="">جارٍ تحميل المدن…</option>}
              {cityList.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} — {city.region}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400" />
          </div>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">الحي</span>
          <input
            value={values.district}
            onChange={(e) => set("district", e.target.value)}
            placeholder="مثال: حي الملقا"
            className={cn(
              "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
              field("district") ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
            )}
          />
          {field("district") && <p className="mt-1 text-[11px] text-danger">{field("district")}</p>}
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-700">رقم المبنى</span>
          <input
            value={values.buildingNo}
            onChange={(e) => set("buildingNo", e.target.value)}
            placeholder="اختياري"
            className="h-11 w-full rounded-md border border-ink-200 bg-surface px-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink-700">الشارع</span>
        <input
          value={values.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="اسم الشارع"
          className={cn(
            "h-11 w-full rounded-md border bg-surface px-3 text-[13px] focus:outline-none focus:ring-2",
            field("street") ? "border-danger focus:ring-danger/20" : "border-ink-200 focus:border-brand-500 focus:ring-brand-200"
          )}
        />
        {field("street") && <p className="mt-1 text-[11px] text-danger">{field("street")}</p>}
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink-700">تفاصيل إضافية (اختياري)</span>
        <textarea
          value={values.additionalInfo}
          onChange={(e) => set("additionalInfo", e.target.value)}
          rows={2}
          placeholder="علامة مميزة، رقم الشقة، تعليمات للفني…"
          className="w-full resize-none rounded-md border border-ink-200 bg-surface p-3 text-[13px] leading-5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      {showDefaultToggle && (
        <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
          <input
            type="checkbox"
            checked={Boolean(values.isDefault)}
            onChange={(e) => set("isDefault", e.target.checked)}
            className="size-4 accent-[var(--color-brand-700)]"
          />
          اجعل هذا هو العنوان الافتراضي
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 font-display text-[13.5px] font-bold text-white transition hover:bg-brand-800 disabled:opacity-70 sm:flex-none"
        >
          {submitting && <Icon name="refresh" size={15} className="animate-spin-slow" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-lg border border-ink-200 bg-surface px-5 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-50"
          >
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
}

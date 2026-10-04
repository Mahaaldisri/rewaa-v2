import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type { Address } from "@/types/auth";
import type { Order, OrderStatus } from "@/types/order";
import { useAuth } from "@/store/AuthProvider";
import { useStore } from "@/store/StoreProvider";
import { addressApi, ordersApi } from "@/services/api";
import { serviceApi } from "@/services/serviceApi";
import { warrantyApi } from "@/services/helpApi";
import { formatDate, formatMoney, formatRelativeDate } from "@/lib/format";
import { contact } from "@/config/site";
import type { ServiceRequest, WarrantyClaim } from "@/types/service";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/primitives";
import { AddressForm, type AddressFormValues } from "@/components/checkout/AddressForm";
import { MaintenanceCenter } from "@/components/account/MaintenanceCenter";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/utils/cn";

type Tab = "orders" | "maintenance" | "services" | "warranty" | "addresses" | "profile";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "orders", label: "طلباتي", icon: "package" },
  { id: "maintenance", label: "مركز الصيانة", icon: "settings" },
  { id: "services", label: "طلبات الخدمة", icon: "calendar" },
  { id: "warranty", label: "طلبات الضمان", icon: "shield" },
  { id: "addresses", label: "العناوين", icon: "mapPin" },
  { id: "profile", label: "الملف الشخصي", icon: "user" },
];

const SERVICE_STATUS_META: Record<ServiceRequest["status"], { label: string; tone: string; icon: IconName }> = {
  submitted: { label: "تم الإرسال", tone: "bg-info-soft text-info", icon: "check" },
  confirmed: { label: "تم التأكيد", tone: "bg-aqua-50 text-aqua-700", icon: "checkCircle" },
  technician_assigned: { label: "تم تعيين فني", tone: "bg-brand-50 text-brand-700", icon: "user" },
  scheduled: { label: "تم الجدولة", tone: "bg-brand-50 text-brand-700", icon: "calendar" },
  in_progress: { label: "جارٍ التنفيذ", tone: "bg-warning-soft text-warning", icon: "rotate" },
  completed: { label: "مكتملة", tone: "bg-success-soft text-success", icon: "badgeCheck" },
  cancelled: { label: "ملغاة", tone: "bg-danger-soft text-danger", icon: "close" },
};

const CLAIM_STATUS_META: Record<WarrantyClaim["status"], { label: string; tone: string }> = {
  received: { label: "تم الاستلام", tone: "bg-info-soft text-info" },
  under_review: { label: "قيد المراجعة", tone: "bg-warning-soft text-warning" },
  approved: { label: "مقبول", tone: "bg-success-soft text-success" },
  rejected: { label: "مرفوض", tone: "bg-danger-soft text-danger" },
  completed: { label: "مكتمل", tone: "bg-aqua-50 text-aqua-700" },
};

const STATUS_META: Record<OrderStatus, { label: string; tone: string; icon: IconName }> = {
  processing: { label: "قيد المعالجة", tone: "bg-warning-soft text-warning", icon: "clock" },
  confirmed: { label: "تم التأكيد", tone: "bg-info-soft text-info", icon: "check" },
  preparing: { label: "جارٍ التجهيز", tone: "bg-aqua-50 text-aqua-700", icon: "package" },
  shipped: { label: "تم الشحن", tone: "bg-brand-50 text-brand-700", icon: "truck" },
  delivered: { label: "تم التسليم", tone: "bg-success-soft text-success", icon: "badgeCheck" },
  cancelled: { label: "ملغي", tone: "bg-danger-soft text-danger", icon: "close" },
};

export function AccountPage() {
  const { user, isAuthenticated, logout, initializing } = useAuth();
  const { pushToast } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "orders";

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    ordersApi
      .list({ userId: user.id })
      .then(setOrders)
      .finally(() => setLoadingOrders(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingAddresses(true);
    addressApi
      .list(user.id)
      .then(setAddresses)
      .finally(() => setLoadingAddresses(false));
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "services" || serviceRequests.length > 0) return;
    setLoadingServices(true);
    serviceApi
      .list(user.id)
      .then(setServiceRequests)
      .finally(() => setLoadingServices(false));
  }, [user, tab, serviceRequests.length]);

  useEffect(() => {
    if (!user || tab !== "warranty" || claims.length > 0) return;
    setLoadingClaims(true);
    warrantyApi
      .list()
      .then(setClaims)
      .finally(() => setLoadingClaims(false));
  }, [user, tab, claims.length]);

  if (initializing) {
    return (
      <div className="container-x py-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?redirect=/account" replace />;
  }

  const setTab = (next: Tab) => setParams({ tab: next });

  const saveAddress = async (values: AddressFormValues) => {
    setSavingAddress(true);
    try {
      if (editingAddress) {
        const updated = { ...editingAddress, ...values };
        await addressApi.update(user.id, updated);
        setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        pushToast({ tone: "success", title: "تم تحديث العنوان", duration: 2200 });
      } else {
        const created = await addressApi.create(user.id, values);
        setAddresses((prev) => (created.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev).concat(created));
        pushToast({ tone: "success", title: "تمت إضافة العنوان", duration: 2200 });
      }
      setShowAddressForm(false);
      setEditingAddress(null);
    } catch {
      pushToast({ tone: "error", title: "تعذّر حفظ العنوان" });
    } finally {
      setSavingAddress(false);
    }
  };

  const removeAddress = async (id: string) => {
    await addressApi.remove(user.id, id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    pushToast({ tone: "info", title: "تم حذف العنوان", duration: 2000 });
  };

  const makeDefault = async (id: string) => {
    const updated = await addressApi.setDefault(user.id, id);
    setAddresses(updated);
  };

  return (
    <div className="bg-ambient">
      <div className="container-x py-6 sm:py-9">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-hair sm:p-6">
          <div className="flex items-center gap-3.5">
            <span className="grid size-14 place-items-center rounded-2xl bg-ink-950 font-display text-xl font-extrabold text-aqua-300">
              {user.name.slice(0, 1)}
            </span>
            <div>
              <p className="font-display text-[16px] font-extrabold text-ink-950">{user.name}</p>
              <p className="text-[12px] text-ink-500">{user.email} · {user.phone}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">عضو منذ {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
              pushToast({ tone: "info", title: "تم تسجيل الخروج", duration: 2000 });
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-4 text-[12.5px] font-semibold text-ink-600 transition hover:border-danger/30 hover:text-danger"
          >
            <Icon name="arrowLeft" size={14} />
            تسجيل الخروج
          </button>
        </div>

          {/* ------------------------------- Quick links ------------------------------ */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {[
              { label: "قائمة المفضلة", body: "المنتجات المحفوظة للمقارنة لاحقًا", href: "/wishlist", icon: "heart" as const },
              { label: "مقارنة المنتجات", body: "قارن حتى 4 منتجات بجانب بعضها", href: "/compare", icon: "compare" as const },
              { label: "تتبّع طلب أو خدمة", body: "اعرف حالة الطلب برقم المرجع", href: "/help/track", icon: "truck" as const },
            ].map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-3 rounded-xl border border-ink-100 bg-surface p-3.5 transition hover:border-brand-200 hover:shadow-hair"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={link.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-ink-900">{link.label}</span>
                  <span className="block text-[11.5px] text-ink-500">{link.body}</span>
                </span>
                <Icon name="chevronLeft" size={15} className="ms-auto shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="أقسام الحساب">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-bold transition",
                tab === t.id ? "bg-ink-950 text-aqua-200" : "bg-surface text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
              )}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {/* --------------------------------- Orders --------------------------------- */}
          {tab === "orders" && (
            <div className="space-y-3">
              {loadingOrders ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center">
                  <Icon name="package" size={28} className="mx-auto text-ink-300" />
                  <p className="mt-3 font-display text-[14px] font-bold text-ink-900">لا توجد طلبات بعد</p>
                  <Link to="/" className="mt-3 inline-flex text-[12.5px] font-semibold text-brand-700 hover:underline">
                    ابدأ التسوق الآن
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const meta = STATUS_META[order.status];
                  return (
                    <Link
                      key={order.id}
                      to={`/account/orders/${order.id}`}
                      className="flex flex-wrap items-center gap-4 rounded-xl border border-ink-100 bg-surface p-4 shadow-hair transition hover:border-brand-200 hover:shadow-card"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-paper-deep p-2">
                        {order.items[0]?.image ? (
                          <img src={order.items[0].image} alt="" className="size-full rounded-md object-cover" />
                        ) : (
                          <LogoMark className="size-full" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-mono text-[12.5px] font-bold text-ink-900">
                          {order.number}
                          <span className={cn("inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[10px] font-bold", meta.tone)}>
                            <Icon name={meta.icon} size={10} />
                            {meta.label}
                          </span>
                        </p>
                        <p className="mt-1 line-clamp-1 text-[12px] text-ink-500">
                          {order.items.map((i) => i.name).join("، ")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-400">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-display text-[15px] font-extrabold tabular-nums text-ink-950">
                          {formatMoney(order.total)}
                        </p>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-brand-700">
                          التفاصيل
                          <Icon name="chevronLeft" size={12} />
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* -------------------------------- Addresses -------------------------------- */}
          {tab === "maintenance" && <MaintenanceCenter />}

          {tab === "addresses" && (
            <div className="space-y-3">
              {loadingAddresses ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : (
                addresses.map((address) => (
                  <div key={address.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-ink-100 bg-surface p-4 shadow-hair">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon name="mapPin" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-bold text-ink-900">
                        {address.label}
                        {address.isDefault && (
                          <span className="rounded-xs bg-aqua-50 px-1.5 py-0.5 text-[10px] font-bold text-aqua-700">افتراضي</span>
                        )}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-ink-500">
                        {address.fullName} · {address.phone}
                        <br />
                        {address.district}، {address.street} — {address.cityName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {!address.isDefault && (
                        <button
                          type="button"
                          onClick={() => makeDefault(address.id)}
                          className="rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50"
                        >
                          اجعله افتراضيًا
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddress(address);
                          setShowAddressForm(true);
                        }}
                        className="rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAddress(address.id)}
                        className="rounded-md border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:border-danger/30 hover:text-danger"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}

              {showAddressForm ? (
                <div className="rounded-xl border border-ink-100 bg-surface p-4">
                  <h3 className="mb-3 font-display text-[13.5px] font-bold text-ink-900">
                    {editingAddress ? "تعديل العنوان" : "عنوان جديد"}
                  </h3>
                  <AddressForm
                    initial={editingAddress}
                    onSubmit={saveAddress}
                    submitting={savingAddress}
                    onCancel={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-3.5 text-[12.5px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
                >
                  <Icon name="plus" size={14} />
                  إضافة عنوان جديد
                </button>
              )}
            </div>
          )}

          {/* ------------------------------- Services -------------------------------- */}
          {tab === "services" && (
            <div className="space-y-3">
              {loadingServices && serviceRequests.length === 0 ? (
                <>
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                </>
              ) : serviceRequests.length === 0 ? (
                <div className="rounded-xl border border-ink-100 bg-surface p-6 text-center shadow-hair">
                  <span className="mx-auto grid size-12 place-items-center rounded-xl bg-ink-50 text-ink-400">
                    <Icon name="calendar" size={22} />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-extrabold text-ink-950">لا توجد طلبات خدمة بعد</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-500">
                    يمكنك حجز زيارة تركيب أو صيانة أو فحص مياه، وتتابع حالتها من هنا.
                  </p>
                  <Link
                    to="/services/book"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand"
                  >
                    <Icon name="calendar" size={15} />
                    احجز خدمة
                  </Link>
                </div>
              ) : (
                serviceRequests.map((request) => {
                  const meta = SERVICE_STATUS_META[request.status];
                  return (
                    <article key={request.id} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-ink-400">رقم المرجع</p>
                          <p className="font-mono text-[12.5px] font-bold text-ink-900" dir="ltr">
                            {request.reference}
                          </p>
                          <h3 className="mt-1 font-display text-[13.5px] font-bold text-ink-950">{request.typeLabel}</h3>
                          <p className="mt-0.5 text-[11.5px] text-ink-500">
                            {request.cityName} — {request.district} · {formatDate(request.preferredDate)} · {request.preferredSlot}
                          </p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", meta.tone)}>
                          <Icon name={meta.icon} size={12} />
                          {meta.label}
                        </span>
                      </div>

                      {request.technician && (
                        <p className="mt-2.5 flex items-center gap-2 rounded-lg bg-aqua-50 px-3 py-2 text-[11.5px] text-aqua-800">
                          <Icon name="user" size={13} />
                          الفني: {request.technician.name} · {request.technician.phone}
                        </p>
                      )}

                      <p className="mt-2.5 text-[12px] leading-6 text-ink-600">{request.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-ink-100 pt-3">
                        <span className="text-[11px] text-ink-400">أُرسل {formatRelativeDate(request.createdAt)}</span>
                        <Link
                          to={`/help/track?ref=${request.reference}`}
                          className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[12px] font-bold text-ink-700 transition hover:bg-ink-50"
                        >
                          <Icon name="truck" size={14} />
                          تتبّع الزيارة
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* ------------------------------- Warranty -------------------------------- */}
          {tab === "warranty" && (
            <div className="space-y-3">
              {loadingClaims && claims.length === 0 ? (
                <Skeleton className="h-28 rounded-xl" />
              ) : claims.length === 0 ? (
                <div className="rounded-xl border border-ink-100 bg-surface p-6 text-center shadow-hair">
                  <span className="mx-auto grid size-12 place-items-center rounded-xl bg-ink-50 text-ink-400">
                    <Icon name="shield" size={22} />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-extrabold text-ink-950">لا توجد طلبات ضمان</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink-500">
                    إن ظهر عطل خلال فترة الضمان، ارفع طلبًا برقم الطلب والرقم التسلسلي وسنراجعه.
                  </p>
                  <Link
                    to="/help/warranty-claim"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-[12.5px] font-bold text-white shadow-brand"
                  >
                    <Icon name="shield" size={15} />
                    طلب ضمان
                  </Link>
                </div>
              ) : (
                claims.map((claim) => {
                  const meta = CLAIM_STATUS_META[claim.status];
                  return (
                    <article key={claim.id} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-hair">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[12.5px] font-bold text-ink-900" dir="ltr">
                            {claim.reference}
                          </p>
                          <h3 className="mt-1 font-display text-[13.5px] font-bold text-ink-950">{claim.productLabel}</h3>
                          <p className="mt-0.5 text-[11.5px] text-ink-500">
                            {claim.issueLabel} · طلب رقم {claim.orderNumber} · {formatDate(claim.createdAt)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", meta.tone)}>{meta.label}</span>
                      </div>
                      <p className="mt-2.5 text-[12px] leading-6 text-ink-600">{claim.description}</p>
                      <p className="mt-2 text-[11px] text-ink-400">الرد المتوقع خلال {claim.expectedResponseHours} ساعة عمل</p>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* --------------------------------- Profile --------------------------------- */}
          {tab === "profile" && (
            <div className="max-w-lg space-y-3 rounded-xl border border-ink-100 bg-surface p-5 shadow-hair">
              {[
                { label: "الاسم الكامل", value: user.name, icon: "user" as const },
                { label: "البريد الإلكتروني", value: user.email, icon: "message" as const },
                { label: "رقم الجوال", value: user.phone, icon: "phone" as const },
              ].map((field) => (
                <div key={field.label} className="flex items-center gap-3 rounded-lg bg-ink-50/60 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-ink-500 shadow-hair">
                    <Icon name={field.icon} size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] text-ink-400">{field.label}</p>
                    <p className="text-[13px] font-semibold text-ink-900" dir="ltr">
                      {field.value}
                    </p>
                  </div>
                </div>
              ))}
              <p className="flex items-center gap-1.5 pt-1 text-[11.5px] text-ink-400">
                <Icon name="info" size={13} />
                لتحديث بياناتك الشخصية تواصل مع الدعم الفني على {contact.phoneDisplay}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

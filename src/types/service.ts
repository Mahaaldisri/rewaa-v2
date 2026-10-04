/**
 * Service-request, tracking and after-sales domain types.
 * Everything here is persisted in localStorage by `src/services/*` while the
 * storefront runs without a backend.
 */

/* ---------------------------- Service requests ---------------------------- */

export type ServiceRequestType =
  | "installation"
  | "maintenance"
  | "cartridge-change"
  | "water-test"
  | "fault"
  | "leak"
  | "other";

export type ServiceRequestStatus =
  | "submitted"
  | "confirmed"
  | "technician_assigned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ServiceRequestAttachment {
  id: string;
  name: string;
  /** Data URL kept only in the browser — never uploaded anywhere. */
  previewUrl: string;
  sizeLabel: string;
}

export interface ServiceRequest {
  id: string;
  /** RWA-SRV-YYYY-XXXXX */
  reference: string;
  type: ServiceRequestType;
  typeLabel: string;
  productSlug?: string;
  productLabel?: string;
  deviceDescription?: string;
  cityId: string;
  cityName: string;
  district: string;
  customerName: string;
  phone: string;
  email?: string;
  preferredDate: string;
  preferredSlot: string;
  description: string;
  attachments: ServiceRequestAttachment[];
  status: ServiceRequestStatus;
  createdAt: string;
  /** Set when a technician is assigned in the mock flow. */
  technician?: { name: string; phone: string; rating: number };
  timeline: { status: ServiceRequestStatus; label: string; at?: string; note?: string }[];
  estimatedVisit?: string;
  planId?: string;
  userId?: string;
}

export interface ServiceRequestInput {
  type: ServiceRequestType;
  productSlug?: string;
  productLabel?: string;
  deviceDescription?: string;
  cityId: string;
  cityName: string;
  district: string;
  customerName: string;
  phone: string;
  email?: string;
  preferredDate: string;
  preferredSlot: string;
  description: string;
  attachments: ServiceRequestAttachment[];
  planId?: string;
  userId?: string;
}

/* --------------------------- Maintenance reminders ------------------------- */

export interface MaintenanceReminder {
  id: string;
  productSlug: string;
  productName: string;
  installedAt: string;
  lastCartridgeChange: string;
  /** Months between replacements, sourced from the product data. */
  intervalMonths: number;
  createdAt: string;
}

export interface MaintenanceReminderView extends MaintenanceReminder {
  nextChangeAt: string;
  daysUntil: number;
  state: "ok" | "due_soon" | "overdue";
  image?: string;
}

/* ------------------------------- Tracking -------------------------------- */

export type TrackingKind = "order" | "service";

export interface TrackingStep {
  id: string;
  label: string;
  description: string;
  at?: string;
  state: "done" | "current" | "pending";
}

export interface TrackingRecord {
  reference: string;
  kind: TrackingKind;
  statusLabel: string;
  statusNote: string;
  createdAt: string;
  summary: { label: string; value: string }[];
  steps: TrackingStep[];
  items?: { name: string; quantity: number; image?: string; note?: string }[];
  carrier?: { name: string; trackingNumber: string; phone?: string };
  technician?: { name: string; phone: string; rating: number };
  etaLabel?: string;
  address?: string;
}

export interface TrackingLookup {
  reference: string;
  /** Optional secondary factor: last 4 digits of the phone or the email. */
  contact?: string;
}

/* ----------------------------- Warranty claims ---------------------------- */

export type WarrantyIssueType =
  | "not_powering"
  | "low_flow"
  | "leak"
  | "noise"
  | "taste_odor"
  | "high_tds"
  | "damaged_on_arrival"
  | "other";

export interface WarrantyClaim {
  id: string;
  reference: string;
  orderNumber: string;
  productSlug?: string;
  productLabel: string;
  serialNumber: string;
  purchaseDate: string;
  issueType: WarrantyIssueType;
  issueLabel: string;
  description: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  attachmentName?: string;
  status: "received" | "under_review" | "approved" | "rejected" | "completed";
  createdAt: string;
  expectedResponseHours: number;
}

export interface WarrantyClaimInput {
  orderNumber: string;
  productSlug?: string;
  productLabel: string;
  serialNumber: string;
  purchaseDate: string;
  issueType: WarrantyIssueType;
  description: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  attachmentName?: string;
  acceptedTerms: boolean;
}

/* -------------------------------- Returns --------------------------------- */

export type ReturnReason =
  | "changed_mind"
  | "wrong_item"
  | "damaged"
  | "not_as_described"
  | "defective"
  | "other";

export interface ReturnRequest {
  id: string;
  reference: string;
  orderNumber: string;
  reason: ReturnReason;
  reasonLabel: string;
  items: { name: string; quantity: number; sku: string }[];
  description: string;
  customerName: string;
  phone: string;
  refundMethod: "original" | "wallet" | "bank";
  refundLabel: string;
  status: "requested" | "pickup_scheduled" | "received" | "refunded" | "rejected";
  createdAt: string;
  estimatedRefundDays: number;
}

export interface ReturnRequestInput {
  orderNumber: string;
  reason: ReturnReason;
  items: { name: string; quantity: number; sku: string }[];
  description: string;
  customerName: string;
  phone: string;
  refundMethod: ReturnRequest["refundMethod"];
}

/* ------------------------------- Support ---------------------------------- */

export type SupportCategory =
  | "technical"
  | "sales"
  | "commercial"
  | "orders"
  | "warranty"
  | "complaint";

export interface ContactMessageInput {
  category: SupportCategory;
  name: string;
  phone: string;
  email?: string;
  orderNumber?: string;
  subject: string;
  message: string;
}

export interface ContactMessage {
  id: string;
  reference: string;
  createdAt: string;
  expectedResponseHours: number;
  category: SupportCategory;
}

/* ------------------------------ Commercial -------------------------------- */

export interface QuoteRequestInput {
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  cityId: string;
  cityName: string;
  industry: string;
  estimatedConsumption: string;
  requiredSolution: string;
  notes?: string;
}

export interface QuoteRequest {
  id: string;
  reference: string;
  createdAt: string;
  expectedResponseHours: number;
  cityName: string;
  industry: string;
}

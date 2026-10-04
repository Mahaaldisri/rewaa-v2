/**
 * قواعد التحقق من المرفقات (صور الجهاز/الملصق).
 *
 * هذه هي نفس القواعد التي يجب أن يطبّقها الخادم قبل تمرير الصورة للمزوّد
 * (النوع، الحجم). فحص البرمجيات الخبيثة يبقى مسؤولية الخادم — الواجهة لا تدّعي
 * أنه تم.
 */
import type { AiAttachmentRef } from "@/types/ai";

export const AI_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const AI_ATTACHMENT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export interface AttachmentValidation {
  ok: boolean;
  reason?: string;
}

export function validateAttachmentFile(file: { type: string; size: number }): AttachmentValidation {
  if (!AI_ATTACHMENT_ALLOWED_MIME.includes(file.type as (typeof AI_ATTACHMENT_ALLOWED_MIME)[number])) {
    return { ok: false, reason: "الصيغة غير مدعومة. استخدم JPG أو PNG أو WEBP." };
  }
  if (file.size > AI_ATTACHMENT_MAX_BYTES) {
    return { ok: false, reason: "حجم الصورة كبير. الحد الأعلى 5 ميجابايت." };
  }
  if (file.size === 0) {
    return { ok: false, reason: "الملف فارغ." };
  }
  return { ok: true };
}

/** يبني مرجع المرفق الذي يُرسَل للخادم (بيانات وصفية فقط — الصورة تُرفع عبر رابط موقّع). */
export function attachmentRefFromFile(file: File, kind: AiAttachmentRef["kind"] = "unknown"): AiAttachmentRef {
  return {
    id: `att-${Date.now().toString(36)}`,
    kind,
    mimeType: file.type,
    sizeBytes: file.size,
    name: file.name.slice(0, 60),
  };
}

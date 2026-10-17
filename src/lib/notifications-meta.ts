/**
 * جدول أيقونات + ألوان الإشعارات (الجولة 3).
 * الألوان عبر توكنات Tailwind فقط — صفر ألوان ثابتة في TSX.
 */
import {
  Package,
  CheckCircle,
  ChefHat,
  Truck,
  PartyPopper,
  XCircle,
  BadgeCheck,
  Mail,
  Clock,
  Store,
  UserPlus,
  Flame,
  AlertTriangle,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/types/api.generated";

type HrefFn = (data: Record<string, unknown> | null, role?: PortalRole) => string;

/** بوابة المستخدم الناقر — تحدد الهدف الصحيح (إصلاح الـ404 بين الدومينات) */
export type PortalRole = "customer" | "owner" | "admin" | "courier";

export interface NotificationMeta {
  icon: LucideIcon;
  // class Tailwind من توكنات للنص
  colorClass: string;
  // class Tailwind لخلفية soft
  bgClass: string;
  // المسار عند النقر (إن كان ثابتاً؛ وإلا فالـ dynamic يُبنى من data)
  hrefFor?: HrefFn;
}

/** مسار طلبات المالك/الأدمن/المندوب حسب البيانات المتاحة (إصلاح الـ404):
 *  كانت كل إشعارات الطلبات توجّه الجميع إلى /orders/{id} — وهو مسار بوابة
 *  العميل على الدومين الرئيسي حصراً؛ المالك على facility. والأدمن على
 *  دومينه يصطدمان بـ404. الآن كل دور يذهب إلى طلبات بوابته. */
function ordersHrefFor(
  d: Record<string, unknown> | null,
  role: PortalRole,
  /** مسار فرعي للعميل (مثل /payment) */
  customerSuffix = "",
): string {
  const orderId = d?.order_id ?? "";
  const facilityId = d?.facility_id ?? "";
  if (role === "owner") {
    return facilityId
      ? `/owner/facilities/${facilityId}/orders`
      : "/owner";
  }
  if (role === "admin") return "/admin/orders";
  if (role === "courier") return "/courier/tasks";
  return `/orders/${orderId}${customerSuffix}`;
}

const STATIC: Partial<Record<NotificationType, NotificationMeta>> = {
  order_new: {
    icon: Package,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  order_confirmed: {
    icon: CheckCircle,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  order_preparing: {
    icon: ChefHat,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  order_out_for_delivery: {
    icon: Truck,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  order_delivered: {
    icon: PartyPopper,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  order_cancelled: {
    icon: XCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  membership_new_request: {
    icon: Mail,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    /* مستلم هذا النوع هو المشرف — يُوجَّه لصفحة طلبات
       العضوية في لوحة الإدارة (نفس سلوك الرابط العميق في SW). */
    hrefFor: (_d, role = "customer") =>
      role === "admin" ? "/admin/membership-requests" : "/account",
  },
  membership_received: {
    icon: Mail,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: () => "/account",
  },
  membership_approved: {
    icon: BadgeCheck,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: () => "/account",
  },
  membership_rejected: {
    icon: XCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    hrefFor: () => "/account",
  },
  membership_expiring: {
    icon: Clock,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: () => "/account",
  },
  facility_approved: {
    icon: Store,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hrefFor: (d) => (d?.facility_id ? `/owner` : "/owner"),
  },
  facility_rejected: {
    icon: XCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    hrefFor: () => "/owner",
  },
  owner_registered: {
    icon: UserPlus,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: () => "/owner",
  },
  special_offer_new: {
    icon: Flame,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    hrefFor: (d) => `/products/${d?.product_id ?? ""}`,
  },
  special_offer_ending: {
    icon: Clock,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d) => `/products/${d?.product_id ?? ""}`,
  },
  special_offer_soldout: {
    icon: AlertTriangle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    hrefFor: (d) => `/products/${d?.product_id ?? ""}`,
  },
  /* ─── جولة المحافظ اليمنية ─── */
  /* للتاجر: رفع العميل إشعار التحويل (أول مرة أو تكملة) */
  order_payment_receipt: {
    icon: Package,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
  /* للعميل: التاجر طلب الدفعة الناقصة — يفتح شاشة الدفع مباشرة */
  order_payment_remaining: {
    icon: Clock,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role, "/payment"),
  },
  /* للتاجر: رفع العميل إشعار المتبقي (اكتمال الدفعة الناقصة) */
  order_payment_completion: {
    icon: Package,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d, role = "customer") => ordersHrefFor(d, role),
  },
};

const FALLBACK: NotificationMeta = {
  icon: Bell,
  colorClass: "text-foreground",
  bgClass: "bg-muted",
};

/** يرجع Metadata للإشعار (icon + colors + href). */
export function getNotificationMeta(type: string | undefined): NotificationMeta {
  if (!type) return FALLBACK;
  return STATIC[type as NotificationType] ?? FALLBACK;
}

/** المسار عند نقر الإشعار — **واعٍ بالدور** (إصلاح الـ404 بين البوابات):
 *  كل بوابة تعيش على دومينها (الرئيسي/facility./admin.) — مسارات العميل
 *  غير موجودة على دومينات البوابات الأخرى، فكان أي إشعار طلبات ينقره
 *  مالك/أدمن يصطدم بـ404. role يُستنتج من المسار إن لم يُمرَّر. */
export function getNotificationHref(
  type: string | undefined,
  data: Record<string, unknown> | null,
  role?: PortalRole
): string | null {
  const resolvedRole: PortalRole =
    role ?? inferRoleFromPath();
  const meta = getNotificationMeta(type);
  if (!meta.hrefFor) {
    /* أنواع المندوب (task_*) ليست في الجدول — المندوب يذهب لمهامه */
    if (resolvedRole === "courier" && type?.startsWith("task_")) {
      return "/courier/tasks";
    }
    return null;
  }
  const href = meta.hrefFor(data ?? null, resolvedRole);
  // لا نُرجع مساراً برقم غير صالح (مثل /orders/)
  if (href.endsWith("/") || href.includes("undefined")) {
    // للحالات membership_* و facility_* و owner_* نُرجع المسار الثابت فقط
    if (href === "/account" || href === "/owner") return href;
    return null;
  }
  return href;
}

/** استنتاج البوابة من مسار الصفحة الحالي (SSR-آمن: الافتراضي عميل) */
export function inferRoleFromPath(): PortalRole {
  if (typeof window === "undefined") return "customer";
  const p = window.location.pathname;
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/owner")) return "owner";
  if (p.startsWith("/courier")) return "courier";
  return "customer";
}

/** الوقت النسبي بالعربية: «منذ دقيقة» / «منذ ساعة» / «منذ يومين». */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Math.max(0, now - then);
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "الآن";
  if (min < 60) {
    return min === 1 ? "منذ دقيقة" : min === 2 ? "منذ دقيقتين" : min <= 10 ? `منذ ${min} دقائق` : `منذ ${min} دقيقة`;
  }
  if (hr < 24) {
    return hr === 1 ? "منذ ساعة" : hr === 2 ? "منذ ساعتين" : hr <= 10 ? `منذ ${hr} ساعات` : `منذ ${hr} ساعة`;
  }
  if (day < 30) {
    return day === 1 ? "منذ يوم" : day === 2 ? "منذ يومين" : day <= 10 ? `منذ ${day} أيام` : `منذ ${day} يوماً`;
  }
  return new Date(iso).toLocaleDateString("ar-SA");
}

/* ═══ تصنيفات الإشعارات (فلترة صفحة الإشعارات — الجولة 25) ═══ */

/** فئات الإشعارات المعروضة كرقائق فلترة في صفحة الإشعارات */
export type NotificationCategory = "orders" | "offers" | "membership" | "system";

export const NOTIFICATION_CATEGORIES: ReadonlyArray<{
  key: NotificationCategory;
  label: string;
}> = [
  { key: "orders", label: "الطلبات" },
  { key: "offers", label: "العروض" },
  { key: "membership", label: "العضوية" },
  { key: "system", label: "النظام" },
];

/** يرجع فئة الإشعار حسب نوعه — افتراضياً «النظام». */
export function getNotificationCategory(
  type: string | undefined
): NotificationCategory {
  if (!type) return "system";
  if (type.startsWith("order_")) return "orders";
  if (type.startsWith("special_offer_")) return "offers";
  if (type.startsWith("membership_")) return "membership";
  return "system";
}

/**
 * عنوان تجميع تاريخي للإشعار: «اليوم» / «أمس» / «أقدم».
 * يستخدم كعناوين أقسام داخل صفحة الإشعارات — تجميع بصري مألوف
 * من تطبيقات المحادثة الأصيلة.
 */
export function getNotificationDateGroup(iso: string): "today" | "yesterday" | "older" {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "older";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = then.getTime();
  if (t >= startOfToday) return "today";
  if (t >= startOfToday - 24 * 60 * 60 * 1000) return "yesterday";
  return "older";
}

export const NOTIFICATION_DATE_GROUP_LABELS: Readonly<
  Record<"today" | "yesterday" | "older", string>
> = {
  today: "اليوم",
  yesterday: "أمس",
  older: "أقدم",
};

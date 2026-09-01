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

type HrefFn = (data: Record<string, unknown> | null) => string;

export interface NotificationMeta {
  icon: LucideIcon;
  // class Tailwind من توكنات للنص
  colorClass: string;
  // class Tailwind لخلفية soft
  bgClass: string;
  // المسار عند النقر (إن كان ثابتاً؛ وإلا فالـ dynamic يُبنى من data)
  hrefFor?: HrefFn;
}

const STATIC: Partial<Record<NotificationType, NotificationMeta>> = {
  order_new: {
    icon: Package,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  order_confirmed: {
    icon: CheckCircle,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  order_preparing: {
    icon: ChefHat,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  order_out_for_delivery: {
    icon: Truck,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  order_delivered: {
    icon: PartyPopper,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  order_cancelled: {
    icon: XCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    hrefFor: (d) => `/orders/${d?.order_id ?? ""}`,
  },
  membership_new_request: {
    icon: Mail,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
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

/** المسار عند نقر الإشعار (لـ /notifications page). */
export function getNotificationHref(
  type: string | undefined,
  data: Record<string, unknown> | null
): string | null {
  const meta = getNotificationMeta(type);
  if (!meta.hrefFor) return null;
  const href = meta.hrefFor(data ?? null);
  // لا نُرجع مساراً برقم غير صالح (مثل /orders/)
  if (href.endsWith("/") || href.includes("undefined")) {
    // للحالات membership_* و facility_* و owner_* نُرجع المسار الثابت فقط
    if (href === "/account" || href === "/owner") return href;
    return null;
  }
  return href;
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

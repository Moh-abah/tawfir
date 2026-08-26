import {
  UtensilsCrossed,
  Coffee,
  Building2,
  Users,
  Package,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import type {
  FacilityType,
  OrderStatus,
  MembershipRequestStatus,
} from "@/types/api.generated";

export const TYPE_LABEL: Record<FacilityType, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
};

export const TYPE_ICON: Record<FacilityType, typeof UtensilsCrossed> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
};

export const FILTER_CHIPS = [
  { key: "all", label: "الكل" },
  { key: "restaurant", label: "مطاعم" },
  { key: "cafe", label: "كافيهات" },
] as const;

export type FilterKey = (typeof FILTER_CHIPS)[number]["key"];

export const SCHEMA_ORG_TYPE: Record<FacilityType, string> = {
  restaurant: "Restaurant",
  cafe: "CafeOrCoffeeShop",
};

export const NOTIFICATION_ICONS = {
  Store: Building2,
  UserPlus: Users,
  Package: Package,
  ShoppingBag: ShoppingBag,
  AlertTriangle: AlertTriangle,
  CreditCard: CreditCard,
} as const;

// ─── Order status labels + flow ───────────────────────
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكَّد",
  preparing: "قيد التحضير",
  out_for_delivery: "في الطريق إليك",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

/** التسلسل المرئي لشريط التتبّع. */
export const ORDER_TRACKING_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

/** الخريطة اللونية لكل حالة (توكنات CSS مخصّصة). */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  preparing: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  out_for_delivery:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

// ─── Membership request status labels ─────────────────
export const MEMBERSHIP_STATUS_LABEL: Record<MembershipRequestStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليها",
  rejected: "مرفوضة",
};

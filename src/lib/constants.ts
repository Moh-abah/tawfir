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

/**
 * الخريطة اللونية لكل حالة — هوية توفير الزمردية-الذهبية فقط (2-b):
 * بانتظار التأكيد = ذهبي (accent) · مؤكَّد = زمردي هادئ (primary)
 * قيد التحضير = فيروزي (secondary) · في الطريق = كحلي مميز (chart-4)
 * تم التوصيل = زمردي (success) · ملغى = destructive
 * (نص فاتح = accent-foreground لضمان تباين AA فوق الذهبي الفاتح)
 */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending:
    "bg-accent/15 text-accent-foreground dark:bg-accent/20 dark:text-accent",
  confirmed:
    "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  preparing:
    "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary",
  out_for_delivery:
    "bg-chart-4/10 text-chart-4 dark:bg-chart-4/20 dark:text-chart-4",
  delivered:
    "bg-success/15 text-success dark:bg-success/20 dark:text-success",
  cancelled:
    "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
};

// ─── Membership request status labels ─────────────────
export const MEMBERSHIP_STATUS_LABEL: Record<MembershipRequestStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليها",
  rejected: "مرفوضة",
};

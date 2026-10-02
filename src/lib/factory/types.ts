/** أنواع مشتقة من openapi.json — لا حقول مخترعة من الذاكرة */

export interface Completeness {
  percent: number;
  is_complete: boolean;
  missing: string[];
}

export interface BrandAsset {
  url: string;
  width?: number;
  height?: number;
  size_label?: string;
}

export interface BrandPackage {
  facility_id: number;
  display_name: string | null;
  tagline: string | null;
  colors: { primary: string | null; secondary: string | null };
  contacts: { phone: string | null; whatsapp: string | null; address: string | null };
  social_links: Record<string, string | null> | null;
  assets: Record<string, BrandAsset> | null;
  completeness: Completeness;
  currency: string;
}

export interface BrandFacilityRow {
  facility_id: number;
  name: string;
  completeness_percent: number;
  is_complete: boolean;
  missing: string[];
}

export interface TenantSiteFeatures {
  show_other_facilities: boolean;
  show_platform_banners: boolean;
  show_region_aggregation: boolean;
  show_cross_facility_offers: boolean;
  single_facility_mode: boolean;
}

export interface TenantSite {
  id: number;
  facility_id: number;
  facility_name?: string;
  slug: string;
  custom_domain: string | null;
  default_domain: string;
  effective_domain: string;
  site_title: string | null;
  seo_description: string | null;
  status: "draft" | "active" | "suspended" | string;
  features?: TenantSiteFeatures;
  brand_completeness?: Completeness;
  created_at?: string;
}

export interface ResolveResponse {
  site: {
    slug: string;
    domain: string;
    status: string;
    title: string;
    seo_description: string | null;
    features: TenantSiteFeatures;
  };
  brand: BrandPackage & { identity?: Record<string, unknown> };
  catalog: {
    products: string;
    offers: string;
    facility: string;
    orders: string;
    auth: string;
  };
  currency: string;
}

export interface TenantProduct {
  id: number;
  facility_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
}

export interface ConsoleBrandRow {
  facility_id: number;
  display_name: string;
  completeness: Completeness;
  currency?: string;
  colors?: { primary: string | null; secondary: string | null };
  assets?: Record<string, BrandAsset> | null;
}

export interface ConsoleApp {
  id: number;
  facility_id: number;
  facility_name?: string;
  package_id: string;
  display_name: string;
  platform: string;
  build_channel: string;
  status: "generating" | "signed" | "ready_for_store" | "published" | string;
  sha256?: string | null;
  manifest?: Record<string, unknown> | null;
  created_at?: string;
}

export interface ConsoleBuildJob {
  id: number;
  app_id?: number;
  build_id?: number;
  driver: string;
  status: string;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  created_at?: string;
}

export interface MerchantCourier {
  id: number;
  user_id: number;
  full_name: string;
  public_name: string | null;
  phone: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  facility_id: number;
  verification_status: string;
  verification_status_ar?: string;
  availability: string;
  completed_tasks: number;
  level_ar?: string;
  is_suspended?: boolean;
  status_ar?: string;
  created_at?: string;
}

export interface OtpRequestResponse {
  detail?: string;
  ttl_seconds?: number;
  delivered?: boolean;
  dev_code?: string;
  absolute_test_mode?: boolean;
}

export interface OrderRow {
  id: number;
  facility_id?: number;
  customer_name?: string;
  status: string;
  total_amount?: string;
  currency?: string;
  created_at?: string;
  [k: string]: unknown;
}

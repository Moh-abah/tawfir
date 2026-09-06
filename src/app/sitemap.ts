import type { MetadataRoute } from "next";
import { PUBLIC_URL } from "@/lib/site-config";

/**
 * sitemap.xml — الجولة 21 (webDevReview #9):
 * ديناميكي، يجلب كل المتاجر والمنتجات من الباك إند لفهرستها.
 * يُعاد توليده كل ساعة (revalidate=3600).
 */

const API_BASE = `${
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com"
}/api/v1`;

interface FacilityMeta {
  id: number;
  name: string;
}

interface ProductMeta {
  id: number;
}

async function fetchFacilities(): Promise<FacilityMeta[]> {
  try {
    const res = await fetch(`${API_BASE}/facilities`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as FacilityMeta[];
  } catch {
    return [];
  }
}

async function fetchProducts(): Promise<ProductMeta[]> {
  try {
    const res = await fetch(`${API_BASE}/products?page=1&page_size=200`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? data ?? []) as ProductMeta[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // الصفحات الثابتة الأساسية
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: PUBLIC_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${PUBLIC_URL}/facilities`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${PUBLIC_URL}/offers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${PUBLIC_URL}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${PUBLIC_URL}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${PUBLIC_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${PUBLIC_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // صفحات المتاجر (ديناميكية)
  const [facilities, products] = await Promise.all([
    fetchFacilities(),
    fetchProducts(),
  ]);

  const facilityPages: MetadataRoute.Sitemap = facilities.map((f) => ({
    url: `${PUBLIC_URL}/facilities/${f.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // صفحات المنتجات (ديناميكية)
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${PUBLIC_URL}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...facilityPages, ...productPages];
}

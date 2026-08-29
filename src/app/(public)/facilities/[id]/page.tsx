import type { Metadata } from "next";
import FacilityDetailContent from "./FacilityDetailContent";

/* قاعدة الـ API للـ SSR — المضيف من البيئة + البادئة القياسية /api/v1
   (الجولة 5: كانت الجلب يفشل 404 لأن NEXT_PUBLIC_API_URL بلا بادئة) */
const API_BASE = `${
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com"
}/api/v1`;

interface FacilityMeta {
  id: number;
  name: string;
  description: string | null;
}

async function getFacility(id: string): Promise<FacilityMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/facilities`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data: FacilityMeta[] = await res.json();
    return data.find((f) => f.id === Number(id)) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const facility = await getFacility(id);

  if (!facility) {
    return { title: "المتجر غير موجود | توفير" };
  }

  return {
    title: `${facility.name} | توفير`,
    description: facility.description ?? `${facility.name} — استعرض المنتجات والعروض على منصة توفير`,
    openGraph: {
      title: `${facility.name} | توفير`,
      description: facility.description ?? `${facility.name} — استعرض المنتجات والعروض على منصة توفير`,
      type: "website",
    },
  };
}

export default function FacilityDetailPage() {
  return <FacilityDetailContent />;
}

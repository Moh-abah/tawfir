import type { Metadata } from "next";
import ProductDetailContent from "./ProductDetailContent";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com/api/v1";

interface ProductMeta {
  id: number;
  name: string;
  description: string | null;
}

async function getProductMeta(id: string): Promise<ProductMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data: ProductMeta = await res.json();
    return data;
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
  const product = await getProductMeta(id);

  if (!product) {
    return { title: "الوجبة غير موجودة | توفير" };
  }

  return {
    title: `${product.name} | توفير`,
    description:
      product.description ??
      `${product.name} — اطلب من منصة توفير واستفد من خصم 30% إن كنت عضواً`,
    openGraph: {
      title: `${product.name} | توفير`,
      description:
        product.description ??
        `${product.name} — اطلب من منصة توفير واستفد من خصم 30% إن كنت عضواً`,
      type: "website",
    },
  };
}

export default function ProductDetailPage() {
  return <ProductDetailContent />;
}

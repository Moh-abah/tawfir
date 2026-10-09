import type { Metadata } from "next";
import ProductDetailContent from "./ProductDetailContent";

/* قاعدة الـ API للـ SSR — المضيف من البيئة + البادئة القياسية /api/v1
   (الجولة 5: كانت الجلب يفشل 404 لأن NEXT_PUBLIC_API_URL بلا بادئة) */
const API_BASE = `${
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com"
}/api/v1`;

interface ProductMeta {
  id: number;
  name: string;
  description: string | null;
  /** v3.2.1 — سوق المنتج (من محاولة الجلب الناجحة) لتعملة SEO */
  market?: "966" | "967";
}

/** عملة SEO انطلاقاً من سوق المنتج — طبقة SEO حصراً (مرآة currencyFromCountry). */
function seoCurrency(market: ProductMeta["market"]): string {
  return market === "966" ? "SAR" : "YER";
}

/** جلب المنتج للـSEO — بوابة المنتجات سوقية الآن، فنجرب السوقين بالترتيب. */
async function fetchProductMeta(id: string, market: "966" | "967") {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    headers: { "X-Market": market },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ProductMeta;
  return { ...data, market };
}

async function getProductMeta(id: string): Promise<ProductMeta | null> {
  try {
    /* السوقان متطابقان في البنية — النجاح الأول يحسم سوق المنتج */
    return (await fetchProductMeta(id, "966")) ?? (await fetchProductMeta(id, "967"));
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
      `${product.name} — اطلب من منصة توفير واستفد من خصومات حصرية إن كنت عضواً`,
    alternates: {
      canonical: `/products/${id}`,
    },
    openGraph: {
      title: `${product.name} | توفير`,
      description:
        product.description ??
        `${product.name} — اطلب من منصة توفير واستفد من خصومات حصرية إن كنت عضواً`,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductMeta(id);

  // الجولة 21 — structured data (schema.org/Product) للـSEO
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description:
          product.description ??
          `${product.name} — من منصة توفير مع خصومات حصرية للأعضاء`,
        brand: { "@type": "Brand", name: "توفير" },
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          priceCurrency: seoCurrency(product.market),
          seller: { "@type": "Organization", name: "توفير" },
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailContent />
    </>
  );
}

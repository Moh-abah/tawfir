"use client";

import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * فتات الخبز (Breadcrumbs) — الجولة 21 (SEO + UX).
 *
 * يُحسّن الـSEO عبر روابط داخلية واضحة + structured data (schema.org/BreadcrumbList)
 * ويُسهّل التنقل للمستخدم (إحساس Native وليس ويب).
 *
 * الاستخدام:
 *   <Breadcrumbs items={[{label:"الرئيسية",href:"/"},{label:"المتاجر",href:"/facilities"},{label:"مطعم صنعاء"}]} />
 */
interface BreadcrumbItem {
  label: string;
  href?: string; // undefined = العنصر الحالي (غير قابل للنقر)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  // structured data for SEO (schema.org/BreadcrumbList)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <nav aria-label="فتات الخبز" className={cn("w-full", className)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li>
          <Link
            href="/"
            className="native-tap inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="الرئيسية"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronLeft className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
            {item.href ? (
              <Link
                href={item.href}
                className="native-tap rounded-full px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-1.5 py-0.5 font-bold text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

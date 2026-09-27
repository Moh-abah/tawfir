"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Share2,
  Search,
  Link2,
  Image as ImageIcon,
  FileText,
  Type,
  Home,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import {
  readSharedStash,
  clearSharedStash,
  type SharedStash,
} from "@/lib/pwa/share-store";

/**
 * صفحة «مشاركة مستلمة» — وجهة share_target في الـmanifest
 * ═══════════════════════════════════════════════════════════════
 * عندما يشارك المستخدم نصاً/رابطاً/صورة من تطبيق آخر إلى توفير:
 *  1. المتصفح يرسل POST multipart إلى action الـmanifest.
 *  2. Service Worker يعترض الطلب، يخزّن المحتوى في IndexedDB،
 *     ويعيد التوجيه إلى هذه الصفحة (?received=1).
 *  3. هذه الصفحة تقرأ المخزون (وتنظّفه) وتعرض المعاينة + أزرار
 *     المتابعة: البحث بالنص / فتح الرابط / معاينة الصورة أو PDF.
 *
 * تستخدم مرتين بنفس الكود:
 *  • تطبيق العميل  → /share-target   (variant: customer)
 *  • بوابة المالك  → /owner/share-target (variant: owner)
 * وتقبل أيضاً المشاركات GET (?text=&title=&url=) القادمة من
 * متصفحات لا تدعم نمط POST.
 */

interface LoadResult {
  state: "loading" | "ready" | "empty";
  stash: SharedStash | null;
  fromQuery: SharedStash | null;
  previewUrl: string | null;
}

const INITIAL: LoadResult = { state: "loading", stash: null, fromQuery: null, previewUrl: null };

export function ShareTargetContent({
  variant = "customer",
}: {
  variant?: "customer" | "owner";
}) {
  const [result, setResult] = useState<LoadResult>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    const build = async () => {
      /* 1) المخزون القادم عبر الـSW (POST) — أولوية قصوى */
      const stored = await readSharedStash().catch(() => null);
      if (cancelled) return;

      let next: LoadResult;

      if (stored && (stored.file || stored.text || stored.url || stored.title)) {
        if (stored.file) {
          createdUrl = URL.createObjectURL(stored.file);
        }
        next = { state: "ready", stash: stored, fromQuery: null, previewUrl: createdUrl };
      } else {
        /* 2) مشاركة GET (?title=&text=&url=) — نمط قديم/بديل */
        const params = new URLSearchParams(window.location.search);
        const text = params.get("text") || params.get("q") || "";
        const title = params.get("title") || "";
        const url = params.get("url") || "";
        if (text || title || url) {
          next = {
            state: "ready",
            stash: null,
            fromQuery: { title, text, url, file: null, fileName: "", fileType: "", receivedAt: Date.now() },
            previewUrl: null,
          };
        } else {
          next = { state: "empty", stash: null, fromQuery: null, previewUrl: null };
        }
      }

      if (cancelled) {
        if (createdUrl) URL.revokeObjectURL(createdUrl);
        return;
      }
      setResult(next);
      /* المسح بعد الاستهلاك الفعلي فقط — آمن مع StrictMode (التأثير
         المكرر: الجولة الملغاة لا تمسح، والفعّالة تقرأ ثم تمسح) */
      if (next.stash) {
        void clearSharedStash();
      }
    };

    void build();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, []);

  const active = result.stash ?? result.fromQuery;
  const filePreviewUrl = result.previewUrl;
  const isImage = useMemo(
    () => Boolean(result.stash?.fileType.startsWith("image/")),
    [result.stash]
  );
  const safeUrl = useMemo(() => {
    if (!active?.url) return null;
    try {
      const parsed = new URL(active.url, window.location.origin);
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  }, [active]);

  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-4">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-md"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), var(--cap-safe-top, 0px))",
        }}
      >
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <TawfirLogo variant="mark" className="h-14 w-auto" />
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <Share2 className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-xs font-bold text-white/90">
              {variant === "owner" ? "مشاركة إلى بوابة المتاجر" : "مشاركة إلى توفير"}
            </span>
          </div>
        </div>

        {result.state === "loading" && (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
            <p className="text-sm text-white/70">جارٍ قراءة المحتوى المشارك…</p>
          </div>
        )}

        {result.state === "empty" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Share2 className="h-6 w-6 text-white/70" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-extrabold text-white">
              لا توجد مشاركة جديدة
            </h1>
            <p className="mt-2 text-sm leading-7 text-white/60">
              شارك وجبة أو رابطاً أو صورة من أي تطبيق آخر واختر «توفير»
              لتظهر هنا مباشرة.
            </p>
            <Button asChild className="mt-5 h-11 rounded-full px-6">
              <Link href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                الصفحة الرئيسية
              </Link>
            </Button>
          </div>
        )}

        {result.state === "ready" && active && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <h1 className="text-lg font-extrabold text-white">
              استلمنا مشاركتك
            </h1>
            <p className="mt-1 text-xs leading-6 text-white/60">
              محتوى مستلم من تطبيق آخر — اختر ما تريد فعله به.
            </p>

            <div className="mt-4 space-y-3">
              {active.title && (
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Type className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white/50">العنوان</p>
                    <p className="truncate text-sm font-bold text-white">
                      {active.title}
                    </p>
                  </div>
                </div>
              )}

              {active.text && (
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Type className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white/50">النص</p>
                    <p className="break-words text-sm text-white/90">
                      {active.text}
                    </p>
                  </div>
                </div>
              )}

              {filePreviewUrl && isImage && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={filePreviewUrl}
                    alt={result.stash?.fileName || "صورة مشاركة"}
                    className="max-h-72 w-full object-contain"
                  />
                  <div className="flex items-center gap-2 border-t border-white/10 p-3">
                    <ImageIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <p className="min-w-0 flex-1 truncate text-xs text-white/70">
                      {result.stash?.fileName}
                    </p>
                  </div>
                </div>
              )}

              {filePreviewUrl && !isImage && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <FileText className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {result.stash?.fileName}
                    </p>
                    <p className="text-xs text-white/50">ملف PDF</p>
                  </div>
                  <Button asChild variant="secondary" className="h-9 rounded-full px-4 text-xs">
                    <a href={filePreviewUrl} target="_blank" rel="noopener noreferrer">
                      عرض
                    </a>
                  </Button>
                </div>
              )}

              {safeUrl && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Link2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <p className="min-w-0 flex-1 truncate text-xs text-white/70">
                    {safeUrl}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {active.text && variant === "customer" && (
                <Button asChild className="h-12 rounded-full text-sm font-bold">
                  <Link
                    href={`/search?q=${encodeURIComponent(active.text)}`}
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    ابحث عنها في توفير
                  </Link>
                </Button>
              )}

              {safeUrl && (
                <Button
                  asChild
                  variant="secondary"
                  className="h-12 rounded-full text-sm font-bold"
                >
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    فتح الرابط
                  </a>
                </Button>
              )}

              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-full text-xs text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link href={variant === "owner" ? "/owner" : "/"} className="gap-2">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {variant === "owner" ? "الدخول إلى بوابة المتاجر" : "متابعة التسوق"}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

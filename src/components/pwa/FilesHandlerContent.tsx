"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileInput,
  Image as ImageIcon,
  FileText,
  Trash2,
  Home,
  FolderOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * صفحة «فتح ملفات بتوفير» — وجهة file_handlers في الـmanifest
 * ═══════════════════════════════════════════════════════════════
 * عند فتح صورة/PDF من مدير ملفات النظام واختيار «توفير»:
 *  1. نظام التشغيل يطلق التطبيق على action الـmanifest (/files أو /owner/files).
 *  2. هذا المكوّن يستقبل الملفات عبر window.launchQueue (Web File
 *     Handling API) ويعرض معاينتها فوراً.
 *  3. للتجربة اليدوية/المتصفحات القديمة: اختيار ملفات أو السحب والإفلات.
 */

interface LoadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  previewUrl: string;
}

interface LaunchParamsLike {
  files?: File[];
}

interface LaunchQueueLike {
  setConsumer: (consumer: (params: LaunchParamsLike) => void) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " بايت";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " ك.ب";
  return (bytes / (1024 * 1024)).toFixed(1) + " م.ب";
}

function toLoadedFiles(files: File[]): LoadedFile[] {
  return files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function FilesHandlerContent() {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [launchSupported, setLaunchSupported] = useState<boolean | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    /* استقبال الملفات من نظام التشغيل (File Handling API) */
    const launchQueue = (
      window as unknown as { launchQueue?: LaunchQueueLike }
    ).launchQueue;
    const supported = Boolean(
      launchQueue && typeof launchQueue.setConsumer === "function"
    );

    if (supported && launchQueue) {
      launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
          const loaded = toLoadedFiles(launchParams.files as File[]);
          loaded.forEach((file) => urlsRef.current.push(file.previewUrl));
          setFiles((prev) => [...loaded, ...prev]);
        }
      });
    }

    /* تحديث الحالة خارج مسار التأثير المتزامن (قاعدة set-state-in-effect) */
    const timer = window.setTimeout(() => {
      setLaunchSupported(supported);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  /* تحرير كل روابط المعاينة عند فكّ التركيب */
  useEffect(() => {
    const urls = urlsRef;
    return () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
    };
  }, []);

  const addFromInput = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const loaded = toLoadedFiles(Array.from(fileList));
    loaded.forEach((file) => urlsRef.current.push(file.previewUrl));
    setFiles((prev) => [...loaded, ...prev]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      <div
        className="relative z-10 mx-auto w-full max-w-lg px-4 py-8"
        style={{
          paddingTop: "max(2rem, env(safe-area-inset-top, 0px), var(--cap-safe-top, 0px))",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px), var(--cap-safe-bottom, 0px))",
        }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <TawfirLogo variant="mark" className="h-14 w-auto" />
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <FileInput className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-xs font-bold text-white/90">
              فتح ملفات بتوفير
            </span>
          </div>
          <p className="max-w-sm text-sm leading-7 text-white/60">
            افتح أي صورة أو ملف PDF من مدير الملفات واختر «توفير» لعرضه
            هنا مباشرة — مفيد لصور الوجبات وفواتير التاجر.
          </p>
          {launchSupported === false && (
            <p className="rounded-full bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200">
              فتح الملفات من النظام مدعوم في كروم/إيدج للتطبيق المثبت —
              يمكنك التجربة بالاختيار أو السحب أدناه.
            </p>
          )}
        </div>

        {/* منطقة السحب والاختيار */}
        <div
          role="button"
          tabIndex={0}
          aria-label="اختيار ملفات للمعاينة"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            addFromInput(event.dataTransfer.files);
          }}
          className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/10"
              : "border-white/20 bg-white/5 hover:border-white/40"
          }`}
        >
          <FolderOpen className="h-6 w-6 text-accent" aria-hidden="true" />
          <p className="text-sm font-bold text-white/80">
            اسحب ملفات هنا أو اضغط للاختيار
          </p>
          <p className="text-[11px] text-white/50">
            صور (PNG/JPG/WEBP/GIF) وملفات PDF
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="sr-only"
            onChange={(event) => {
              addFromInput(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {/* المعاينات */}
        {files.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-white/40" aria-hidden="true" />
            <p className="text-sm text-white/60">
              لا توجد ملفات معروضة بعد.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3" aria-label="الملفات المفتوحة">
            {files.map((file) => {
              const isImage = file.type.startsWith("image/");
              return (
                <li
                  key={file.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm"
                >
                  {isImage ? (
                    <img
                      src={file.previewUrl}
                      alt={file.name}
                      className="max-h-80 w-full bg-black/20 object-contain"
                    />
                  ) : (
                    <object
                      data={file.previewUrl}
                      type={file.type}
                      className="h-64 w-full bg-black/20"
                      aria-label={file.name}
                    >
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                        <FileText className="h-8 w-8 text-accent" aria-hidden="true" />
                        <p className="text-xs text-white/60">
                          معاينة PDF غير متاحة هنا — استخدم زر الفتح.
                        </p>
                      </div>
                    </object>
                  )}
                  <div className="flex items-center gap-3 border-t border-white/10 p-3">
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="secondary"
                      className="h-9 rounded-full px-4 text-xs"
                    >
                      <a
                        href={file.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        فتح
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`إزالة ${file.name}`}
                      onClick={() => removeFile(file.id)}
                      className="h-9 w-9 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-center">
          <Button
            asChild
            variant="ghost"
            className="h-11 rounded-full text-xs text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              الصفحة الرئيسية
            </Link>
          </Button>
        </div>

        {launchSupported === null && (
          <div className="mt-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-white/40" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

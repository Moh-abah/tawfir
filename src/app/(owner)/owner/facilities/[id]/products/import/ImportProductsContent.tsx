"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2, FileDown, Check, X as XIcon, Info, ClipboardList } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useImportProducts } from "@/hooks/useImportProducts";
import type { ProductImportResult } from "@/types/api.generated";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const ALLOWED_EXTENSIONS = [".xlsx", "..xls"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// ─── Generate Template ───
function downloadTemplate() {
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet([
      {
        name: "قهوة عربية",
        price: 15,
        category: "مشروبات",
        description: "قهوة عربية أصيلة",
        image_url: "",
        is_available: true,
        display_order: 0,
      },
    ]);
    ws["!cols"] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
      { wch: 12 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, "tawfir_product_template.xlsx");
  });
}

// ─── Client Validation ───
function validateFile(file: File): string | null {
  const ext = file.name.substring(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "يرجى اختيار ملف بامتداد .xlsx أو .xls";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "حجم الملف يتجاوز الحد المسموح (٢ ميجابايت)";
  }
  return null;
}

const COLUMN_LABELS: Record<string, string> = {
  name: "الاسم",
  price: "السعر",
  category: "التصنيف",
  description: "الوصف",
  image_url: "رابط الصورة",
  is_available: "متاح",
};

function ColumnItem({ name, required }: { name: string; required: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      {required ? (
        <Check className="h-4 w-4 shrink-0 text-secondary" />
      ) : (
        <XIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className="text-sm">
        {COLUMN_LABELS[name] ?? name}
        {required && <span className="text-destructive">*</span>}
      </span>
    </div>
  );
}

const STEP_LABELS: Record<number, { label: string; icon: typeof Upload }> = {
  1: { label: "رفع الملف", icon: Upload },
  2: { label: "مراجعة البيانات", icon: ClipboardList },
  3: { label: "استيراد", icon: CheckCircle2 },
};

function StepIndicator({ step, currentStep, prefersReduced }: { step: 1 | 2 | 3; currentStep: 1 | 2 | 3; prefersReduced: boolean | null }) {
  const isCompleted = step < currentStep;
  const isActive = step === currentStep;
  const { label, icon: StepIcon } = STEP_LABELS[step];

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
          isActive && "bg-primary text-primary-foreground border-primary",
          isCompleted && "bg-success text-white border-success",
          !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <Check className="h-4 w-4" />
        ) : (
          <StepIcon className="h-4 w-4" />
        )}
      </div>
      <span
        className={cn(
          "text-xs whitespace-nowrap",
          isActive && "font-semibold text-primary",
          isCompleted && "text-success",
          !isActive && !isCompleted && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </motion.div>
  );
}

export default function ImportProductsContent() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const router = useRouter();
const prefersReduced = usePrefersReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportProducts(facilityId);

  const handleFile = useCallback((f: File) => {
    setClientError(null);
    setResult(null);
    const err = validateFile(f);
    if (err) {
      setClientError(err);
      return;
    }
    setFile(f);
    setImportStep(2);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleUpload() {
    if (!file) return;
    setImportStep(3);
    importMutation.mutate(file, {
      onSuccess: (r) => setResult(r),
    });
  }

  function handleReset() {
    setFile(null);
    setClientError(null);
    setResult(null);
    setImportStep(1);
    importMutation.reset();
  }

  function handleExportErrorsCsv() {
    if (!result || result.errors.length === 0) return;
    const Q = '\u0022';
    const headers = ["الصف", "الحقل", "الرسالة"];
    const rows = result.errors.map((err) => {
      const record = err as Record<string, unknown>;
      return [
        String(record.row ?? ""),
        String(record.field ?? ""),
        String(record.message ?? ""),
      ];
    });
    function escapeCsv(val: string): string {
      return Q + val.replace(/\u0022/g, Q + Q) + Q;
    }
    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Result ───
  if (result) {
    const isSuccess = result.status === "success";
    const isPartial = result.status === "partial" || result.errors.length > 0;
    const statusColor = isSuccess
      ? "text-secondary"
      : isPartial
        ? "text-accent-ink"
        : "text-destructive";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">نتيجة الاستيراد</h1>
        </div>

        <motion.div
          {...cardAnimation}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            "rounded-2xl border-2 overflow-hidden",
            isSuccess ? "border-secondary/50" : isPartial ? "border-accent/50" : "border-destructive/50"
          )}>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <motion.div
                initial={prefersReduced ? { scale: 1 } : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {isSuccess ? (
                  <CheckCircle2 className="h-16 w-16 text-secondary" />
                ) : isPartial ? (
                  <AlertCircle className="h-16 w-16 text-accent-ink" />
                ) : (
                  <XCircle className="h-16 w-16 text-destructive" />
                )}
              </motion.div>
              <div>
                <p className={cn("text-lg font-bold", statusColor)}>{result.message}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  تم استيراد <strong>{result.imported_count}</strong> منتج
                  {result.errors.length > 0 && (
                    <span className="text-accent-ink">
                      {" "}مع <strong>{result.errors.length}</strong> خطأ
                    </span>
                  )}
                </p>
              </div>

              {/* Color-coded summary badges */}
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                  <span className="font-semibold text-secondary">{result.imported_count}</span>
                  <span className="text-muted-foreground">ناجح</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-sm">
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="font-semibold text-destructive">{result.errors.length}</span>
                    <span className="text-muted-foreground">خطأ</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Errors table */}
        {result.errors.length > 0 && (
          <motion.div
            {...cardAnimation}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">الأخطاء</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full min-h-[44px]"
                    onClick={handleExportErrorsCsv}
                  >
                    <Download className="h-4 w-4" />
                    <span>تصدير التقرير ({result.errors.length} أخطاء)</span>
                  </Button>
                </div>
                <div className="overflow-x-auto no-mobile-scrollbar rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">الصف</th>
                        <th className="px-3 py-2 text-start font-medium">الحقل</th>
                        <th className="px-3 py-2 text-start font-medium">الرسالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className={cn("border-t", idx % 2 === 1 && "bg-muted/30")}>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">
                              {String((err as Record<string, unknown>).row ?? idx + 1)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {String((err as Record<string, unknown>).field ?? "—")}
                          </td>
                          <td className="px-3 py-2 text-destructive">
                            {String((err as Record<string, unknown>).message ?? "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="flex gap-3">
          <Button
            className="rounded-full bg-primary text-white hover:bg-primary/90 min-h-[44px]"
            onClick={() => router.push(`/owner/facilities/${facilityId}/products`)}
          >
            العودة للمنتجات
          </Button>
          <Button variant="outline" className="rounded-full min-h-[44px]" onClick={handleReset}>
            استيراد ملف آخر
          </Button>
        </div>
      </div>
    );
  }

  // ─── Upload Form ───
  return (
    <motion.div
      className="space-y-6"
      variants={cardAnimation}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => router.back()}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">استيراد المنتجات</h1>
          <p className="text-sm text-muted-foreground">ارفع ملف Excel لاستيراد المنتجات بشكل جماعي</p>
        </div>
      </div>

      {/* Sample template download link */}
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
          <FileDown className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">لا تملك ملفا جاهزا؟</p>
          <p className="text-xs text-muted-foreground">حمّل قالب Excel الجاهز واملأ بيانات منتجاتك</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-full shrink-0"
          onClick={downloadTemplate}
        >
          <Download className="h-4 w-4" />
          تحميل القالب
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-6">
        <StepIndicator step={1} currentStep={importStep} prefersReduced={prefersReduced} />
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20 mx-2" />
        <StepIndicator step={2} currentStep={importStep} prefersReduced={prefersReduced} />
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20 mx-2" />
        <StepIndicator step={3} currentStep={importStep} prefersReduced={prefersReduced} />
      </div>

      {/* Supported columns checklist */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <p className="mb-3 text-sm font-semibold">الأعمدة المدعومة في القالب</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ColumnItem name="name" required />
          <ColumnItem name="price" required />
          <ColumnItem name="category" required={false} />
          <ColumnItem name="description" required={false} />
          <ColumnItem name="image_url" required={false} />
          <ColumnItem name="is_available" required={false} />
        </div>
      </div>

      {/* Import rules card */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <Info className="h-5 w-5 text-accent-ink" />
          </div>
          <div>
            <p className="font-semibold">القواعد:</p>
            <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
              <li>- يجب أن يحتوي الملف على الأعمدة المطلوبة</li>
              <li>- الأسعار بالريال اليمني (ر.ي)</li>
              <li>- الحد الأقصى 500 صف</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone — Enhanced */}
      <div
        className={cn(
          "relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all duration-300",
          importMutation.isPending
            ? "border-primary animate-pulse bg-primary/5"
            : isDragging
              ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/5"
              : file
                ? "border-secondary/50 bg-secondary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <AnimatePresence mode="wait">
          {importMutation.isPending ? (
            <motion.div
              key="importing"
              className="flex flex-col items-center gap-4 text-center"
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {/* Animated progress ring */}
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="6"
                    opacity="0.3"
                  />
                  <motion.circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={213.6}
                    animate={prefersReduced ? { strokeDashoffset: 106.8 } : { strokeDashoffset: [213.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
                <FileSpreadsheet className="absolute h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold">جارٍ الاستيراد...</p>
            </motion.div>
          ) : file ? (
            <motion.div
              key="file"
              className="flex flex-col items-center gap-4 text-center"
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10">
                <FileSpreadsheet className="h-10 w-10 text-secondary" />
              </div>
              <div>
                <p className="font-semibold">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} كيلوبايت
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              className="flex flex-col items-center gap-4 text-center"
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-300",
                isDragging ? "bg-primary/10" : "bg-muted/50"
              )}>
                <Upload className={cn(
                  "h-10 w-10 transition-colors duration-300",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? "أفلت الملف هنا" : "اسحب ملف Excel هنا أو "}<span className="text-primary">انقر للاختيار</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  xlsx أو xls — بحد أقصى ٢ ميجابايت
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Client error */}
      {clientError && (
        <motion.div
          className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {clientError}
        </motion.div>
      )}

      {/* Server error */}
      {importMutation.isError && (
        <motion.div
          className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {importMutation.error.message}
        </motion.div>
      )}

      {/* Progress */}
      {importMutation.isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ رفع الملف واستيراد المنتجات...
          </div>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="gap-2 rounded-full min-h-[44px]"
          onClick={downloadTemplate}
        >
          <Download className="h-4 w-4" />
          تحميل قالب جاهز
        </Button>
        <Button
          className="gap-2 rounded-full bg-primary text-white hover:bg-primary/90 min-h-[44px]"
          disabled={!file || importMutation.isPending}
          onClick={handleUpload}
        >
          {importMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          استيراد
        </Button>
      </div>
    </motion.div>
  );
}

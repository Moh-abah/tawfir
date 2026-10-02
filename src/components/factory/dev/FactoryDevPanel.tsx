"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiPost } from "@/lib/factory/api";
import { useSession } from "@/store/session";
import { ErrorBox } from "@/components/factory/shared/Bits";
import {
  BellRing,
  CircleAlert,
  Download,
  FileCode2,
  Github,
  KeyRound,
  Loader2,
  SendHorizonal,
  ShieldAlert,
  Terminal,
  TriangleAlert,
} from "lucide-react";

/* ───────────────────────── بيانات موثقة من الاختبار الفعلي ─────────────────────────
 * خلاصة dry-run المحفوظة في factory-evidence/dry-run.log و dry-run-files.txt
 * (sample-manifest.json: منشأة 28 — com.wajh.demoapp — أصول حية من api.tawfir.giize.com)
 */
const DRY_RUN_CMD = "node scripts/apply-factory-manifest.mjs factory-evidence/sample-manifest.json --root /tmp/factory-dryrun --dry-run";
const REAL_RUN_CMD = "node scripts/apply-factory-manifest.mjs factory-evidence/sample-manifest.json --root /tmp/factory-dryrun";

const DRY_RUN_SUMMARY = {
  planned: 14,
  downloads: 3,
  written: 13,
  skipped: 1,
  errors: 0,
};

/** القائمة الفعلية للملفات الناتجة عن التطبيق الفعلي (مطابقة لـ ls -R في factory-evidence/dry-run-files.txt) */
const REAL_RUN_FILES: { path: string; note: string }[] = [
  { path: "capacitor.config.json", note: "appId=com.wajh.demoapp · appName=مطعم واجهة التجريبي · webDir=out" },
  { path: "src/config/brand.json", note: "الهوية + الألوان #E23744/#2E7D32 + apiBase + العملة «ريال يمني»" },
  { path: "src/assets/brand/logo.png", note: "تنزيل حي 5,411B من /uploads/brand_assets/…" },
  { path: "src/assets/brand/app_icon.png", note: "تنزيل حي 4,157B" },
  { path: "src/assets/brand/splash.png", note: "تنزيل حي 9,328B" },
  { path: "android/…/res/mipmap-{mdpi..xxxhdpi}/ic_launcher.png", note: "5 كثافات — نسخ المصدر الواحد (بصدق: بلا تحجيم)" },
  { path: "android/…/res/drawable{,-port,-land}/splash.png", note: "3 اتجاهات — نسخ المصدر الواحد" },
  { path: "android/app/google-services.json", note: "تخطٍّ مفهوم: غير موجود في الحزمة النموذجية — يُستكمل قبل بناء FCM" },
];

/** خريطة أسرار TAWFIR_* — أسماء فقط، لا قيم إطلاقاً */
const SECRET_MAP: { name: string; purpose: string; injected: string }[] = [
  {
    name: "TAWFIR_KEYSTORE_BASE",
    purpose: "ملف keystore التوقيع مُرمَّز Base64 — يُفك في خطوة أولى من الـworkflow إلى upload-keystore.jks",
    injected: "GitHub repo secrets ← decode → android/app/upload-keystore.jks",
  },
  {
    name: "TAWFIR_STORE_PASSWORD",
    purpose: "كلمة مرور مخزن المفاتيح (store password) — تُمرَّر لـGradle عبر متغيرات بيئة",
    injected: "GitHub repo secrets ← build.gradle signingConfig",
  },
  {
    name: "TAWFIR_KEY_ALIAS",
    purpose: "اسم مفتاح التوقيع داخل الـkeystore",
    injected: "GitHub repo secrets ← signingConfig.keyAlias",
  },
  {
    name: "TAWFIR_KEY_PASSWORD",
    purpose: "كلمة مرور المفتاح نفسه (key password)",
    injected: "GitHub repo secrets ← signingConfig.keyPassword",
  },
];

/** مقطع YAML مصغر توضيحي لقالب app-factory-build.yml (موجود في مستودع الباك إند) */
const YAML_SNIPPET = `name: app-factory-build
on:
  repository_dispatch:            # يطلقه الباك إند عند POST /console/apps
    types: [app-factory-build]
  workflow_dispatch:              # تشغيل يدوي للتشخيص
jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Decode keystore from TAWFIR_KEYSTORE_BASE
        env:
          TAWFIR_KEYSTORE_BASE: \${{ secrets.TAWFIR_KEYSTORE_BASE }}
        run: echo "$TAWFIR_KEYSTORE_BASE" | base64 -d > android/app/upload-keystore.jks
      - name: Build signed AAB + APK
        env:                      # بقية أسرار TAWFIR_* تُحقن هنا بلا طباعة
          TAWFIR_STORE_PASSWORD: \${{ secrets.TAWFIR_STORE_PASSWORD }}
          TAWFIR_KEY_ALIAS:         \${{ secrets.TAWFIR_KEY_ALIAS }}
          TAWFIR_KEY_PASSWORD:      \${{ secrets.TAWFIR_KEY_PASSWORD }}
        run: ./gradlew bundleRelease assembleRelease
      - name: Report result → /console/build-jobs/{job_id}/result
        run: |
          curl -X POST "$API/api/v1/console/build-jobs/$JOB_ID/result" \\
            -H "Authorization: Bearer $CONSOLE_TOKEN" \\
            -d '{"succeeded": true,
                 "artifacts": {"apk": "<url>", "aab": "<url>"}}'`;

/** عقد POST /fcm/token من openapi.json — FcmTokenRegister (token إلزامي 10-500) */
const FCM_CONTRACT = `POST /fcm/token
{
  "token":       string  (إلزامي، 10..500 حرف) — توكن FCM
  "device_info": string? (حتى 500) — user-agent / platform
  "bundle_id":   string? (حتى 120) — بصمة تطبيق التجار المولَّد
}`;

/* ═══════════════════════════ المكون الرئيسي ═══════════════════════════ */

export function FactoryDevPanel() {
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">التعبئة وFCM — مهام E + F</h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          سكربت تعبئة قالب التطبيق من الحزمة الكونسولية + خريطة أسرار التوقيع + قالب GitHub Actions +
          تسجيل توكن FCM — كل شيء مبني على عقد الباك الحي في openapi.json
        </p>
      </header>

      <ScriptSection />
      <SecretsSection />
      <GithubActionsSection />
      <FcmSection />
      <LimitsAlert />
    </div>
  );
}

/* ───────────────────────── القسم 1: سكربت التعبئة (E) ───────────────────────── */

function ScriptSection() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openDialog = async () => {
    setOpen(true);
    if (code) return; // مخزّن من فتح سابق
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/factory/apply-factory-manifest.mjs", { cache: "no-store" });
      if (!res.ok) throw new Error(`فشل جلب السكربت (HTTP ${res.status})`);
      setCode(await res.text());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر جلب نص السكربت");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <FileCode2 className="h-4 w-4 text-emerald-700" /> سكربت تعبئة قالب التطبيق (المهمة E)
          <Badge variant="outline" className="font-mono text-[10px]">Node صافٍ — صفر تبعيات</Badge>
        </CardTitle>
        <CardDescription className="leading-relaxed">
          يقرأ manifest.json من الحزمة الكونسولية (ZIP الصادرة عن POST /console/apps) ثم يعبّئ القالب:
          capacitor.config.json (appId/appName من package_id/identity) + src/config/brand.json
          (الهوية والألوان والعملة وapiBase) + تنزيل الأصول إلى src/assets/brand/ + أيقونات res
          الأساسية + google-services.json — ومعه <span className="font-semibold">--dry-run</span> يطبع
          خطة الفروق سطراً سطراً بلا كتابة أي ملف. webDir=&quot;out&quot; لأن القالب Next.js static export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-stone-500">مسار السكربت في المستودع (mono):</p>
          <code dir="ltr" className="block overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-xs text-stone-800">
            scripts/apply-factory-manifest.mjs
          </code>
          <p className="mb-1 mt-3 text-xs font-semibold text-stone-500">الاستخدام:</p>
          <code dir="ltr" className="block overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-xs text-stone-800">
            node scripts/apply-factory-manifest.mjs &lt;manifest.json&gt; [--root &lt;dir&gt;] [--dry-run]
          </code>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={openDialog} className="gap-1.5">
            <Terminal className="h-4 w-4" /> عرض السكربت
          </Button>
          {/* تنزيل مباشر من مجلد public/factory */}
          <Button variant="secondary" asChild className="gap-1.5">
            <a href="/factory/apply-factory-manifest.mjs" download="apply-factory-manifest.mjs">
              <Download className="h-4 w-4" /> تنزيل السكربت
            </a>
          </Button>
        </div>

        {/* بطاقة نتائج dry-run الموثقة — من اختبار فعلي منفَّذ على هذه الحزمة */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
            <CircleAlert className="h-4 w-4" /> نتائج الاختبار الموثقة (dry-run ثم تطبيق فعلي)
          </p>
          <div className="mb-3 space-y-1">
            <code dir="ltr" className="block overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-[11px] text-stone-700">
              $ {DRY_RUN_CMD}
            </code>
            <code dir="ltr" className="block overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-[11px] text-stone-700">
              $ {REAL_RUN_CMD}
            </code>
            <p className="text-[11px] text-emerald-800">
              الأدلة محفوظة: <span className="font-mono">factory-evidence/dry-run.log</span> +{" "}
              <span className="font-mono">factory-evidence/dry-run-files.txt</span> — المخرجات في /tmp خارج المستودع
            </p>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">dry-run: {DRY_RUN_SUMMARY.planned} عملية مخططة · 3 تنزيلات · صفر كتابة · exit 0</Badge>
            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">فعلي: {DRY_RUN_SUMMARY.written} ملفات مكتوبة · {DRY_RUN_SUMMARY.errors} أخطاء</Badge>
            <Badge variant="outline" className="border-amber-300 bg-white text-amber-800">تخطٍّ موثق: {DRY_RUN_SUMMARY.skipped} (google-services.json غير موجود في الحزمة النموذجية)</Badge>
          </div>
          <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {REAL_RUN_FILES.map((f) => (
              <div key={f.path} className="flex flex-col gap-0.5 rounded-lg border border-emerald-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <code dir="ltr" className="shrink-0 text-left font-mono text-[11px] font-semibold text-stone-800">{f.path}</code>
                <span className="text-[11px] text-stone-500">{f.note}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            الأصول الثلاثة نُزِّلت فعلياً من روابط حية على api.tawfir.giize.com (منشأة #28 المكتملة 100%) —
            وأُعيد نسخها إلى كثافات mipmap الخمس ومجلدات drawable الثلاثة بنفس المصدر.
          </p>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-700" /> scripts/apply-factory-manifest.mjs
            </DialogTitle>
            <DialogDescription>
              السكربت الفعلي المستخدم في الاختبار — نفس النسخة في public/factory/ القابلة للتنزيل
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> جارٍ جلب نص السكربت…
            </div>
          )}
          {err && <ErrorBox error={err} />}
          {code && (
            <pre dir="ltr" className="max-h-96 overflow-auto text-xs leading-relaxed">
              <code className="block rounded-lg bg-stone-950 p-4 font-mono text-[11px] text-stone-100">{code}</code>
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────────────────────── القسم 2: خريطة أسرار TAWFIR_* ───────────────────────── */

function SecretsSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-emerald-700" /> خريطة أسرار التوقيع TAWFIR_*
          <Badge variant="outline" className="font-mono text-[10px]">أسماء فقط — لا قيم</Badge>
        </CardTitle>
        <CardDescription>
          أسماء متغيرات التوقيع التي يطبعها السكربت في خلاصة build_job.json — القيم لا تُقرأ ولا تُكتب
          في أي ملف أو تقرير إطلاقاً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-start">اسم المتغير</TableHead>
                <TableHead className="text-start">وظيفته</TableHead>
                <TableHead className="text-start">أين يُحقن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SECRET_MAP.map((s) => (
                <TableRow key={s.name}>
                  <TableCell>
                    <code dir="ltr" className="block text-left font-mono text-xs font-bold text-stone-900">{s.name}</code>
                  </TableCell>
                  <TableCell className="text-xs leading-relaxed text-stone-700">{s.purpose}</TableCell>
                  <TableCell className="text-xs leading-relaxed text-stone-600">{s.injected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3" role="alert">
          <p className="flex items-start gap-2 text-sm font-bold text-rose-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            قيم الأسرار تُسلَّم للمالك في ملف مغلق خارج أي مستودع أو تقرير
          </p>
          <p className="mt-1 ps-6 text-xs leading-relaxed text-rose-800">
            التسليم يتم فقط عبر قناة مباشرة للمالك (ملف مغلق) — ثم يضيفها مالكاً لمستودع البناء مرة واحدة:
            <code dir="ltr" className="mx-1 rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[11px]">gh secret set TAWFIR_KEYSTORE_BASE &lt; keystore.b64</code>
            وهكذا لبقية الأسماء. لا يظهر أي سر في سجلات GitHub Actions ولا في ZIP الكونسول ولا في هذا التطبيق.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── القسم 3: GitHub Actions (E) ───────────────────────── */

function GithubActionsSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Github className="h-4 w-4 text-emerald-700" /> قالب البناء GitHub Actions — app-factory-build.yml
          <Badge variant="outline" className="font-mono text-[10px]">deploy/github-actions/ في مستودع الباك إند</Badge>
        </CardTitle>
        <CardDescription className="leading-relaxed">
          دورة حياة بناء تطبيق تاجر موقَّع: الباك إند يطلق <span className="font-mono text-xs">repository_dispatch</span>
          بعد إصدار التطبيق (POST /console/apps) — الـworkflow يفك keystore من TAWFIR_KEYSTORE_BASE، يبني AAB/APK
          موقَّعين بأسرار TAWFIR_* الأخرى، ويُصدّر iOS خلف مفتاح (يحتاج حساب Apple مطوّر) — ثم يبلّغ النتيجة
          حرفياً إلى العقد الموثق:{" "}
          <span className="font-mono text-xs" dir="ltr">POST /console/build-jobs/&#123;job_id&#125;/result</span>{" "}
          بجسم <span className="font-mono text-xs" dir="ltr">&#123;succeeded, artifacts&#123;apk, aab&#125;&#125;</span>{" "}
          (BuildResult في openapi.json — artifacts إما {`{"aab","apk","ipa"}`} أو null عند الفشل مع error).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre dir="ltr" className="max-h-96 overflow-auto text-xs leading-relaxed">
          <code className="block rounded-lg bg-stone-950 p-4 font-mono text-[11px] text-stone-100">{YAML_SNIPPET}</code>
        </pre>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          مقطع مصغّر توضيحي — القالب الفعلي في مستودع الباك إند على المسار deploy/github-actions/app-factory-build.yml
          ويستهلك نفس أسماء الأسرار أعلاه بلا أي تغيير.
        </p>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── القسم 4: تسجيل توكن FCM (F) ───────────────────────── */

function FcmSection() {
  const token = useSession((s) => s.tokens.owner);
  const [fcmToken, setFcmToken] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("android-merchant");
  const [bundleId, setBundleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setRawResponse(null);
    // الجسم حرفياً وفق FcmTokenRegister — bundle_id يُرسل فقط إن مُلئ (اختياري في العقد)
    const body: Record<string, string> = { token: fcmToken, device_info: deviceInfo };
    if (bundleId.trim()) body.bundle_id = bundleId.trim();
    const r = await apiPost<unknown>("/fcm/token", body, token);
    setBusy(false);
    if (r.ok) {
      setRawResponse(`HTTP ${r.status}\n${JSON.stringify(r.data, null, 2)}`);
      toast.success("تمت استدعاء العقد بنجاح", { description: `HTTP ${r.status}` });
    } else {
      setErr({ error: `HTTP ${r.status} — ${r.error}`, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-emerald-700" /> تسجيل توكن FCM (المهمة F)
          <Badge variant="outline" className="font-mono text-[10px]">POST /fcm/token</Badge>
        </CardTitle>
        <CardDescription className="leading-relaxed">
          العقد من openapi.json (FcmTokenRegister): توكن الإشعارات يُسجَّل لجهاز المستخدم الحالي.
          <span className="font-semibold"> bundle_id يأتي من manifest.package_id</span> في تطبيقات التجار
          المولَّدة — أما التطبيق الرئيسي فيرسل <span className="font-semibold">بلا بصمة (bundle_id فارغ)
          بصفر تغيير في كوده</span>. المالك هنا هو المستخدم الحالي المُصادَق.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre dir="ltr" className="max-h-40 overflow-auto text-xs leading-relaxed">
          <code className="block rounded-lg bg-stone-950 p-3 font-mono text-[11px] text-stone-100">{FCM_CONTRACT}</code>
        </pre>

        {!token ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            يتطلب توكن مالك فعّالاً — سجّل الدخول من بوابة المالك في لوحة «حزمة الهوية» (المصدر الوحيد
            للتوكن هو جلسة حقيقية، لا يوجد توكن مصمت هنا).
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fcm-token">توكن FCM (لصق)</Label>
              <Input
                id="fcm-token"
                dir="ltr"
                required
                minLength={10}
                maxLength={500}
                placeholder="fXx… (توكن Firebase من الجهاز)"
                className="text-left font-mono text-xs"
                value={fcmToken}
                onChange={(e) => setFcmToken(e.target.value)}
              />
              <p className="text-[11px] text-stone-500">إلزامي 10–500 حرف وفق العقد</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcm-device">device_info</Label>
              <Input
                id="fcm-device"
                dir="ltr"
                maxLength={500}
                className="text-left font-mono text-xs"
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
              />
              <p className="text-[11px] text-stone-500">الافتراضي android-merchant (اختياري في العقد)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcm-bundle">bundle_id (اختياري)</Label>
              <Input
                id="fcm-bundle"
                dir="ltr"
                maxLength={120}
                placeholder="com.wajh.demoapp"
                className="text-left font-mono text-xs"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
              />
              <p className="text-[11px] text-stone-500">في تطبيق تاجر مولَّد يُملأ من manifest.package_id</p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                {busy ? "جارٍ التسجيل…" : "سجّل التوكن"}
              </Button>
            </div>

            <div className="sm:col-span-2">
              <ErrorBox error={err?.error} errors={err?.errors} />
            </div>

            {rawResponse && (
              <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-xs font-bold text-emerald-900">رد الخادم حرفياً:</p>
                <pre dir="ltr" className="max-h-48 overflow-auto text-xs">
                  <code className="font-mono text-[11px] text-emerald-950">{rawResponse}</code>
                </pre>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-stone-500 sm:col-span-2">
              وثّق: <span className="font-semibold">دون توكن FCM صالح سيرفضه الخادم وهذا مقصود</span> —
              الخادم يتحقق من التوكن عبر Firebase، فالغرض هنا إثبات العقد الحي وعرض الرد الحرفي (نجاح
              200 أو الخطأ كما ورد). التوكن يُستبدل تلقائياً عند تجديده من الجهاز نفسه.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── القسم 5: حدود موثقة بصدق ───────────────────────── */

function LimitsAlert() {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
      <TriangleAlert className="text-amber-600" />
      <AlertTitle className="font-bold">حدود موثقة بصدق</AlertTitle>
      <AlertDescription className="text-amber-800">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            بناء Android فعلي (Gradle → AAB/APK موقَّع) غير مُنفَّذ في بيئة الواجهة — لا Android SDK ولا
            Gradle هنا؛ القالب يجري داخل مستودع الباك إند عبر GitHub Actions.
          </li>
          <li>
            قالب Capacitor للتطبيق القائم يبقى المرجع: نفس كود تطبيق العميل + قراءة src/config/brand.json
            عند الإقلاع (app_name / colors / assets / apiBase / currency) — السكربت يعبّئ هذا القالب ولا
            يُنشئ كوداً جديداً.
          </li>
          <li>
            أيقونات res الأساسية في السكربت نسخ بمصدر واحد لكل الكثافات — التوليد الكامل متعدد الأحجام
            (48/72/96/144/192px) يتم بأداة res خارجية مثل @capacitor/assets قبل النشر.
          </li>
          <li>
            google-services.json يأتي من الحزمة الكونسولية — غيابه في النموذج هنا تخطٍّ موثق، ويُستكمل
            قبل أي بناء يعتمد FCM.
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

#!/usr/bin/env bun
/**
 * sync-version.mjs — مزامنة APP_VERSION من مصدر واحد (package.json)
 * ═══════════════════════════════════════════════════════════════════
 * المشكلة التي يحلها:
 *   كان الإصدار مكرراً في ملفات متعددة:
 *     • package.json            → "version": "1.1.0"
 *     • src/lib/pwa/version.ts  → APP_VERSION = "1.2.0"   ← تعارض!
 *   والـ Service Worker يُحقن رقم الإصدار من version.ts بينما
 *   PWABuilder/الأدوات تقرأ من package.json → تضارب في التحديثات.
 *
 * الحل — قاعدة "مصدر واحد للحقيقة":
 *   • package.json هو المصدر الرسمي الوحيد لرقم الإصدار.
 *   • هذا السكربت يقرأه ويولّد src/lib/pwa/version.ts تلقائياً.
 *   • يعمل تلقائياً عبر predev/prebuild — يستحيل نسيانه.
 *   • يمكن تشغيله يدوياً: bun run version:sync
 *
 * ماذا يفحص أيضاً (تقرير فقط بلا تعديل — ملفات مرجعية):
 *   • native-shell/index.html (لا يحمل إصداراً — يُفحص للاطمئنان)
 *   • capacitor.config.ts (لا يحمل إصداراً)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG_PATH = resolve(ROOT, "package.json");
const VERSION_TS_PATH = resolve(ROOT, "src/lib/pwa/version.ts");

/* 1) اقرأ الإصدار من المصدر الرسمي: package.json */
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const version = String(pkg.version || "").trim();

if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(
    `[sync-version] ✗ صيغة إصدار غير صالحة في package.json: "${version}" (متوقع semver مثل 1.2.0)`
  );
  process.exit(1);
}

/* 2) اقرأ ملف version.ts الحالي — نقارن قبل الكتابة (Idempotent) */
const TEMPLATE = (v) => `/**
 * رقم إصدار تطبيقي «توفير» (العميل + المالك).
 * ═══════════════════════════════════════════════════════════
 * ⚠️ لا تُعدّل هذا الملف يدوياً — مولّد آلياً بواسطة:
 *      bun run version:sync        (أو تلقائياً مع predev/prebuild)
 *
 * المصدر الرسمي الوحيد للإصدار: package.json → "version"
 * هذا الملف يستهلكه:
 *   • /sw.js route      → حقن VERSION في Service Worker (كاش جديد = تحديث)
 *   • ServiceWorkerRegistrar → شريحة «يتوفر تحديث للإصدار X»
 *   • شاشة الإعدادات     → عرض الإصدار للمستخدم
 */
export const APP_VERSION = "${v}";
`;

let current = null;
let currentSource = "";
if (existsSync(VERSION_TS_PATH)) {
  currentSource = readFileSync(VERSION_TS_PATH, "utf8");
  const match = currentSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
  if (match) current = match[1];
}

/* 3) أكتب/حدّث الملف عند الحاجة */
if (current === version && currentSource.includes("مولّد آلياً")) {
  console.log(`[sync-version] ✓ الإصدار متزامن بالفعل: ${version}`);
} else {
  writeFileSync(VERSION_TS_PATH, TEMPLATE(version), "utf8");
  console.log(
    `[sync-version] ${current ? `✓ حُدّث ${current} → ${version}` : `✓ وُلّد الإصدار ${version}`} في src/lib/pwa/version.ts`
  );
}

/* 4) تقرير فحص إضافي — أي إصدارات أخرى صريحة في المشروع؟ */
const extraFiles = [
  "capacitor.config.ts",
  "native-shell/index.html",
  "public/native-offline.html",
];
const stale = [];
for (const rel of extraFiles) {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, "utf8");
  const found = [...src.matchAll(/"?(1|2)\.\d+\.\d+"?/g)].map((m) => m[0]);
  if (found.length) stale.push(`  ${rel}: ${[...new Set(found)].join(", ")}`);
}
if (stale.length) {
  console.log(`[sync-version] ⚠ إصدارات صريحة في ملفات أخرى (راجعها):`);
  console.log(stale.join("\n"));
} else {
  console.log(`[sync-version] ✓ لا إصدارات متضاربة في الملفات المرجعية`);
}

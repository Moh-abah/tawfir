#!/usr/bin/env bun
/**
 * gen-api-types.mjs — أتمتة طبقة أنواع API من openapi_live.json
 * ═════════════════════════════════════════════════════════════════════
 * الأنابيب (Pipeline):
 *   openapi_live.json
 *     + scripts/openapi-patches.json   (فروق السكمة المتقادمة عن الحي)
 *     ──(دمج)──▶ .openapi-patched.json (مؤقت)
 *     ──(openapi-typescript)──▶ src/types/api.openapi.ts
 *     ──(هذا السكربت)──▶ src/types/api.generated.ts
 *          = إعادة تصدير مسطّحة لكل المخططات + الأسماء التاريخية
 *            + export * من api-extra.ts (أنواع ليست في السكمة أصلاً:
 *              OTP، العضوية المجانية، الإشعارات الحقلية…)
 *
 * لماذا الترقيعات (patches)؟
 *   openapi_live.json نسخة محفوظة من /openapi.json وقد تتأخر عن الباك إند
 *   الحي (حقول أضيفت في جولات لاحقة). الترقيعات تصرّح بالفرق صراحة كي
 *   تتطابق الأنواع المولّدة مع سلوك الحي الحقيقي — وكل ترقيع يُبلَّغ
 *   عنه في التقرير؛ عند تحديث السكمة الرسمية يصبح الترقيع زائداً
 *   (no-op) فتُزاله وتنظّف api-extra.ts.
 *
 * قاعدة الأولوية عند تضارب الاسم:
 *   أسماء api-extra.ts تُصدَّر يدوياً؛ المولّد يتخطى أسماءها في إعادة
 *   التصدير لتفادي تعارض التصدير (ES export * يتجاهل المتعارض تلقائياً
 *   لكن التصريح الصريح أنظف). الأسماء التاريخية (Card, Facility…)
 *   تُصدَّر دائماً — تحل عبر أي مصدر متاح في الوحدة.
 *
 * التشغيل: bun run api:types
 * تحديث السكمة: curl https://api.tawfir.giize.com/openapi.json > openapi_live.json && bun run api:types
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = resolve(ROOT, "openapi_live.json");
const PATCHES = resolve(ROOT, "scripts/openapi-patches.json");
const PATCHED = resolve(ROOT, ".openapi-patched.json");
const OPENAPI_TS = resolve(ROOT, "src/types/api.openapi.ts");
const GENERATED = resolve(ROOT, "src/types/api.generated.ts");
const EXTRA = resolve(ROOT, "src/types/api-extra.ts");

if (!existsSync(SPEC)) {
  console.error("[api:types] ✗ openapi_live.json غير موجود في جذر المشروع");
  process.exit(1);
}

/* ─── 1) ادمج الترقيعات في نسخة مؤقتة من السكمة ─── */
const spec = JSON.parse(readFileSync(SPEC, "utf8"));
const patches = existsSync(PATCHES)
  ? JSON.parse(readFileSync(PATCHES, "utf8"))
  : {};
const applied = [];
const noops = [];

for (const [name, patch] of Object.entries(patches)) {
  if (name.startsWith("$")) continue;
  const schema = spec.components?.schemas?.[name];
  if (!schema) {
    console.warn(`[api:types] ⚠ ترقيع لمخطط غير موجود في السكمة: ${name} — يُتخطى`);
    continue;
  }
  let changed = false;
  if (patch.required) {
    const merged = [...new Set([...(schema.required ?? []), ...patch.required])];
    if (JSON.stringify(merged) !== JSON.stringify(schema.required ?? [])) {
      schema.required = merged;
      changed = true;
    }
  }
  if (patch.properties) {
    schema.properties = { ...(schema.properties ?? {}), ...patch.properties };
    changed = true;
  }
  if (changed) applied.push(name);
  else noops.push(name);
}

writeFileSync(PATCHED, JSON.stringify(spec), "utf8");
if (applied.length) {
  console.log(`[api:types] طُبّقت ${applied.length} ترقيعاً (سكمة متقادمة عن الحي):`);
  for (const n of applied) console.log(`    • ${n}`);
}
if (noops.length) {
  console.log(`[api:types] ℹ ترقيعات زائدة (السكمة الرسمية لَحِقت بها — يمكن حذفها):`);
  for (const n of noops) console.log(`    • ${n}`);
}

/* ─── 2) شغّل openapi-typescript على السكمة المرقّعة ─── */
console.log("[api:types] توليد src/types/api.openapi.ts…");
const candidates = [
  ["bun", ["x", "openapi-typescript", ".openapi-patched.json", "--output", "src/types/api.openapi.ts"]],
  ["npx", ["-y", "openapi-typescript", ".openapi-patched.json", "--output", "src/types/api.openapi.ts"]],
];
let ok = false;
let lastErr = null;
for (const [cmd, args] of candidates) {
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
    ok = true;
    break;
  } catch (err) {
    lastErr = err;
  }
}
if (!ok) {
  console.error("[api:types] ✗ فشل openapi-typescript:", lastErr?.message);
  process.exit(1);
}

/* ─── 3) اقرأ أسماء المخططات + أسماء الإضافات اليدوية ─── */
const schemas = Object.keys(spec.components?.schemas ?? {});
if (!schemas.length) {
  console.error("[api:types] ✗ لا مخططات في components.schemas");
  process.exit(1);
}

const extraSrc = existsSync(EXTRA) ? readFileSync(EXTRA, "utf8") : "";
const extraNames = new Set(
  [...extraSrc.matchAll(/export (?:interface|type) (\w+)/g)].map((m) => m[1])
);

/* ─── 4) ولّد طبقة إعادة التصدير ─── */
const ALIASES = [
  ["Card", "CardOut"],
  ["Facility", "FacilityOut"],
  ["Product", "ProductOut"],
  ["Region", "RegionOut"],
  ["RejectBody", "app__api__v1__endpoints__admin__membership_requests__RejectBody"],
  ["AdminLoginResponse", "TokenOut"],
];

const reexports = [];
const skipped = [];
for (const name of schemas) {
  if (extraNames.has(name)) {
    skipped.push(name);
    continue;
  }
  reexports.push(`export type ${name} = components["schemas"]["${name}"];`);
}

const aliasLines = ALIASES.map(
  ([alias, target]) =>
    `/** @legacy اسم تاريخي مستخدم في الكود — المصدر: ${target} */\nexport type ${alias} = components["schemas"]["${target}"];`
);

const banner = `/**
 * Tawfir API types — طبقة إعادة التصدير المولّدة آلياً (الجولة 22)
 * ═══════════════════════════════════════════════════════════════════
 * ⚠️ لا تُعدّل هذا الملف يدوياً — مولّد بواسطة \`bun run api:types\`.
 *
 * المصدر: openapi_live.json (نسخة من /openapi.json الحية للباك إند)
 *   + scripts/openapi-patches.json (فروق موثّقة بين السكمة المحفوظة
 *     والباك إند الحي — تُطبَّق قبل التوليد وتُبلَّغ في تقرير الأمر)
 *   1) openapi-typescript → src/types/api.openapi.ts (الأنواع الخام)
 *   2) هذا الملف: إعادة تصدير مسطّحة لكل المخططات + الأسماء التاريخية
 *      + export * من api-extra.ts (أنواع أحدث من السكمة: OTP،
 *        العضوية المجانية، الإشعارات الحقلية…)
 *
 * لتحديث الأنواع بعد تغييرات الباك إند:
 *   curl https://api.tawfir.giize.com/openapi.json > openapi_live.json
 *   bun run api:types
 * ثم راجع تقرير الترقيعات: أي ترقيع صار «زائداً» = السكمة الرسمية
 * لَحِقت به → احذفه من scripts/openapi-patches.json. أي نوع في
 * api-extra.ts صار موجوداً في السكمة → انقله واحذفه من هناك.
 */

import type { components } from "./api.openapi";

/* ═══ إعادة تصدير من السكمة المرقّعة (مولّدة) ═══ */

`;

const tail = `
/* ═══ الأنواع غير الموجودة في السكمة (مُصانة يدوياً في api-extra.ts) ═══ */
export * from "./api-extra";
`;

writeFileSync(
  GENERATED,
  banner +
    reexports.join("\n") +
    "\n\n/* ═══ أسماء تاريخية (مولّدة) ═══ */\n\n" +
    aliasLines.join("\n") +
    "\n" +
    tail,
  "utf8"
);

/* ─── 5) نظّف السكمة المؤقتة + التقرير ─── */
try {
  rmSync(PATCHED);
} catch {}

console.log(`[api:types] ✓ api.openapi.ts: ${schemas.length} مخططاً (بعد الدمج)`);
console.log(`[api:types] ✓ api.generated.ts: ${reexports.length} إعادة تصدير + ${aliasLines.length} اسماً تاريخياً`);
if (skipped.length) {
  console.log(`[api:types] ⚠ أسماء تُصدَّر من api-extra.ts وتتخطى السكمة (تعارض):`);
  for (const n of skipped) console.log(`    • ${n} — إن صارت بالسكمة فانقل التعريف واحذفه من api-extra.ts`);
}
console.log("[api:types] ✓ اكتمل");

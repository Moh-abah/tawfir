#!/usr/bin/env bun
/** توليد النسخ المحسّنة من صور الهوية + أيقونات الإشعارات (تشغيل واحد) */
import sharp from "sharp";
import { statSync } from "node:fs";

const out = [];
async function gen(src, dst, width, height, opts = {}) {
  await sharp(src)
    .resize(width, height ?? undefined, { fit: "inside", withoutEnlargement: true })
    .png({ quality: opts.q ?? 92, compressionLevel: 9 })
    .toFile(dst);
  out.push(`${dst} → ${(statSync(dst).size / 1024).toFixed(1)}KB`);
}

/* أيقونة التطبيق الملونة للإشعارات (icon في showNotification) */
await gen("public/identity/tawfir-app-icon.png", "public/identity/tawfir-app-icon-192.png", 192, 192);
await gen("public/identity/tawfir-app-icon.png", "public/identity/tawfir-app-icon-512.png", 512, 512);

/* الشعار المفرغ بحجم العرض الفعلي (h≤84px → 256px يغطي 3x) */
await gen("public/identity/mark.png", "public/identity/mark-256.png", 256, 256, { q: 95 });

/* اللوكب الأفقي (نفس ملف mark) بحجم العرض الفعلي h≤36px */
await gen("public/identity/lockup-horizontal.png", "public/identity/lockup-horizontal-256.png", 256, 256, { q: 95 });

/* اللوكب الكامل (عرض h≤84px → 640px يغطي 3x مع الهامش) */
await gen("public/identity/lockup-full.png", "public/identity/lockup-full-640.png", 640, 640, { q: 92 });
await gen("public/identity/lockup-fulltra.png", "public/identity/lockup-fulltra-640.png", 640, 640, { q: 92 });

console.log(out.join("\n"));

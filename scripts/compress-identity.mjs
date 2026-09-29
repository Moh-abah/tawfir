/**
 * سكربت ضغط أصول الهوية المتبقية — إصلاح الأداء (الجولة 29):
 *  1) tawfir-membership-card-art-1120.png (1.6MB!) — يُعرض بحد أقصى
 *     ~560px على الشاشات الكبيرة و1120px retina — نضغطه WebP عالي الجودة
 *     ثم نحدّث المرجع في MemberCard.tsx.
 *  2) حذف أصول identity الميتة (~30MB) غير المُشار إليها في أي كود/SW/manifest
 *     (الأصول المستخدمة كلها نسخ محسّنة: mark-256 / lockup-*-256|640 /
 *     empty-state-480 / social-cover-og.jpg / wave-1600 / أيقونات الإشعار).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ID = resolve(ROOT, "public/identity");

async function main() {
  /* 1) ضغط صورة بطاقة العضوية إلى WebP */
  const src = resolve(ID, "tawfir-membership-card-art-1120.png");
  const out = resolve(ID, "tawfir-membership-card-art-1120.webp");
  if (existsSync(src)) {
    const meta = await sharp(src).metadata();
    await sharp(src)
      .resize({ width: Math.min(meta.width ?? 1120, 1120), withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    const before = (await import("node:fs")).statSync(src).size;
    const after = (await import("node:fs")).statSync(out).size;
    console.log(
      `membership art: ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB (webp)`
    );
    unlinkSync(src);

    /* تحديث المرجع في MemberCard.tsx */
    const comp = resolve(ROOT, "src/components/public/MemberCard.tsx");
    let code = readFileSync(comp, "utf8");
    code = code.replace(
      "/identity/tawfir-membership-card-art-1120.png",
      "/identity/tawfir-membership-card-art-1120.webp"
    );
    writeFileSync(comp, code);
    console.log("MemberCard.tsx updated → .webp");
  } else if (existsSync(out)) {
    console.log("membership art already compressed (webp exists)");
  }

  /* 2) حذف الأصول الميتة — قائمة مُتحقَّق منها (0 مراجع في src + SW + manifest) */
  const DEAD = [
    "tawfir-empty-state.png",
    "tawfir-facility-cover.png",
    "tawfir-success-state.png",
    "tawfir-splash-screen.png",
    "tawfir-social-cover.png",
    "tawfir-app-icon.png",
    "tawfir-wave-background.png",
    "tawfir-identity-master-reference.png",
    "lockup-full.png",
    "lockup-fulltra.png",
    "lockup-horizontal.png",
    "mark.png",
    "arabic.png",
    "latin.png",
  ];
  let freed = 0;
  for (const f of DEAD) {
    const p = resolve(ID, f);
    if (existsSync(p)) {
      const s = (await import("node:fs")).statSync(p).size;
      unlinkSync(p);
      freed += s;
      console.log(`deleted: ${f} (${Math.round(s / 1024)}KB)`);
    }
  }
  console.log(`total freed: ${Math.round(freed / 1024 / 1024 * 10) / 10}MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

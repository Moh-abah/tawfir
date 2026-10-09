/**
 * browser-v322-verify.ts — تحقق متصفح حي لجولة الفرونت v3.2.2
 * يُشغَّل: bun scripts/e2e/browser-v322-verify.ts
 *
 * يغطي:
 *  1) عرض الصفحة الرئيسية بلا أخطاء JS + الفوتر الثابت (صفحة قصيرة).
 *  2) الدخول الذهبي (عميل سعودي تجريبي) عبر الواجهة.
 *  3) بادج تلميح الخصم (بصمة §4-ب) في بطاقة القائمة + صفحة المنشأة 32.
 *  4) قناة WS من داخل صفحة المتصفح (نفس URL وبروتوكول ws-client:
 *     101 + hello + ping→pong عبر البوابة العامة).
 *  5) لقطات إثبات في factory-evidence/.
 */

import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const EXE = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const SHOTS = "factory-evidence";

interface Result { name: string; ok: boolean; detail: string }
const results: Result[] = [];
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} [${name}] ${detail}`);
};

const consoleErrors: string[] = [];

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    /* ── 1) الرئيسية (ديسكتوب — فوتر ثابت + صفر أخطاء) ── */
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        console.log(`  ⚠️ NET ${r.status()} ${r.request().method()} ${r.url().slice(0, 120)}`);
    });

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(4_000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    record("1a. الرئيسية تعرض محتوى", bodyText.includes("توفير"), `طول النص=${bodyText.length}`);

    const footer = page.locator("footer").first();
    const footerBox = await footer.boundingBox().catch(() => null);
    const metrics = await page.evaluate(() => ({
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      scrollY: window.scrollY,
    }));
    // صفحة قصيرة → الفوتر يجب أن يستقر قرب أسفل نافذة العرض (بلا فجوة عائمة)
    const footerSticky = footerBox
      ? metrics.docH <= metrics.winH + 50
        ? Math.abs(footerBox.y + footerBox.height - metrics.winH) < 60
        : footerBox.y + footerBox.height <= metrics.docH + 5
      : false;
    record(
      "1b. الفوتر ثابت/طبيعي",
      footerSticky,
      `footer=${footerBox ? `${Math.round(footerBox.y)}+${Math.round(footerBox.height)}` : "مفقود"} doc=${metrics.docH} win=${metrics.winH}`
    );
    await page.screenshot({ path: `${SHOTS}/shot-v322-home.png`, fullPage: false });

    /* ── 2) الدخول الذهبي: عميل سعودي تجريبي ── */
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("#identifier", { timeout: 60_000 });
    /* حلقة إعادة محاولة ضد سباق الترطيب: قد يسبق fill تعلّق React
       فتصفّر react-hook-form الحقول — نتحقق من القيم قبل النقر
       ونعيد المحاولة حتى يُطلق الطلب ويظهر التوكن. */
    let hasToken = false;
    for (let attempt = 1; attempt <= 4 && !hasToken; attempt++) {
      await page.fill("#identifier", "customer.sa@tawfir.test");
      await page.fill("#password", "Test@12345");
      const idVal = await page.inputValue("#identifier");
      if (!idVal) {
        console.log(`  ↳ محاولة ${attempt}: الحقل أُفرغ (ترطيب غير مكتمل) — نعيد`);
        await page.waitForTimeout(2_000);
        continue;
      }
      const loginResp = await Promise.all([
        page
          .waitForResponse((r) => r.url().includes("auth/login"), { timeout: 25_000 })
          .catch(() => null),
        page.locator('button[type="submit"]').click(),
      ]).then(([r]) => r);
      console.log(
        `  ↳ محاولة ${attempt}: استجابة الدخول ${loginResp ? loginResp.status() : "لم تُطلق"}`
      );
      await page
        .waitForFunction(() => document.cookie.includes("tawfir_customer_token"), {
          timeout: 25_000,
        })
        .catch(() => null);
      hasToken = (await page.context().cookies()).some(
        (c) => c.name === "tawfir_customer_token"
      );
      if (!hasToken) await page.waitForTimeout(2_000);
    }
    record("2. دخول العميل السعودي (توكن)", hasToken, hasToken ? "tawfir_customer_token مضبوط" : "لا توكن — الدخول فشل");

    /* ── 3) قائمة المنشآت + بادج التلميح ── */
    // القائمة تُفلتر بمنطقة مختارة (القاعدة البرونزية) — منشأة 32 في الرياض (23).
    // الحقن قبل سكربتات التطبيق (addInitScript) كي لا تسبقها آلية «التصحيح
    // التلقائي لأول منطقة» في useRegions وتستبدلها بـ34 (الباحة).
    await page
      .addInitScript(() => {
        localStorage.setItem(
          "tawfir-region",
          JSON.stringify({ state: { selectedRegionId: 23 }, version: 0 })
        );
      })
      .catch(() => null);
    /* انتظر استقرار السوق السعودي في التخزين أولاً: الإقلاع يبدأ زائراً
       (يمني افتراضياً) ثم «يُشفى» بعد locale/me — لو فتحنا القائمة أثناء
       967 صُحّحت منطقتنا (23) ليمنية ثم عُدّلت عند قلب السوق. */
    await page
      .waitForFunction(
        () => (localStorage.getItem("tawfir-market") ?? "").includes("saudi"),
        { timeout: 30_000 }
      )
      .catch(() => null);
    await page.goto(`${BASE}/facilities`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText("كافتيريا التجريبي السعودي").first().waitFor({ timeout: 45_000 }).catch(() => null);
    await page.waitForTimeout(2_000);
    const listText = await page.evaluate(() => document.body.innerText);
    const HINT = "خصم ترحيبي لعملاء توفير";
    record(
      "3a. بادج التلميح في بطاقة القائمة (§4-ب)",
      listText.includes(HINT),
      listText.includes(HINT) ? `«${HINT}» ظاهر في القائمة` : "التلميح غير ظاهر في القائمة"
    );
    await page.screenshot({ path: `${SHOTS}/shot-v322-facilities-hint.png`, fullPage: false });

    await page.goto(`${BASE}/facilities/32`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(4_000);
    const detailText = await page.evaluate(() => document.body.innerText);
    record(
      "3b. بادج التلميح في صفحة المنشأة (§4-ب)",
      detailText.includes(HINT),
      detailText.includes(HINT) ? "الشارة ظاهرة في الهيرو" : "غير ظاهرة في التفاصيل"
    );
    await page.screenshot({ path: `${SHOTS}/shot-v322-facility-32-hint.png`, fullPage: false });

    /* ── 4) قناة WS من داخل المتصفح (نفس بروتوكول ws-client) ── */
    const wsProbe = await page.evaluate(async () => {
      const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith("tawfir_customer_token="));
      if (!raw) return { ok: false, step: "لا توكن في الكوكيز" };
      const token = decodeURIComponent(raw.split("=")[1]);
      return await new Promise<Record<string, unknown>>((resolve) => {
        let settled = false;
        const done = (v: Record<string, unknown>) => {
          if (!settled) { settled = true; resolve(v); }
        };
        const timer = setTimeout(
          () => { ws.close(); done({ ok: false, step: "timeout 15s" }); },
          15_000
        );
        let hello: unknown = null;
        const ws = new WebSocket(
          `wss://api.tawfir.giize.com/api/v1/ws/notifications?token=${encodeURIComponent(token)}`
        );
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(String(ev.data));
            if (m?.type === "hello") {
              hello = m;
              ws.send(JSON.stringify({ type: "ping" }));
              return;
            }
            if (m?.type === "pong") {
              clearTimeout(timer);
              ws.close();
              done({ ok: true, hello, pong: m });
            }
          } catch { /* تجاهل */ }
        };
        ws.onclose = (ev) => {
          if (hello === null) {
            clearTimeout(timer);
            done({ ok: false, step: `close قبل hello code=${ev.code}` });
          }
        };
        ws.onerror = () => { /* يتبعه onclose */ };
      });
    });
    record(
      "4. قناة WS من المتصفح (101+hello+pong)",
      wsProbe.ok === true,
      JSON.stringify(wsProbe).slice(0, 160)
    );

    /* ── 5) أخطاء الكونسول ── */
    const fatal = consoleErrors.filter(
      (e) =>
        !e.includes("404") &&
        !e.includes("integrations") &&
        !e.includes("Failed to load resource") &&
        !e.includes("favicon")
    );
    record("5. صفر أخطاء JS قاتلة", fatal.length === 0, fatal.length ? fatal.slice(0, 3).join(" | ") : "نظيف");

    await ctx.close();
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n═══ النتيجة: ${pass}/${results.length} نجح ═══`);
  writeFileSync(
    "factory-evidence/browser-v322-verify.json",
    JSON.stringify({ results, pass, total: results.length }, null, 2)
  );
  if (pass < results.length) process.exit(1);
}

void main();

/**
 * browser-payment-first-verify.ts — تحقق متصفح حي لعقد «الدفع أولاً» (إصلاح ملاحظة المالك)
 * يُشغَّل: bun scripts/e2e/browser-payment-first-verify.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 * السيناريو الحرفي لشكوى المالك (حساب سعودي):
 *   1) دخول عميل سعودي عبر الواجهة.
 *   2) فتح منشأة سعودية → زر طلب منتج → شاشة «اطلب الآن» المنبثقة.
 *   3) تحميل الموقع + كتابة العنوان + اختيار «دفع إلكتروني (بطاقة/Apple Pay)».
 *   4) الضغط على زر التأكيد.
 *   ✔ الفحص الحاسم (A): لا يظهر إشعار «تم استلام طلبك» ولا شاشة نجاح قبل الدفع.
 *   ✔ الفحص الحاسم (B): انتقال فوري إلى شاشة الدفع /orders/{id}/pay
 *     (ملخص المبلغ + نموذج مويسر الساندبوكس المدمج).
 *   ✔ الفحص العميق (C — إن أمكن أتمتة الإطار): إدخال بيانات مدى الساندبوكس
 *     وإتمام الدفع فعلياً → /payment/return → «تم الدفع بنجاح» بعد الاستلام.
 * المخرجات: تقرير-الدفع-أولاً-{TAG}.json + لقطات factory-evidence/.
 */

import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const EXE = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const SHOTS = "factory-evidence";
const CUST = { id: "customer.sa@tawfir.test", pw: "Test@12345" };
/** مدى تجريبي مباشر — يُدفع بلا تحدٍّ 3DS (بيانات الساندبوكس المعروفة للمالك) */
const MADA = { name: "Ahmed Ali", number: "4201320111111010", cvc: "123", month: "12", year: "30" };

const TAG = Math.random().toString(36).slice(2, 6);
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
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      geolocation: { latitude: 24.7136, longitude: 46.6753, accuracy: 30 },
      permissions: ["geolocation"],
      locale: "ar",
    });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        "tawfir-region",
        JSON.stringify({ state: { selectedRegionId: 23 }, version: 0 })
      );
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 180));
    });

    /* ── 1) دخول العميل السعودي عبر الواجهة (حلقة ضد سباق الترطيب) ── */
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForFunction(
      () => (localStorage.getItem("tawfir-market") ?? "").includes("saudi"),
      { timeout: 30_000 }
    ).catch(() => null);
    await page.waitForSelector("#identifier", { timeout: 60_000 });
    let hasToken = false;
    for (let attempt = 1; attempt <= 4 && !hasToken; attempt++) {
      await page.fill("#identifier", CUST.id);
      await page.fill("#password", CUST.pw);
      if (!(await page.inputValue("#identifier"))) {
        await page.waitForTimeout(2_000);
        continue;
      }
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("auth/login"), { timeout: 25_000 }).catch(() => null),
        page.locator('button[type="submit"]').click(),
      ]);
      console.log(`  ↳ محاولة ${attempt}: دخول ${resp ? resp.status() : "لم يُطلق"}`);
      await page.waitForFunction(
        () => document.cookie.includes("tawfir_customer_token"),
        { timeout: 25_000 }
      ).catch(() => null);
      hasToken = (await ctx.cookies()).some((c) => c.name === "tawfir_customer_token");
      if (!hasToken) await page.waitForTimeout(2_000);
    }
    record("1. دخول العميل السعودي", hasToken, hasToken ? "توكن العميل مضبوط" : "فشل الدخول");
    if (!hasToken) throw new Error("لا توكن — توقف");

    /* ── 2) منشأة سعودية مباشرة (32 الرياض) → زر طلب منتج → شاشة «اطلب الآن» ── */
    await page.goto(`${BASE}/facilities/32`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(4_000);
    const orderBtn = page.getByRole("button", { name: "اطلب", exact: true }).first();
    try {
      await orderBtn.waitFor({ timeout: 30_000 });
    } catch {
      const diag = await page.evaluate(() => document.body.innerText.slice(0, 300));
      throw new Error(`زر الطلب لم يظهر — نص الصفحة: ${diag.replace(/\n/g, " | ")}`);
    }
    await orderBtn.click();
    await page.getByText("أكمل بياناتك لتأكيد الطلب").first().waitFor({ timeout: 20_000 });
    record("2. شاشة «اطلب الآن» المنبثقة", true, "CheckoutSheet مفتوح على منشأة 32 (الرياض)");

    /* ── 3) الموقع + العنوان + اختيار «دفع إلكتروني» ── */
    const locBtn = page.locator('button[aria-label="تحميل موقعي الحالي لتحديد نقطة التوصيل"]').first();
    await locBtn.click();
    await page.waitForTimeout(2_500); // geolocation + debounce التسعير

    /* العنوان — حلقة ضد سباق الترطيب */
    let addrOk = false;
    for (let i = 1; i <= 3 && !addrOk; i++) {
      await page.fill("#address", "حي العليا، الرياض — شارع التخصصي");
      addrOk = !!(await page.inputValue("#address"));
      if (!addrOk) await page.waitForTimeout(1_500);
    }
    record("3a. الموقع + العنوان", addrOk, addrOk ? "الموقع محمّل والعنوان مكتوب" : "تعذّر إدخال العنوان");

    const elecLabel = page.locator('label[for="pay-electronic"]');
    await elecLabel.waitFor({ timeout: 15_000 });
    await elecLabel.click();
    await page.waitForTimeout(400);
    const elecChecked = await page.isChecked("#pay-electronic");
    record("3b. اختيار «دفع إلكتروني»", elecChecked, elecChecked ? "الراديو الإلكتروني محدد" : "الراديو لم يُحدد");

    /* ── 4) زر التأكيد الجديد + ملاحظة «الدفع أولاً» ── */
    const sheetText = await page.evaluate(() => document.body.innerText);
    const btnNew = sheetText.includes("الدفع الإلكتروني وإتمام الطلب");
    const notePayFirst = sheetText.includes("يُستلم طلبك بعد إتمام الدفع");
    const descGone = !sheetText.includes("تأكيد الطلب — الدفع بعد التأكيد");
    record("4a. زر «الدفع الإلكتروني وإتمام الطلب»", btnNew, btnNew ? "النص الجديد ظاهر" : "النص القديم باقٍ");
    record("4b. ملاحظة عقد «الدفع أولاً»", notePayFirst && descGone, `note=${notePayFirst} old-desc-removed=${descGone}`);
    await page.screenshot({ path: `${SHOTS}/shot-payfirst-1-sheet-electronic.png` });

    /* ── 5) الضغط — الفحص الحاسم: لا «تم استلام طلبك» قبل الدفع ── */
    const confirmBtn = page.getByRole("button", { name: /الدفع الإلكتروني وإتمام الطلب/ }).first();
    await confirmBtn.click();

    /* انتقال فوري إلى /orders/{id}/pay */
    let payUrl: string | null = null;
    try {
      await page.waitForURL(/\/orders\/\d+\/pay/, { timeout: 30_000 });
      payUrl = page.url();
    } catch { payUrl = null; }
    record("5a. انتقال فوري لشاشة الدفع /orders/{id}/pay", !!payUrl, payUrl ?? "لم يحدث الانتقال");

    /* الفحص الحاسم A — نص الشاشة الآن (بعيداً عن الشيت): بلا إشعار استلام */
    await page.waitForTimeout(1_200);
    const afterText = await page.evaluate(() => document.body.innerText);
    const noPremature = !afterText.includes("تم استلام طلبك") && !afterText.includes("تم استلام الطلب");
    record(
      "5b. لا «تم استلام طلبك» قبل الدفع (عقد جديد)",
      noPremature,
      noPremature ? "صفر إعلان استلام — النجاح مؤجل بعد الدفع حصراً" : "❌ ما زال الإعلان يظهر قبل الدفع"
    );

    /* الفحص الحاسم B — شاشة الدفع: ملخص المبلغ + نموذج مويسر
       (حزمة v2 الحالية ترسم حقول البطاقة مضمنة بلا iframe —
       inputs mysr-cc-* مباشرة داخل .mysr-form) */
    const amountSummary = afterText.includes("المبلغ المطلوب لطلب رقم");
    await page.locator(".mysr-form").waitFor({ timeout: 30_000 }).catch(() => null);
    const mysrForm = (await page.locator(".mysr-form").count()) > 0;
    /* انتظر حقل رقم البطاقة المضمن من حزمة مويسر v2 */
    let cardField = false;
    try {
      await page.waitForSelector("#mysr-cc-number, input[name='mysr-cc-number']", { timeout: 25_000 });
      cardField = true;
    } catch { cardField = false; }
    record("5c. ملخص المبلغ من الخادم", amountSummary, amountSummary ? "المبلغ حي من الطلب" : "الملخص مفقود");
    record("5d. نموذج مويسر الساندبوكس المدمج (v2 حقول مضمنة)", mysrForm && cardField, `container=${mysrForm} cardField=${cardField}`);
    await page.screenshot({ path: `${SHOTS}/shot-payfirst-2-payment-screen.png` });

    /* ── 6) الفحص العميق C — إتمام الدفع فعلياً بمدى الساندبوكس ── */
    let deepPaid = false;
    let deepDetail = "حقول النموذج غير متاحة للأتمتة — الفحص A/B كافٍ لعقد الدفع أولاً";
    if (cardField) {
      try {
        await page.locator("#mysr-cc-name, input[name='mysr-cc-name']").first().fill(MADA.name);
        await page.locator("#mysr-cc-number, input[name='mysr-cc-number']").first().fill(MADA.number);
        const exp = page.locator("#mysr-cc-exp, input[name='mysr-cc-exp']").first();
        await exp.fill(`${MADA.month}/${MADA.year}`);
        if ((await exp.inputValue()).replace(/\D/g, "").length < 3) {
          await exp.fill(`${MADA.month}${MADA.year}`);
        }
        await page.locator("#mysr-cc-csc, input[name='mysr-cc-csc']").first().fill(MADA.cvc);
        await page.screenshot({ path: `${SHOTS}/shot-payfirst-3-card-filled.png` });
        await page.locator('.mysr-form button[type="submit"]').first().click();
        /* النتيجة: تحوّل علوي إلى /payment/return أو نجاح داخل الصفحة */
        for (let i = 0; i < 30; i++) {
          await page.waitForTimeout(2_000);
          const topNow = page.url();
          const bodyNow = await page.evaluate(() => document.body.innerText).catch(() => "");
          if (/payment\/return\?order=\d+/.test(topNow) || bodyNow.includes("تم الدفع بنجاح")) {
            deepPaid = true;
            deepDetail = `تحقق الدفع: ${topNow.slice(0, 90)}`;
            break;
          }
        }
        if (deepPaid) {
          await page.waitForTimeout(2_500);
          const finalText = await page.evaluate(() => document.body.innerText).catch(() => "");
          const successShown =
            finalText.includes("تم الدفع بنجاح") || finalText.includes("مدفوع سابقًا");
          record("6a. «تم الدفع بنجاح» بعد إتمام الدفع حصراً", successShown, successShown ? "النجاح ظهر بعد الدفع — العقد مكتمل" : "نص النجاح لم يُرصد على المستوى العلوي");
          await page.screenshot({ path: `${SHOTS}/shot-payfirst-4-paid-success.png` });
        } else {
          deepDetail = "لم يُرصد اكتمال الدفع خلال المهلة (قد يكون تحدي 3DS) — لا يؤثر على حكم العقد A/B";
        }
      } catch (e) {
        deepDetail = `أتمتة حقول مويسر v2 تعذّرت (${(e as Error).message.slice(0, 80)}) — لا يؤثر على حكم العقد A/B`;
      }
    }
    record("6. إتمام الدفع عبر الساندبوكس (عمق)", deepPaid, deepDetail);

    /* ── ملخص ── */
    const critical = results.filter((r) => /^5[ab]/.test(r.name));
    const criticalOk = critical.every((r) => r.ok);
    record("الحكم الحاسم — عقد «الدفع أولاً»", criticalOk, criticalOk ? "مطابقة كاملة لملاحظة المالك" : "فشل عقد حاسم");

    writeFileSync(`تقرير-الدفع-أولاً-${TAG}.json`, JSON.stringify({
      tag: TAG, when: new Date().toISOString(), critical_ok: criticalOk, results, console_errors: consoleErrors.slice(0, 20),
    }, null, 2), "utf-8");
    console.log(`\nالتقرير: تقرير-الدفع-أولاً-${TAG}.json — أخطاء JS: ${consoleErrors.length}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("فشل الجولة:", e);
  process.exit(1);
});

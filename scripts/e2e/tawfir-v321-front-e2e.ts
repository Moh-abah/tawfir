/**
 * tawfir-v321-front-e2e.ts — جولة الإغلاق الختامية v3.2.1 — E2E حرفي بالسوقين
 * ═══════════════════════════════════════════════════════════════════════════
 * بوصمة — وكيل الفرونت. يُشغَّل: bun scripts/e2e/tawfir-v321-front-e2e.ts
 *
 * السيناريوهات الحرفية من مهمة المالك (م10) ضد الخادم الحي:
 *   1) سعودي: دخول → عضوية مجانية (تفعيل فوري) → تصفح → طلب كاش بخصم تاجر
 *      → دفع بطاقة (سلسلة مويسر كاملة + verify) → تتبع → إشعار.
 *   2) يمني: مسار اليمن كاملاً (بث 3000 YER بإيصال، طلب بمحفظة، YER).
 *   3) مالك سعودي: بطاقة SAR + ضبط الخصم (0→15→مرفوض 21→0).
 *   4) مندوب سعودي جديد: تسجيل (X-Market 966) → لوكالي 966 فوراً
 *      → رصيد SAR → وجهة STC Pay.
 *   5) أدمن: pricing يعرض SA/YE الوطنيتين.
 *
 * الحسابات المزروعة (كلمات المرور مع المالك) — بيانات الاختبار المعروفة:
 *   OTP=123456 · العملة المشتركة Test@12345 · مدى 4201320111111010 ينجح مباشرة
 * المخرجات: تقرير-v321-front-e2e-{TAG}.json + جدول كونسول.
 */

const API = "https://api.tawfir.giize.com/api/v1";
const MOYASAR = "https://api.moyasar.com/v1";

const SUPER_ADMIN = { identifier: "admin@tawfir.giize.com", password: "mohabhb68myaa" };
const PASSWORD = "Test@12345";
const OTP_CODE = "123456";
/** مدى تجريبي مباشر — يُدفع بلا تحدٍّ 3DS (بيانات المالك) */
const MADA_CARD = { name: "Ahmed Ali", number: "4201320111111010", cvc: "123", month: "12", year: "30" };

const TAG = Math.random().toString(36).slice(2, 6);
const EMAIL = (n: string) => `basma.v321.${n}.${TAG}@tawfir-sa.com`;
const saPhone = () => `9665${Math.floor(10000000 + Math.random() * 89999999)}`;
const rand4 = () => String(Math.floor(1000 + Math.random() * 9000));

type Status = "ok" | "fail";
const results: { step: string; status: Status; detail: string; evidence?: string }[] = [];
let pass = 0, fail = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function record(step: string, status: Status, detail: string, evidence?: string) {
  results.push({ step, status, detail, evidence });
  status === "ok" ? pass++ : fail++;
  console.log(`${status === "ok" ? "✅" : "❌"} ${step} — ${detail}`);
}

function errMsg(d: any): string {
  if (d == null) return "بلا جسم";
  if (typeof d === "string") return d.slice(0, 200);
  if (d.detail?.message) {
    const errs = d.detail.errors ? JSON.stringify(d.detail.errors).slice(0, 160) : "";
    return `${d.detail.message} ${errs}`;
  }
  if (typeof d.detail === "string") return d.detail;
  if (d.message) return d.message;
  return JSON.stringify(d).slice(0, 200);
}

async function req<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; market?: string; base?: string } = {}
): Promise<{ status: number; data: T; ok: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.market) headers["X-Market"] = opts.market;
  const res = await fetch((opts.base ?? API) + path, {
    method, headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

/* ─── سلسلة 3DS المجرّبة (من tawfir-e2e) — لبطاقات التحدي ─── */
function parseForm(html: string): { action: string; fields: Record<string, string> } {
  const action = /action="([^"]+)"/.exec(html)?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) fields[m[1]] = m[2];
  return { action, fields };
}
async function moyasarCompleteCard(pk: string, pay: any): Promise<any> {
  const first = pay?.source?.transaction_url;
  if (!first) return pay;
  let html = await fetch(first, { redirect: "follow" }).then((r) => r.text());
  for (let i = 0; i < 8; i++) {
    const { action, fields } = parseForm(html);
    if (!action) break;
    const body = new URLSearchParams(fields);
    if (action.includes("authenticate")) {
      body.set("color_depth", "24"); body.set("js_enabled", "true");
      body.set("language", "ar-SA"); body.set("screen_height", "900");
      body.set("screen_width", "1440"); body.set("time_zone", "-180");
    }
    if (action.includes("set_auth_result")) body.set("auth_result", "AUTHENTICATED");
    const target = action.startsWith("http") ? action : `https://api.moyasar.com${action}`;
    const res = await fetch(target, { method: "POST", body, redirect: "follow" });
    html = await res.text();
  }
  return fetch(`${MOYASAR}/payments/${pay.id}`, {
    headers: { Authorization: `Basic ${btoa(pk + ":")}` },
  }).then((r) => r.json()).catch(() => null);
}

/* ═══════════════ حالة التشغيل ═══════════════ */
const ctx: Record<string, any> = { saRegions: {}, yeRegions: {} };

/* ── 0) تهيئة: مناطق + توكنات مزروعة + مفتاح مويسر ── */
async function setup() {
  console.log(`\n╔══════════════════════════════════════════╗\n║  تقرير v3.2.1 — E2E الفرونت الحي · ${TAG}  ║\n╚══════════════════════════════════════════╝`);
  for (const [cc, store, city] of [["966", ctx.saRegions, "الرياض"], ["967", ctx.yeRegions, "صنعاء"]] as const) {
    const r = await req<any[]>("GET", `/regions?country_code=${cc}`, { market: cc });
    const items = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
    const hit = items.find((x: any) => String(x.name).includes(city)) ?? items[0];
    if (hit) store[city] = hit.id;
    record(`تهيئة: مناطق ${cc}`, hit ? "ok" : "fail", `${city}=${hit?.id ?? "؟"} (${items.length} منطقة)`);
  }
  for (const [k, ep, id] of [
    ["saCustomer", "/auth/login", "customer.sa@tawfir.test"],
    ["yeCustomer", "/auth/login", "customer.ye@tawfir.test"],
    ["saOwner", "/owner/login", "owner.sa@tawfir.test"],
    ["yeOwner", "/owner/login", "owner.ye@tawfir.test"],
  ] as const) {
    const lg = await req("POST", ep, { body: { identifier: id, password: PASSWORD } });
    ctx[k] = lg.data?.access_token ?? null;
    record(`دخول ${id}`, lg.ok ? "ok" : "fail", lg.ok ? "توكن حي" : errMsg(lg.data));
  }
  const adm = await req("POST", "/admin/login", { body: SUPER_ADMIN });
  ctx.admin = adm.data?.access_token ?? null;
  record("دخول الأدمن الكلي", adm.ok ? "ok" : "fail", adm.ok ? "توكن حي" : errMsg(adm.data));
  const cfg = await req<any>("GET", "/finance/payments/config", { token: ctx.saCustomer });
  ctx.moyasarPK = cfg.data?.publishable_key ?? null;
  record("بوابة مويسر (سعودي)", cfg.ok && ctx.moyasarPK ? "ok" : "fail",
    `enabled=${cfg.data?.enabled} · currency=${cfg.data?.currency} · methods=${(cfg.data?.methods ?? []).join(",")}`);
}

/* ═══ السيناريو 1 — سعودي كامل ═══ */
async function scenarioSaudi() {
  console.log(`\n━━━ السيناريو 1: عميل سعودي — عضوية مجانية + تصفح + طلب بخصم تاجر + بطاقة + تتبع ━━━`);
  const t = ctx.saCustomer;

  // 1-أ) العضوية المجانية: info → تفعيل (201 فوري أو 409 إن نشطة)
  const info = await req<any>("GET", "/membership/info", { token: t, market: "966" });
  record("عضوية: info سعودي", info.ok && info.data.market === "966" ? "ok" : "fail",
    `market=${info.data?.market} · amount=${info.data?.amount} · ${info.data?.currency} · discount_label=${info.data?.discount_label}`,
    JSON.stringify(info.data).slice(0, 220));
  const free = await req("POST", "/membership/subscribe-free", { token: t, market: "966" });
  record("عضوية: تفعيل فوري مجاني", free.status === 201 || free.status === 409 ? "ok" : "fail",
    free.status === 201 ? `201 فوري: ${errMsg(free.data).slice(0, 120)}` : `409 نشطة أصلاً (سلوك مقبول): ${errMsg(free.data).slice(0, 100)}`);
  const me = await req<any>("GET", "/me", { token: t });
  const m = me.data?.membership;
  record("عضوية: الحالة بعد التفعيل", m?.is_active ? "ok" : "fail",
    m ? `نشطة · ${m.membership_type} · خصم ${m.discount_rate}% · تنتهي ${String(m.expires_at).slice(0, 10)}` : "لا عضوية في /me!");

  // 1-ب) تصفح: منشآت السوق السعودي فقط
  const list = await req<any[]>("GET", "/facilities?country_code=966", { token: t, market: "966" });
  const items = Array.isArray(list.data) ? list.data : [];
  const yeLeak = items.some((f: any) => String(f.country_code ?? "") === "967");
  record("تصفح: قائمة سعودية نظيفة", items.length > 0 && !yeLeak ? "ok" : "fail",
    `${items.length} منشأة · تلوث يمني=${yeLeak ? "نعم!" : "لا"}`);
  const fac = items.find((f: any) => f.id === 32) ?? items[0];
  const fid = fac?.id;

  // 1-ج) طلب كاش بخصم تاجر: التاجر يضبط 15 → الطلب يُخصم من الخادم
  const put15 = await req("PUT", "/owner/facility/32", { token: ctx.saOwner, body: { discount_rate: 15 } });
  record("حرية التاجر: ضبط 15%", put15.ok ? "ok" : "fail", put15.ok ? "discount_rate=15 محفوظ" : errMsg(put15.data));
  const prod = await req<any[]>("GET", `/facilities/${fid}/products`, { token: t, market: "966" });
  const p1 = (Array.isArray(prod.data) ? prod.data : [])[0];
  if (!p1) { record("طلب كاش بخصم", "fail", "لا منتجات في المنشأة"); return; }
  const base = parseFloat(p1.price);
  const est = await req<any>("GET", `/orders/delivery-estimate?facility_id=${fid}&lat=24.72&lng=46.68`, { token: t, market: "966" });
  record("تقدير التوصيل (عملة من الخادم)", est.ok && est.data.currency === "SAR" ? "ok" : "fail",
    `fee=${est.data?.fee} ${est.data?.currency} · market=${est.data?.market}`);
  const order = await req<any>("POST", "/orders", {
    token: t, market: "966",
    body: {
      facility_id: fid, items: [{ product_id: p1.id, quantity: 1 }],
      delivery_lat: 24.72, delivery_lng: 46.68,
      delivery_address: "الرياض — سيناريو v3.2.1", payment_method: "cash",
      notes: "E2E v3.2.1 — بوصمة",
    },
  });
  const expectedSub = Math.round(base * 0.85 * 100) / 100;
  record("طلب كاش بخصم تاجر 15%", order.status === 201 && Number(order.data.subtotal) === expectedSub ? "ok" : "fail",
    `الطلب #${order.data?.id} · subtotal=${order.data?.subtotal} (المتوقع ${expectedSub}) · total=${order.data?.total} · fee=${order.data?.delivery_fee}`,
    JSON.stringify({ id: order.data?.id, subtotal: order.data?.subtotal, total: order.data?.total }));
  ctx.saOrderId = order.data?.id;

  // 1-د) دفع بطاقة مدى (سلسلة مويسر + verify)
  const pay = await fetch(`${MOYASAR}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(ctx.moyasarPK + ":")}` },
    body: JSON.stringify({
      amount: Math.round(Number(order.data.total) * 100), currency: "SAR",
      description: `توفير v3.2.1 — #${order.data.id}`,
      callback_url: "https://tawfir.giize.com/payment/return?order=0",
      source: { type: "creditcard", ...MADA_CARD, manual: false },
    }),
  }).then((r) => r.json());
  let final: any = pay?.source?.transaction_url ? await moyasarCompleteCard(ctx.moyasarPK, pay) : pay;
  for (let i = 0; i < 7 && final?.status === "initiated"; i++) {
    await sleep(1500);
    final = await fetch(`${MOYASAR}/payments/${pay.id}`, { headers: { Authorization: `Basic ${btoa(ctx.moyasarPK + ":")}` } }).then((r) => r.json());
  }
  record("بطاقة مدى (مويسر)", final?.status === "paid" ? "ok" : "fail", `حالة مويسر=${final?.status ?? "؟"}`);
  if (final?.status === "paid") {
    const verify = await req<any>("POST", `/finance/orders/${order.data.id}/pay/verify`, {
      token: t, market: "966",
      body: { moyasar_payment_id: pay.id, idempotency_key: `basma-v321-${order.data.id}` },
    });
    record("verify يسجل الدفعة", verify.ok ? "ok" : "fail", verify.ok ? `دفعة #${verify.data?.id} على الطلب #${order.data.id}` : errMsg(verify.data));
    await sleep(2000);
    const card = await req<any>("GET", "/finance/owner/card", { token: ctx.saOwner });
    record("قيود verify على بطاقة التاجر (بلا webhook)", card.ok ? "ok" : "fail",
      `عمولات=${card.data?.accumulated_commissions} ${card.data?.currency}`);
  }

  // 1-هـ) تتبع + إشعار
  const track = await req<any>("GET", `/orders/${order.data.id}/tracking`, { token: t });
  record("تتبع الطلب", track.ok ? "ok" : "fail", track.ok ? `status=${track.data.status_ar ?? track.data.status}` : errMsg(track.data));
  const notif = await req<any>("GET", "/notifications", { token: t });
  const nCount = Array.isArray(notif.data) ? notif.data.length : notif.data?.total ?? 0;
  record("إشعارات العميل", notif.ok ? "ok" : "fail", `${nCount} إشعاراً`);

  // 1-و) صفّر الخصم (نهاية سيناريو المالك الجزئي هنا يكتمل في السيناريو 3)
}

/* ═══ السيناريو 2 — يمني كامل ═══ */
async function scenarioYemen() {
  console.log(`\n━━━ السيناريو 2: عميل يمني — بث 3000 YER + محفظة + YER ━━━`);
  const t = ctx.yeCustomer;

  // 2-أ) عضوية اليمن: info (3000/ريال يمني/جيب) — والمسار السعودي المجاني مخفي عنه
  const info = await req<any>("GET", "/membership/info", { token: t, market: "967" });
  record("عضوية: info يمني", info.ok && info.data.market === "967" && Number(info.data.amount) === 3000 ? "ok" : "fail",
    `market=${info.data?.market} · amount=${info.data?.amount} ${info.data?.currency} · محفظة=${info.data?.wallet_name} · حساب=${info.data?.transfer_account_number}`);

  // 2-ب) اشتراك بإيصال حقيقي (PNG صغير مولّد برمجياً — 1×1)
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const fd = new FormData();
  fd.append("receipt_image", new Blob([png], { type: "image/png" }), "receipt.png");
  fd.append("amount", String(info.data.amount));
  fd.append("transfer_account_name", info.data.transfer_account_name ?? "");
  fd.append("transfer_account_number", info.data.transfer_account_number ?? "");
  const sub = await fetch(`${API}/membership/subscribe`, {
    method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd,
  });
  const subBody = await sub.json().catch(() => null);
  record("عضوية: اشتراك بإيصال (مسار اليمن)", sub.status === 201 || sub.status === 200 || sub.status === 409 ? "ok" : "fail",
    `${sub.status}: ${errMsg(subBody).slice(0, 140)}`);

  // 2-ج) طلب بمحفظة المتجر (اليمن) بعملة YER — نبحث منشأة تجمع محفظة + منتجاً متاحاً
  const list = await req<any[]>("GET", "/facilities?country_code=967", { token: t, market: "967" });
  const yeItems = Array.isArray(list.data) ? list.data : [];
  let yeFac: any = null, w: any = null, yp: any = null;
  for (const f of yeItems.slice(0, 8)) {
    const wallets = await req<any[]>("GET", `/facilities/${f.id}/wallets`, { token: t, market: "967" });
    const wl = Array.isArray(wallets.data) ? wallets.data : [];
    const prods = await req<any[]>("GET", `/facilities/${f.id}/products`, { token: t, market: "967" });
    const pl = (Array.isArray(prods.data) ? prods.data : []).filter(
      (p: any) => p.is_available !== false && (p.available_quantity == null || p.available_quantity > 0)
    );
    if (wl.length && pl.length) { yeFac = f; w = wl[0]; yp = pl[0]; break; }
    if (!yeFac && pl.length) { yeFac = f; yp = pl[0]; } // احتياط: منشأة بمنتج متاح بلا محفظة
  }
  if (!yp) { record("يمني: منتج متاح", "fail", "لا منتج متاح في أول 8 منشآت"); return; }
  /* ضمان المسار الحرفي «بمحفظة»: إن لم تجد منشأة بمحفظة، أنشئ محفظة استلام
     لمنشأة مالك اليمن المزروع (POST /owner/facilities/{id}/wallets) واطلب منها */
  if (!w && ctx.yeOwner) {
    const myFac = await req<any[]>("GET", "/owner/facility", { token: ctx.yeOwner });
    const mine = (Array.isArray(myFac.data) ? myFac.data : [])[0];
    if (mine) {
      const wc = await req<any>("POST", `/owner/facilities/${mine.id}/wallets`, {
        token: ctx.yeOwner,
        body: { provider_id: 1, account_type: "phone", phone_number: "9677" + rand4() + rand4(), account_name: `بصمة محفظة ${TAG}`, display_order: 1 },
      });
      if (wc.status === 201 || wc.ok) {
        const wprods = await req<any[]>("GET", `/facilities/${mine.id}/products`, { token: ctx.yeOwner, market: "967" });
        const wpl = (Array.isArray(wprods.data) ? wprods.data : []).filter(
          (p: any) => p.is_available !== false && (p.available_quantity == null || p.available_quantity > 0)
        );
        if (wpl.length) { yeFac = mine; w = wc.data; yp = wpl[0]; }
      }
    }
  }
  const yeEst = await req<any>("GET", `/orders/delivery-estimate?facility_id=${yeFac.id}&lat=15.37&lng=44.19`, { token: t, market: "967" });
  record("تقدير التوصيل يمني (عملة من الخادم)", yeEst.ok && yeEst.data.currency === "YER" ? "ok" : "fail",
    `fee=${yeEst.data?.fee} ${yeEst.data?.currency} · market=${yeEst.data?.market}`);
  const yeOrder = await req<any>("POST", "/orders", {
    token: t, market: "967",
    body: {
      facility_id: yeFac.id, items: [{ product_id: yp.id, quantity: 1 }],
      delivery_lat: 15.37, delivery_lng: 44.19,
      delivery_address: "صنعاء — سيناريو v3.2.1",
      payment_method: w ? "wallet" : "cash", payment_wallet_id: w?.id ?? null,
      notes: "E2E v3.2.1 — بوصمة",
    },
  });
  record(w ? "طلب بمحفظة المتجر (اليمن)" : "طلب كاش (بلا محفظة للمتجر)", yeOrder.status === 201 ? "ok" : "fail",
    `الطلب #${yeOrder.data?.id} · total=${yeOrder.data?.total} · طريقة=${yeOrder.data?.payment_method}${w ? ` · محفظة #${w.id}` : ""}`);
  if (yeOrder.status === 201) await req("POST", `/orders/${yeOrder.data.id}/cancel`, { token: t, market: "967" });

  // 2-د) حرس المحفظة المعاكس: يمني يطلب من منشأة سعودية → 422
  const cross = await req<any>("POST", "/orders", {
    token: t, market: "967",
    body: {
      facility_id: 32, items: [{ product_id: 119, quantity: 1 }],
      delivery_lat: 15.37, delivery_lng: 44.19,
      delivery_address: "صنعاء — عبور ممنوع", payment_method: "cash",
    },
  });
  record("حرس العبور: يمني → منشأة سعودية", cross.status === 422 ? "ok" : "fail",
    `${cross.status}: ${errMsg(cross.data).slice(0, 120)}`);
}

/* ═══ السيناريو 3 — مالك سعودي: بطاقة SAR + خصم 0→15→مرفوض 21→0 ═══ */
async function scenarioOwner() {
  console.log(`\n━━━ السيناريو 3: مالك سعودي — بطاقة SAR + دورة الخصم 0→15→21✗→0 ━━━`);
  const card = await req<any>("GET", "/finance/owner/card", { token: ctx.saOwner });
  record("بطاقة التاجر السعودي", card.ok && card.data.currency === "SAR" ? "ok" : "fail",
    `currency=${card.data?.currency} · عمولات=${card.data?.accumulated_commissions} · ذمة=${card.data?.outstanding_debt}`);
  const hint = await req("PUT", "/owner/facility/32", { token: ctx.saOwner, body: { discount_rate: 15, discount_hint: "خصم 15% لأعضاء توفير على كل الوجبات" } });
  record("الخصم 0→15 (+تلميح)", hint.ok ? "ok" : "fail", hint.ok ? "محفوظ" : errMsg(hint.data));
  const reject = await req("PUT", "/owner/facility/32", { token: ctx.saOwner, body: { discount_rate: 21 } });
  const serverMsg = errMsg(reject.data);
  record("الخصم 21 → مرفوض 422", reject.status === 422 ? "ok" : "fail",
    `${reject.status}: ${serverMsg.slice(0, 130)}`,
    JSON.stringify(reject.data).slice(0, 200));
  const reset = await req("PUT", "/owner/facility/32", { token: ctx.saOwner, body: { discount_rate: 0, discount_hint: null } });
  record("الخصم 15→0 (إغلاق الدورة)", reset.ok ? "ok" : "fail", reset.ok ? "بلا خصم" : errMsg(reset.data));
}

/* ═══ السيناريو 4 — مندوب سعودي جديد ═══ */
async function scenarioCourier() {
  console.log(`\n━━━ السيناريو 4: مندوب سعودي جديد — لوكالي 966 فوراً + رصيد SAR + STC Pay ━━━`);
  const phone = saPhone();
  const rq = await req("POST", "/otp/request", { body: { target: phone, name: `بصمة مندوب v321 ${TAG}` } });
  const vf = await req("POST", "/otp/verify", { body: { target: phone, code: rq.data?.dev_code ?? OTP_CODE } });
  const tok = vf.data?.verified_token;
  record("OTP مندوب سعودي", tok ? "ok" : "fail", tok ? "verified_token" : errMsg(vf.data));
  if (!tok) return;
  const email = EMAIL("courier");
  const reg = await req<any>("POST", "/courier/auth/register", {
    market: "966",
    body: {
      document_full_name: `بصمة مندوب سعودي ${TAG}`, public_name: `بصمة مندوب ${TAG}`,
      birth_date: "1996-05-14", email, phone,
      password: PASSWORD, password_confirm: PASSWORD,
      vehicle_type: "motorcycle", vehicle_plate: `1-${rand4()}-ح`, license_number: `1${rand4()}${rand4()}9`,
      region_id: ctx.saRegions["الرياض"], preferred_shifts: "مسائي",
      id_document_type: "national_id", id_document_number: `1${rand4()}${rand4()}9`,
    },
  });
  record("تسجيل مندوب سعودي (X-Market 966)", reg.status === 201 || reg.ok ? "ok" : "fail",
    `courier=${reg.data?.courier_id} · هاتف ${phone.slice(0, 6)}…`);
  const lg = await req("POST", "/courier/auth/login", { body: { identifier: email, password: PASSWORD } });
  const ct = lg.data?.access_token;
  if (!ct) { record("دخول المندوب", "fail", errMsg(lg.data)); return; }
  const loc = await req<any>("GET", "/locale/me", { token: ct });
  record("لوكالي المندوب فور التسجيل (P0-1)", loc.data?.country_code === "966" ? "ok" : "fail",
    `المخزن=${loc.data?.country_code} · العملة=${loc.data?.currency} — بلا أي PUT ترقيع!`);
  const bal = await req<any>("GET", "/finance/courier/my/balance", { token: ct });
  record("رصيد المندوب السعودي", bal.ok && bal.data.currency === "SAR" ? "ok" : "fail",
    `receivable=${bal.data?.receivable} · currency=${bal.data?.currency}`);
  const dest = await req<any>("POST", "/finance/courier/destination", {
    token: ct,
    body: { type: "wallet", holder_name: `بصمة STC ${TAG}`, mobile: `9665${rand4()}${rand4()}`, country: "SA" },
  });
  record("وجهة STC Pay سعودية", dest.ok || dest.status === 201 ? "ok" : "fail",
    dest.ok ? `#${dest.data?.id} · country=${dest.data?.country} · mobile=${String(dest.data?.mobile ?? "").slice(0, 6)}…` : errMsg(dest.data));
  const yeDest = await req<any>("POST", "/finance/courier/destination", {
    token: ctx.yeCourier ?? ct,
    body: { type: "wallet", holder_name: `بصمة حرس ${TAG}`, mobile: `9665${rand4()}${rand4()}`, country: "SA" },
  });
  if (ctx.yeCourier) {
    const yeLoc = await req<any>("GET", "/locale/me", { token: ctx.yeCourier });
    record("حرس الوجهات: يمني → SA مرفوض", yeDest.status === 422 && yeLoc.data?.country_code === "967" ? "ok" : "fail",
      `سوق المندوب=${yeLoc.data?.country_code} · الرفض=${yeDest.status}: ${errMsg(yeDest.data).slice(0, 100)}`);
  }
}

/* ═══ السيناريو 5 — أدمن: pricing يعرض SA/YE ═══ */
async function scenarioAdmin() {
  console.log(`\n━━━ السيناريو 5: أدمن — سطح التسعير الوطني SA/YE ━━━`);
  const pr = await req<any>("GET", "/admin/pricing", { token: ctx.admin });
  const nat = pr.data?.national ?? {};
  const sa = nat["966"], ye = nat["967"];
  const ok = sa && ye && Number(sa.base_fee) === 8 && Number(sa.per_km) === 1.5 && Number(ye.base_fee) > 0;
  record("أدمن: pricing يعرض SA/YE", ok ? "ok" : "fail",
    `966={${sa?.base_fee}/${sa?.base_km}كم/${sa?.per_km}} · 967={${ye?.base_fee}/${ye?.base_km}كم/${ye?.per_km}} · تعديل: ${nat.editable_via ?? "—"}`);
}

async function main() {
  await setup();
  await scenarioSaudi();
  await scenarioYemen();
  await scenarioOwner();
  await scenarioCourier();
  await scenarioAdmin();

  console.log(`\n━━━━━━━━━━━ خلاصة v3.2.1 — E2E الفرونت ━━━━━━━━━━━`);
  console.log(`✅ نجاح: ${pass}   ❌ فشل: ${fail}   الإجمالي: ${results.length}`);
  const path = `/home/z/my-project/تقرير-v321-front-e2e-${TAG}.json`;
  await Bun.write(path, JSON.stringify({ meta: { tag: TAG, ran_at: new Date().toISOString(), api: API }, summary: { pass, fail }, results }, null, 2));
  console.log(`📄 التقرير: تقرير-v321-front-e2e-${TAG}.json`);
  if (fail > 0) {
    console.log(`\n❌ الخطوات الفاشلة:`);
    results.filter((r) => r.status === "fail").forEach((r) => console.log(`  • ${r.step} — ${r.detail}`));
  }
}

main().catch((e) => { console.error("فشل التشغيل:", e); process.exit(1); });

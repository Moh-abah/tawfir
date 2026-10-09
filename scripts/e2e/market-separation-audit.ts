/**
 * market-separation-audit.ts — تدقيق فصل الأسواق الشامل الحي لمنصة توفير
 * ═════════════════════════════════════════════════════════════════════
 * بوصمة — وكيل الفرونت. يُشغَّل: bun scripts/e2e/market-separation-audit.ts
 *
 * الهدف: فحص كل مستوى في النظام (هوية/منشآت/تسعير/مدفوعات/محافظ/مالية/
 * مناديب/إعدادات/عضوية/إشعارات) × السوقين (السعودية 966/SAR ↔ اليمن 967/YER)
 * وتصنيف كل فحص:
 *   ✅ ok    = فصل سليم خادمياً
 *   🔴 leak  = تسرب سوق خادمي مؤكد  (إصلاحه على الباك اند)
 *   🟠 gap   = فجوة عقد/تصميم خادمية (إصلاحه على الباك اند)
 *   🟣 fe    = فجوة واجهة (إصلاحي أنا — الفرونت)
 *   ℹ️  info  = ملاحظة محايدة
 *   ❌ fail  = فشل تقني في الفحص نفسه
 *
 * كل الحسابات تتولد بلاحقة عشوائية — إعادة التشغيل آمنة دائماً.
 * المخرجات: تقرير-فصل-الأسواق-{TAG}.json + جدول خلاصة كونسول.
 */

/* ═══════════════ الإعدادات ═══════════════ */

const API = "https://api.tawfir.giize.com/api/v1";
const ROOT = "https://api.tawfir.giize.com";

const SUPER_ADMIN = { identifier: "admin@tawfir.giize.com", password: "mohabhb68myaa" };
const PASSWORD = "Test@12345";
const OTP_CODE = "123456";

const TAG = Math.random().toString(36).slice(2, 6);
const EMAIL = (n: string) => `basma.audit.${n}.${TAG}@tawfir-sa.com`;
const saPhone = () => `9665${Math.floor(10000000 + Math.random() * 89999999)}`; // 12 خانة
const yePhone = () => `9677${Math.floor(10000000 + Math.random() * 89999999)}`; // 12 خانة

/* ═══════════════ التصنيف والتسجيل ═══════════════ */

type Status = "ok" | "leak" | "gap" | "fe" | "info" | "fail";

interface Step {
  phase: string;
  step: string;
  status: Status;
  detail: string;
  evidence?: string;
}

const results: Step[] = [];
const counts: Record<Status, number> = { ok: 0, leak: 0, gap: 0, fe: 0, info: 0, fail: 0 };

const ICON: Record<Status, string> = {
  ok: "✅", leak: "🔴", gap: "🟠", fe: "🟣", info: "ℹ️ ", fail: "❌",
};
const LABEL: Record<Status, string> = {
  ok: "فصل سليم", leak: "تسرب خادمي", gap: "فجوة خادمية", fe: "فجوة واجهة", info: "معلومة", fail: "فشل فحص",
};

function record(phase: string, step: string, status: Status, detail: string, evidence?: string) {
  results.push({ phase, step, status, detail, evidence });
  counts[status]++;
  console.log(`${ICON[status]} [${phase}] ${step} — ${detail}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand4 = () => String(Math.floor(1000 + Math.random() * 9000));

function errMsg(d: any): string {
  if (d == null) return "بلا جسم";
  if (typeof d === "string") return d.slice(0, 220);
  if (d.detail?.message) {
    const errs = d.detail.errors ? JSON.stringify(d.detail.errors).slice(0, 180) : "";
    return `${d.detail.message} ${errs}`;
  }
  if (typeof d.detail === "string") return d.detail;
  if (d.message) return d.message;
  return JSON.stringify(d).slice(0, 220);
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
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

/** مقارنة سوقين — أداة العرض الأساسية */
function cmp(label: string, sa: string, ye: string): string {
  return `${label}: سعودي=${sa} · يمني=${ye}`;
}

/** استخراج نموذج HTML (action + حقوله) — أداة سلسلة 3DS المجرّبة من tawfir-e2e */
function parseForm(html: string): { action: string; fields: Record<string, string> } {
  const action = /action="([^"]+)"/.exec(html)?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) fields[m[1]] = m[2];
  return { action, fields };
}

/** إكمال دفعة بطاقة حتى الحسم — آلة حالات 3DS المجرّبة:
 * (prepare → authenticate → acs_emulator → set_auth_result → acs_return) */
async function moyasarCompleteCard(pay: any): Promise<any> {
  const first = pay?.source?.transaction_url;
  if (!first) return pay;
  let html = await fetch(first, { redirect: "follow" }).then((r) => r.text());
  for (let i = 0; i < 8; i++) {
    const { action, fields } = parseForm(html);
    if (!action) break; // صفحة نهائية بلا نموذج
    const body = new URLSearchParams(fields);
    if (action.includes("authenticate")) {
      body.set("color_depth", "24");
      body.set("js_enabled", "true");
      body.set("language", "ar-SA");
      body.set("screen_height", "900");
      body.set("screen_width", "1440");
      body.set("time_zone", "-180");
    }
    if (action.includes("set_auth_result")) body.set("auth_result", "AUTHENTICATED");
    const target = action.startsWith("http") ? action : `https://api.moyasar.com${action}`;
    const res = await fetch(target, { method: "POST", body, redirect: "follow" });
    html = await res.text();
  }
  return fetch(`https://api.moyasar.com/v1/payments/${pay.id}`, {
    headers: { Authorization: `Basic ${btoa(ctx.moyasarPK + ":")}` },
  }).then((r) => r.json()).catch(() => null);
}

/* ═══════════════ حالة التشغيل ═══════════════ */

interface Account {
  key: string;
  label: string;
  phone: string;
  token: string;
  userId?: number;
  facilityId?: number;
  courierId?: number;
  localeCountry?: string;
}

const ctx: {
  adminToken?: string;
  saCustomer: Account;
  yeCustomer: Account;
  saOwner: Account;
  yeOwner: Account;
  saCourier: Account;
  yeCourier: Account;
  saRegions: Record<string, number>;
  yeRegions: Record<string, number>;
  yeFacilityProduct?: number;
  saFacilityProduct?: number;
  saFacilityWallet?: number;
  yeFacilityWallet?: number;
  moyasarPK?: string;
} = {
  saCustomer: { key: "ksa", label: "عميل سعودي", phone: saPhone(), token: "" },
  yeCustomer: { key: "kye", label: "عميل يمني", phone: yePhone(), token: "" },
  saOwner: { key: "osa", label: "تاجر سعودي", phone: saPhone(), token: "" },
  yeOwner: { key: "oye", label: "تاجر يمني", phone: yePhone(), token: "" },
  saCourier: { key: "csa", label: "مندوب سعودي", phone: saPhone(), token: "" },
  yeCourier: { key: "cye", label: "مندوب يمني", phone: yePhone(), token: "" },
  saRegions: {},
  yeRegions: {},
};

/* ═══════════════ المراحل ═══════════════ */

/* ── ٠ بيئة وعقد ── */
async function phase0_environment() {
  const P = "٠ بيئة وعقد";
  console.log(`\n━━━ ${P} ━━━`);
  const t0 = Date.now();
  const ping = await req("GET", "/locale/countries");
  record(P, "الوصول إلى api.tawfir.giize.com", ping.ok ? "ok" : "fail", `${ping.status} (${Date.now() - t0}ms)`);

  const adm = await req("POST", "/admin/login", { body: SUPER_ADMIN });
  if (adm.ok) {
    ctx.adminToken = adm.data.access_token;
    record(P, "دخول الأدمن الكلي", "ok", "توكن حي");
  } else record(P, "دخول الأدمن الكلي", "fail", errMsg(adm.data));

  // فحص العقد الحي: هل X-Market موثق؟
  try {
    const spec: any = await fetch(`${ROOT}/openapi.json`).then((r) => r.json());
    const paths = Object.keys(spec.paths ?? {});
    const raw = JSON.stringify(spec);
    const xm = raw.includes("X-Market");
    const cc = (raw.match(/country_code/g) ?? []).length;
    record(P, "عقد OpenAPI الحي", "info",
      `${paths.length} مساراً · X-Market موثق=${xm ? "نعم" : "لا — رأس ضمني بلا توثيق"} · country_code يظهر ${cc} مرة`);
  } catch (e: any) {
    record(P, "عقد OpenAPI الحي", "fail", String(e?.message ?? e).slice(0, 120));
  }

  for (const [cc, store] of [["966", ctx.saRegions], ["967", ctx.yeRegions]] as const) {
    const r = await req<any[]>(`GET`, `/regions?country_code=${cc}`, { market: cc });
    if (r.ok && Array.isArray(r.data)) {
      Object.assign(store, Object.fromEntries(r.data.map((x: any) => [x.name, x.id])));
      record(P, `مناطق ${cc === "966" ? "السعودية" : "اليمن"}`, "ok", `${r.data.length} منطقة`);
    } else record(P, `مناطق ${cc}`, "fail", errMsg(r.data));
  }

  // مويسر عبر عميل سعودي مرجعي
  const login = await req("POST", "/auth/login", { body: { identifier: "customer.sa@tawfir.test", password: PASSWORD } });
  if (login.ok) {
    const cfg = await req<any>("GET", "/finance/payments/config", { token: login.data.access_token });
    if (cfg.ok) {
      ctx.moyasarPK = cfg.data.publishable_key;
      record(P, "بوابة مويسر (مرجعي سعودي)", "ok", `mode=${cfg.data.mode}`);
    }
  }
}

/* ── تسجيل موحد ── */
async function otpToken(phone: string, name: string): Promise<string | null> {
  const rq = await req("POST", "/otp/request", { body: { target: phone, name } });
  if (!rq.ok) return null;
  const vf = await req("POST", "/otp/verify", { body: { target: phone, code: rq.data.dev_code ?? OTP_CODE } });
  return vf.ok ? vf.data.verified_token : null;
}

async function registerAll() {
  const P = "١ هوية وتسجيل";
  console.log(`\n━━━ ${P}: 6 حسابات جديدة × سوقين ━━━`);

  // عميلان
  for (const [a, cc, region] of [
    [ctx.saCustomer, "966", ctx.saRegions["الرياض"]],
    [ctx.yeCustomer, "967", ctx.yeRegions["صنعاء"] ?? Object.values(ctx.yeRegions)[0]],
  ] as [Account, string, number][]) {
    const tok = await otpToken(a.phone, `بصمة ${a.label} ${TAG}`);
    const reg = await req("POST", "/auth/register", {
      body: {
        full_name: `بصمة ${a.label} ${TAG}`, email: EMAIL(a.key), phone: a.phone,
        password: PASSWORD, password_confirm: PASSWORD, region_id: region,
        country_code: cc, otp_verified_token: tok,
      },
    });
    if (reg.ok || reg.status === 201) {
      a.token = reg.data.access_token ?? "";
      a.userId = reg.data.user_id;
      record(P, `تسجيل ${a.label}`, "ok", `user=${a.userId} (طلب country_code=${cc})`);
    } else record(P, `تسجيل ${a.label}`, "fail", errMsg(reg.data));
  }

  // تاجران
  const ownerSpec = (a: Account, cc: string, region: number) => ({
    full_name: `بصمة ${a.label} ${TAG}`,
    email: EMAIL(a.key),
    phone: a.phone,
    password: PASSWORD,
    password_confirm: PASSWORD,
    otp_verified_token: null as string | null,
    facility_name: cc === "966" ? `مطعم فحص الفصل السعودي ${TAG}` : `مطعم فحص الفصل اليمني ${TAG}`,
    facility_type: "restaurant",
    region_id: region,
    description: "منشأة اختبار تدقيق فصل الأسواق — بوصمة",
    address: cc === "966" ? "الرياض، حي العليا، شارع التحلية" : "صنعاء، شارع حدة، جوار الجامع",
    latitude: cc === "966" ? 24.7136 : 15.3694,
    longitude: cc === "966" ? 46.6753 : 44.191,
    location_source: "map",
    discount_rate: 10,
    discount_hint: "خصم اختبار 10%",
    country_code: cc,
  });
  for (const [a, cc, region] of [
    [ctx.saOwner, "966", ctx.saRegions["الرياض"]],
    [ctx.yeOwner, "967", ctx.yeRegions["صنعاء"] ?? Object.values(ctx.yeRegions)[0]],
  ] as [Account, string, number][]) {
    const tok = await otpToken(a.phone, `بصمة ${a.label} ${TAG}`);
    const body = ownerSpec(a, cc, region);
    body.otp_verified_token = tok;
    const reg = await req("POST", "/owner/register", { body });
    if (reg.ok || reg.status === 201) {
      a.userId = reg.data.user_id;
      a.facilityId = reg.data.facility_id;
      record(P, `تسجيل ${a.label}`, "ok", `user=${a.userId} facility=${a.facilityId} (طلب country_code=${cc})`);
    } else record(P, `تسجيل ${a.label}`, "fail", errMsg(reg.data));
  }

  // مناديبان
  const couriers = [
    { a: ctx.saCourier, market: "966", plate: `1-${rand4()}-ح`, license: `1${rand4()}${rand4()}9` },
    { a: ctx.yeCourier, market: undefined as string | undefined, plate: `2-${rand4()}-س`, license: `2${rand4()}${rand4()}8` },
  ];
  for (const c of couriers) {
    const tok = await otpToken(c.a.phone, `بصمة ${c.a.label} ${TAG}`);
    const reg = await req("POST", "/courier/auth/register", {
      market: c.market,
      body: {
        document_full_name: `بصمة ${c.a.label} ${TAG}`,
        public_name: `بصمة ${c.a.label}`,
        birth_date: "1996-05-14",
        email: EMAIL(c.a.key),
        phone: c.a.phone,
        password: PASSWORD,
        password_confirm: PASSWORD,
        vehicle_type: "motorcycle",
        vehicle_plate: c.plate,
        license_number: c.license,
        region_id: c.market === "966" ? ctx.saRegions["الرياض"] : (ctx.yeRegions["صنعاء"] ?? Object.values(ctx.yeRegions)[0]),
        preferred_shifts: "مسائي",
        id_document_type: "national_id",
        id_document_number: c.license,
      },
    });
    if (reg.ok || reg.status === 201) {
      c.a.userId = reg.data.user_id;
      c.a.courierId = reg.data.courier_id;
      record(P, `تسجيل ${c.a.label}`, "ok",
        `courier=${c.a.courierId} (هاتف ${c.a.phone.slice(0, 6)}… · X-Market المرسل=${c.market ?? "بلا"})`);
    } else record(P, `تسجيل ${c.a.label}`, "fail", errMsg(reg.data));
  }

  // دخول العملاء والتجار لجلب التوكنات (التسجيل لا يعيد توكن دائماً)
  for (const [a, ep] of [
    [ctx.saCustomer, "/auth/login"], [ctx.yeCustomer, "/auth/login"],
    [ctx.saOwner, "/owner/login"], [ctx.yeOwner, "/owner/login"],
  ] as [Account, string][]) {
    if (a.token) continue;
    const lg = await req("POST", ep, { body: { identifier: EMAIL(a.key), password: PASSWORD } });
    if (lg.ok) a.token = lg.data.access_token;
    else record(P, `دخول ${a.label}`, "fail", errMsg(lg.data));
  }
  for (const a of [ctx.saCourier, ctx.yeCourier]) {
    const lg = await req("POST", "/courier/auth/login", { body: { identifier: EMAIL(a.key), password: PASSWORD } });
    if (lg.ok) a.token = lg.data.access_token;
    else record(P, `دخول ${a.label}`, "fail", errMsg(lg.data));
  }

  /* 🔎 الفحص المحوري: أي سوق خزّن الخادم لكل حساب؟ */
  console.log(`\n─── فحص السوق المخزن لكل حساب (GET /locale/me) ───`);
  for (const a of [ctx.saCustomer, ctx.yeCustomer, ctx.saOwner, ctx.yeOwner, ctx.saCourier, ctx.yeCourier]) {
    const me = await req<any>("GET", "/locale/me", { token: a.token });
    a.localeCountry = me.ok ? String(me.data.country_code) : "؟";
    const expected = a.key.endsWith("sa") ? "966" : "967";
    const leaked = me.ok && a.localeCountry !== expected;
    record(P, `سوق ${a.label} المخزن خادمياً`, leaked ? "leak" : me.ok ? "ok" : "fail",
      me.ok ? `المخزن=${a.localeCountry} · المتوقع=${expected} · العملة=${me.data.currency ?? "—"}${leaked ? " ← تسرب!" : ""}` : errMsg(me.data),
      me.ok ? JSON.stringify({ country_code: me.data.country_code, currency: me.data.currency }) : undefined);
  }
}

/* ── ٢ اعتمادات إدارية ── */
async function phase2_approvals() {
  const P = "٢ اعتمادات";
  console.log(`\n━━━ ${P} ━━━`);
  if (!ctx.adminToken) return;
  for (const o of [ctx.saOwner, ctx.yeOwner]) {
    const r = await req("PATCH", `/admin/facilities/${o.facilityId}/approve`, { token: ctx.adminToken });
    record(P, `اعتماد منشأة ${o.label}`, r.ok ? "ok" : "fail", r.ok ? "معتمدة" : errMsg(r.data));
  }
  for (const c of [ctx.saCourier, ctx.yeCourier]) {
    const r = await req("POST", `/admin/couriers/${c.courierId}/decision`, { token: ctx.adminToken, body: { action: "verify" } });
    record(P, `توثيق ${c.label}`, r.ok ? "ok" : "fail", r.ok ? "موثق" : errMsg(r.data));
  }
}

/* ── ٣ منشآت ومنتجات: عبور السوق ── */
async function phase3_facilities_products() {
  const P = "٣ منشآت عبر السوقين";
  console.log(`\n━━━ ${P} ━━━`);

  // جلب منتج منشأتنا في السوقين — مرجع صحيح لكل الطلبات اللاحقة (بدل ?? 1)
  for (const [o, pref] of [[ctx.saOwner, "saFacilityProduct"], [ctx.yeOwner, "yeFacilityProduct"]] as [Account, "saFacilityProduct" | "yeFacilityProduct"][]) {
    const pr = await req<any[]>(`GET`, `/facilities/${o.facilityId}/products`, { token: o.token, market: o.key.endsWith("sa") ? "966" : "967" });
    const items = Array.isArray(pr.data) ? pr.data : Array.isArray(pr.data?.items) ? pr.data.items : [];
    if (items.length) ctx[pref] = items[0].id;
  }

  // قوائم الزائر بالسوقين
  for (const cc of ["966", "967"] as const) {
    const r = await req<any[]>(`GET`, `/facilities?country_code=${cc}`, { market: cc });
    const ids = Array.isArray(r.data) ? r.data.map((f: any) => f.id) : [];
    const other = cc === "966" ? ctx.yeOwner.facilityId : ctx.saOwner.facilityId;
    const own = cc === "966" ? ctx.saOwner.facilityId : ctx.yeOwner.facilityId;
    const contaminated = other != null && ids.includes(other);
    const includesOwn = own != null && ids.includes(own);
    record(P, `قائمة الزائر country_code=${cc}`, contaminated ? "leak" : r.ok ? "ok" : "fail",
      `${Array.isArray(r.data) ? r.data.length : "—"} منشأة · تتضمن منشأة السوق الآخر=${contaminated ? "نعم ← تسرب!" : "لا"} · منشأتنا موجودة=${includesOwn}`,
      contaminated ? `منشأة #${other} من سوق ${cc === "966" ? "967" : "966"} ظهرت في قائمة ${cc}` : undefined);
  }

  // قائمة الزائر بلا أي فلتر — ماذا يرجع؟
  const raw = await req<any[]>("GET", `/facilities`);
  const rawIds = Array.isArray(raw.data) ? raw.data.map((f: any) => f.id) : [];
  const mix = rawIds.includes(ctx.saOwner.facilityId!) && rawIds.includes(ctx.yeOwner.facilityId!);
  record(P, "قائمة الزائر بلا country_code", mix ? "gap" : "info",
    `${Array.isArray(raw.data) ? raw.data.length : "—"} منشأة · خلط السوقين=${mix ? "نعم (تافه إن كان الواجهة ترسل الفلتر دائماً — لكن العقد يجب أن يفرضه)" : "لا"}`);

  // عبور مباشر: عميل سعودي يفتح منشأة/منتج يمني بتوكنه
  const saSeesYe = await req<any>("GET", `/facilities/${ctx.yeOwner.facilityId}`, { token: ctx.saCustomer.token, market: "966" });
  record(P, "عميل سعودي يفتح منشأة يمنية (توكن)", saSeesYe.ok ? "gap" : "ok",
    saSeesYe.ok
      ? `الخادم أعاد المنشأة #${ctx.yeOwner.facilityId} بتوكن سعودي — الحماية عبر السوق واجهية فقط (CrossMarketGuard)، لا حارس خادمي`
      : `الخادم رفض (${saSeesYe.status}) — حارس خادمي سليم`);
  const yeSeesSa = await req<any>("GET", `/facilities/${ctx.saOwner.facilityId}`, { token: ctx.yeCustomer.token, market: "967" });
  record(P, "عميل يمني يفتح منشأة سعودية (توكن)", yeSeesSa.ok ? "gap" : "ok",
    yeSeesSa.ok ? `الخادم أعاد المنشأة #${ctx.saOwner.facilityId} بتوكن يمني` : `الخادم رفض (${yeSeesSa.status})`);

  // منتجات منشأة السوق الآخر
  const yeProducts = await req<any[]>("GET", `/facilities/${ctx.yeOwner.facilityId}/products`, { token: ctx.saCustomer.token, market: "966" });
  record(P, "عميل سعودي يقرأ منتجات منشأة يمنية", Array.isArray(yeProducts.data) && yeProducts.data.length ? "gap" : "ok",
    Array.isArray(yeProducts.data) ? `${yeProducts.data.length} منتجاً عادت بتوكن سعودي` : errMsg(yeProducts.data));

  // عبور الطلب: عميل سعودي يطلب من منشأة يمنية
  const saToYe = await req<any>("POST", "/orders", {
    token: ctx.saCustomer.token, market: "966",
    body: {
      facility_id: ctx.yeOwner.facilityId,
      items: [{ product_id: ctx.yeFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 24.7136, delivery_lng: 46.6753,
      delivery_address: "الرياض (محاولة عبور)",
      payment_method: "cash",
      notes: "محاولة عبور سوق — بوصمة",
    },
  });
  record(P, "عميل سعودي يطلب من منشأة يمنية", saToYe.status === 201 ? "leak" : saToYe.status >= 400 && saToYe.status < 500 ? "ok" : "fail",
    saToYe.status === 201
      ? `⚠️ طلب عبور #${saToYe.data.id} قُبل خادمياً — لا حارس سوق على POST /orders`
      : `رفض ${saToYe.status}: ${errMsg(saToYe.data)}`);

  // عبور معاكس: عميل يمني يطلب من منشأة سعودية
  const yeToSa = await req<any>("POST", "/orders", {
    token: ctx.yeCustomer.token, market: "967",
    body: {
      facility_id: ctx.saOwner.facilityId,
      items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 15.3694, delivery_lng: 44.191,
      delivery_address: "صنعاء (محاولة عبور)",
      payment_method: "cash",
      notes: "محاولة عبور سوق — بوصمة",
    },
  });
  record(P, "عميل يمني يطلب من منشأة سعودية", yeToSa.status === 201 ? "leak" : yeToSa.status >= 400 && yeToSa.status < 500 ? "ok" : "fail",
    yeToSa.status === 201 ? `⚠️ طلب عبور #${yeToSa.data.id} قُبل خادمياً` : `رفض ${yeToSa.status}: ${errMsg(yeToSa.data)}`);
}

/* ── ٤ التسعير ── */
async function phase4_pricing() {
  const P = "٤ تسعير";
  console.log(`\n━━━ ${P} ━━━`);

  // تقدير التوصيل بالسوقين (نفس المسافة تقريباً ~1.5كم من كل منشأة)
  for (const [o, mkt] of [[ctx.saOwner, "966"], [ctx.yeOwner, "967"]] as [Account, string][]) {
    const est = await req<any>("GET", `/orders/delivery-estimate?facility_id=${o.facilityId}&lat=${o.facilityId === ctx.saOwner.facilityId ? 24.725 : 15.38}&lng=${o.facilityId === ctx.saOwner.facilityId ? 46.685 : 44.2}`,
      { token: mkt === "966" ? ctx.saCustomer.token : ctx.yeCustomer.token, market: mkt });
    const hasCurrency = est.ok && est.data && "currency" in est.data;
    record(P, `تقدير توصيل منشأة ${mkt === "966" ? "سعودية" : "يمنية"}`,
      est.ok ? (hasCurrency ? "ok" : "gap") : "fail",
      est.ok ? `fee=${est.data.fee} ${est.data.currency ?? "(بلا عملة في الرد ← العملة تُستنبط واجهياً من جلسة المشاهد!)"}` : errMsg(est.data),
      est.ok ? JSON.stringify(est.data).slice(0, 160) : undefined);
  }
  // نفس المنشأة السعودية برأس سوق معاكس — المحرك الوطني يشتق من سوق المنشأة
  // والرأس لا يستطيع تلاعب السعر (لو تغير السعر بالرأس = ثغرة تلاعب، ولو عاد 200 = محرك قديم)
  const saCross = await req<any>("GET", `/orders/delivery-estimate?facility_id=${ctx.saOwner.facilityId}&lat=24.725&lng=46.685`, { token: ctx.saCustomer.token, market: "967" });
  const saDirect = await req<any>("GET", `/orders/delivery-estimate?facility_id=${ctx.saOwner.facilityId}&lat=24.725&lng=46.685`, { token: ctx.saCustomer.token, market: "966" });
  const fCross = Number(saCross.data?.fee), fDirect = Number(saDirect.data?.fee);
  const estCur = saDirect.data?.currency;
  const nationalOk = saDirect.ok && saCross.ok && fDirect === 8 && fCross === fDirect && (estCur === undefined || estCur === "SAR");
  record(P, "تقدير توصيل منشأة سعودية (المحرك الوطني + منع تلاعب الرأس)", nationalOk ? "ok" : "leak",
    `fee(966)=${saDirect.data?.fee}${estCur ? " " + estCur : ""} · fee(967)=${saCross.data?.fee} — ${nationalOk ? "المحرك الوطني السعودي (8/3كم/1.5) والرأس لا يغيّر السعر" : "السعر خاطئ أو قابل للتلاعب بالرأس!"}`,
    JSON.stringify({ direct: saDirect.data, cross: saCross.data }).slice(0, 240));

  // معاينة تسعير التاجر
  for (const [o, mkt] of [[ctx.saOwner, "966"], [ctx.yeOwner, "967"]] as [Account, string][]) {
    const pp = await req<any>("POST", `/owner/${o.facilityId}/pricing-preview`, {
      token: o.token, body: { price: mkt === "966" ? 50 : 5000, offer_discount_rate: 10 },
    });
    const cur = pp.ok ? pp.data.currency : undefined;
    record(P, `معاينة تسعير ${o.label}`, pp.ok ? (cur ? "ok" : "gap") : "fail",
      pp.ok ? (cur ? `currency=${cur} موجود في الرد` : `بند P1-1 جزئي باقٍ: currency غائب في pricing-preview (موجود في delivery-estimate) — الواجهة تعرض بعملة سوق المالك من locale/me`) : errMsg(pp.data),
      pp.ok ? JSON.stringify(pp.data).slice(0, 160) : undefined);
  }

  // سطح التسعير الإداري
  if (ctx.adminToken) {
    const ap = await req<any>("GET", "/admin/pricing", { token: ctx.adminToken });
    if (ap.ok) {
      const d = ap.data;
      const nat = d.national ?? {};
      const sa = nat["966"], ye = nat["967"];
      const saOk = sa && Number(sa.base_fee) === 8 && Number(sa.base_km) === 3 && Number(sa.per_km) === 1.5;
      const yeOk = ye && Number(ye.base_fee) > 0 && Number(ye.per_km) > 0;
      record(P, "GET /admin/pricing (السطح الوطني لكل سوق)", saOk && yeOk ? "ok" : "gap",
        saOk && yeOk
          ? `national: 966={base_fee:${sa.base_fee}, base_km:${sa.base_km}, per_km:${sa.per_km}} · 967={base_fee:${ye.base_fee}, base_km:${ye.base_km}, per_km:${ye.per_km}} · التعديل: ${nat.editable_via ?? "—"} (السطح القديم price_per_km=${d.price_per_km} غير مُستهلك: live_pricing_enabled=${d.live_pricing_enabled})`
          : `السطح الوطني ناقص أو بقيم خاطئة: ${JSON.stringify(nat).slice(0, 200)}`,
        JSON.stringify({ national: nat, live_pricing_enabled: d.live_pricing_enabled }).slice(0, 240));
    } else record(P, "GET /admin/pricing", "fail", errMsg(ap.data));

    const fs = await req<Record<string, any>>("GET", "/finance/settings", { token: ctx.adminToken });
    if (fs.ok) {
      const keys = Object.keys(fs.data ?? {});
      const saK = keys.filter((k) => k.startsWith("SA_"));
      const yeK = keys.filter((k) => k.startsWith("YE_"));
      record(P, "GET /finance/settings (مفاتيح سوقية)", "info",
        `SA_*=${saK.length} مفتاحاً (${saK.slice(0, 3).join(",")}…) · YE_*=${yeK.length} (${yeK.slice(0, 3).join(",")}…) — والمحرك الوطني مُثبت عملياً بالتقديرات (سعودي 8 ريال / يمني 300)`,
        JSON.stringify(keys).slice(0, 300));
    }
  }
}

/* ── ٥ بوابات الدفع ── */
async function phase5_payments() {
  const P = "٥ بوابات الدفع";
  console.log(`\n━━━ ${P} ━━━`);

  // إعدادات مويسر: زائر بالسوقين ثم عميل بالسوقين
  const vSa = await req<any>("GET", "/finance/payments/config", { market: "966" });
  const vYe = await req<any>("GET", "/finance/payments/config", { market: "967" });
  if (!vSa.ok || !vYe.ok) {
    record(P, "payments/config للزائر", "ok",
      `الخادم يرفض الزائر (${vSa.status}/${vYe.status}) — وسائل الدفع تُشتق للمسجل من سوقه، وللزائر تعرضها الواجهة من سوق الجلسة والحرس الخادمي (422) يعوض أي تجاوز`);
  } else {
    const sameVisitor = JSON.stringify(vSa.data) === JSON.stringify(vYe.data);
    record(P, "payments/config للزائر (966 مقابل 967)", sameVisitor ? "gap" : "ok",
      sameVisitor ? "الرد متطابق تماماً — الخادم لا يميز وسائل الدفع بالسوق للزائر" : "الرد يختلف بالسوق — فصل خادمي سليم");
  }

  const cSa = await req<any>("GET", "/finance/payments/config", { token: ctx.saCustomer.token });
  const cYe = await req<any>("GET", "/finance/payments/config", { token: ctx.yeCustomer.token });
  const sameCustomer = JSON.stringify(cSa.data) === JSON.stringify(cYe.data);
  record(P, "payments/config لعميل سعودي مقابل يمني", sameCustomer ? "gap" : "ok",
    sameCustomer
      ? "متطابق — عميل يمني يحصل على إعدادات مويسر بنفسها (الواجهة تخفي الإلكتروني، الخادم لا يمنعه)"
      : "يختلف بالسوق — فصل خادمي سليم");

  // نقطة الدفع على طلب يمني (POST /orders/{id}/pay هي نقطة رفع إشعار التحويل)
  const yeOrder = await req<any>("POST", "/orders", {
    token: ctx.yeCustomer.token, market: "967",
    body: {
      facility_id: ctx.yeOwner.facilityId,
      items: [{ product_id: ctx.yeFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 15.372, delivery_lng: 44.193,
      delivery_address: "صنعاء — فحص بوابة الدفع",
      payment_method: "cash",
      notes: "فحص بوابة الدفع — بوصمة",
    },
  });
  if (yeOrder.status === 201) {
    const pay = await req("POST", `/orders/${yeOrder.data.id}/pay`, { token: ctx.yeCustomer.token, market: "967" });
    record(P, "POST /orders/{id}/pay على طلب يمني", pay.ok ? "info" : "info",
      pay.ok ? "قُبلت — نقطة الدفع هي رفع إشعار تحويل (تدفق يمني) بلا أي تمييز سوقي" : `الخطأ المطلوب: ${errMsg(pay.data).slice(0, 120)}`);
    await req("POST", `/orders/${yeOrder.data.id}/cancel`, { token: ctx.yeCustomer.token, market: "967" });
  } else record(P, "إنشاء طلب يمني للفحص", "fail", errMsg(yeOrder.data));

  // حرس المحفظة السعودية (P0-6): طلب wallet بمحفظة حقيقية على منشأة سعودية يجب أن يُرفض 422 بالحرس السوقي
  // (نضمن وجود محفظة للمنشأة أولاً كي يصطدم الطلب بالحرس السوقي لا برسالة «اختر محفظة»)
  let saWalletId: number | null = null;
  const wl = await req<any[]>(`GET`, `/facilities/${ctx.saOwner.facilityId}/wallets`, { token: ctx.saCustomer.token, market: "966" });
  const wlItems = Array.isArray(wl.data) ? wl.data : Array.isArray(wl.data?.items) ? wl.data.items : [];
  if (wlItems.length) saWalletId = wlItems[0].id;
  else {
    const wc = await req<any>("POST", `/owner/facilities/${ctx.saOwner.facilityId}/wallets`, {
      token: ctx.saOwner.token,
      body: { provider_id: 1, account_type: "phone", phone_number: ctx.saOwner.phone, account_name: `بصمة حرس ${ctx.saOwner.label}`, display_order: 1 },
    });
    if (wc.ok || wc.status === 201) saWalletId = wc.data.id;
  }
  const saWalletOrder = await req<any>("POST", "/orders", {
    token: ctx.saCustomer.token, market: "966",
    body: {
      facility_id: ctx.saOwner.facilityId,
      items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 24.72, delivery_lng: 46.68,
      delivery_address: "الرياض — فحص الدفع بالمحفظة",
      payment_method: "wallet",
      payment_wallet_id: saWalletId,
      notes: "فحص بوابة الدفع — بوصمة",
    },
  });
  if (saWalletOrder.status === 201) {
    record(P, "عميل سعودي ينشئ طلباً بمحفظة تاجر", "leak",
      `طلب #${saWalletOrder.data.id} قُبل بطريقة wallet — الخادم لا يمنع ما تخفيه الواجهة (تناقض سياسة)`);
    await req("POST", `/orders/${saWalletOrder.data.id}/cancel`, { token: ctx.saCustomer.token, market: "966" });
  } else if (saWalletOrder.status === 422 || saWalletOrder.status === 400) {
    const msg = errMsg(saWalletOrder.data);
    const marketGuard = msg.includes("غير متاح في السوق السعودي") || msg.includes("السوق");
    record(P, "حرس المحفظة السعودية (P0-6)", "ok",
      `رفض خادمي (${saWalletOrder.status}) بمحفظة حقيقية #${saWalletId ?? "—"}: ${msg.slice(0, 160)}${marketGuard ? " ← الحرس السوقي نفسه ✓" : ""}`);
    // طلب كاش مرجعي بمنتج صحيح من المنشأة نفسها
    const saCash = await req<any>("POST", "/orders", {
      token: ctx.saCustomer.token, market: "966",
      body: {
        facility_id: ctx.saOwner.facilityId,
        items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
        delivery_lat: 24.72, delivery_lng: 46.68,
        delivery_address: "الرياض — طلب مرجعي كاش",
        payment_method: "cash",
        notes: "فحص بوابة الدفع — بوصمة",
      },
    });
    if (saCash.status === 201) record(P, "طلب سعودي كاش مرجعي", "ok",
      `طلب #${saCash.data.id} · total=${saCash.data.total} · delivery_fee=${saCash.data.delivery_fee} ${saCash.data.currency ?? ""}`);
    else record(P, "طلب سعودي للفحص", "fail", errMsg(saCash.data));
  } else record(P, "طلب سعودي للفحص", "fail", errMsg(saWalletOrder.data));
}

/* ── ٦ المحافظ ── */
async function phase6_wallets() {
  const P = "٦ محافظ";
  console.log(`\n━━━ ${P} ━━━`);

  // قائمة مزودي المحافظ بكل الصيغ
  const probes: [string, Parameters<typeof req>[2]][] = [
    ["زائر X-Market: 966", { market: "966" }],
    ["زائر X-Market: 967", { market: "967" }],
    ["عميل سعودي (توكن)", { token: ctx.saCustomer.token }],
    ["عميل يمني (توكن)", { token: ctx.yeCustomer.token }],
    ["تاجر سعودي (توكن)", { token: ctx.saOwner.token }],
  ];
  const lists: string[] = [];
  for (const [label, o] of probes) {
    const r = await req<any[]>("GET", "/wallets/providers", o);
    const names = Array.isArray(r.data) ? r.data.map((p: any) => p.name ?? p.code).join("،") : errMsg(r.data);
    lists.push(`${label} → ${names}`);
  }
  const allSame = lists.every((l) => l === lists[0]);
  record(P, "GET /wallets/providers بكل الصيغ", allSame ? "gap" : "ok",
    allSame ? "القائمة نفسها للجميع — «المحافظ اليمنية» تُعرض حتى للزائر/العميل السعودي (العقد نفسه موصوف يمنياً)" : "القائمة تختلف بالسوق — فصل سليم",
    lists.join(" | "));
  const jawali = await req<any[]>("GET", "/wallets/providers", { token: ctx.yeCustomer.token });
  const jw = Array.isArray(jawali.data) ? jawali.data.find((p: any) => p.code === "jawali") : null;

  // محافظ منشآت السوقين
  for (const [o, wref] of [[ctx.saOwner, "saFacilityWallet"], [ctx.yeOwner, "yeFacilityWallet"]] as [Account, "saFacilityWallet" | "yeFacilityWallet"][]) {
    const r = await req<any>("POST", `/owner/facilities/${o.facilityId}/wallets`, {
      token: o.token,
      body: jw
        ? { provider_id: jw.id, account_type: "phone", phone_number: o.phone, account_name: `بصمة ${o.label}`, display_order: 1 }
        : { provider_id: 1, account_type: "phone", phone_number: o.phone, account_name: `بصمة ${o.label}`, display_order: 1 },
    });
    if (r.ok || r.status === 201) {
      ctx[wref] = r.data.id;
      const cur = r.data.currency ?? "(بلا عملة في الرد)";
      record(P, `محفظة استلام ${o.label}`, "info", `#${r.data.id} · currency=${cur}`);
    } else record(P, `محفظة استلام ${o.label}`, "fail", errMsg(r.data));
  }
  // قراءة محافظ المنشأة كعميل سعودي (يمنية)
  const saReadsYe = await req<any[]>("GET", `/facilities/${ctx.yeOwner.facilityId}/wallets`, { token: ctx.saCustomer.token, market: "966" });
  record(P, "عميل سعودي يقرأ محافظ منشأة يمنية", Array.isArray(saReadsYe.data) && saReadsYe.data.length ? "gap" : "ok",
    Array.isArray(saReadsYe.data) ? `${saReadsYe.data.length} محفظة عادت — لا فلتر سوق على قراءة المحافظ` : errMsg(saReadsYe.data));

  // وجهات صرف المندوبين — الواجهة ترسل country:"SA" مصمتة
  const destFor = (a: Account, country: string, mobile: string) => req<any>("POST", "/finance/courier/destination", {
    token: a.token,
    body: { type: "wallet", holder_name: `بصمة ${a.label}`, mobile, country },
  });
  const d1 = await destFor(ctx.saCourier, "SA", `9665${rand4()}${rand4()}`);
  record(P, "مندوب سعودي: وجهة صرف country=SA (كما ترسل الواجهة)", d1.ok ? "info" : "fail",
    d1.ok ? `قُبلت · country المخزن=${d1.data.country ?? "?"} · currency=${d1.data.currency ?? "—"}` : errMsg(d1.data));
  const d2 = await destFor(ctx.yeCourier, "SA", `9665${rand4()}${rand4()}`);
  record(P, "مندوب يمني: وجهة صرف country=SA (ماذا تفعل واجهتنا فعلاً!)", d2.ok ? "fe" : "info",
    d2.ok ? `قُبلت — مندوب يمني سيصرف أرباحه عبر بوابة سعودية ← 🟣 فجوة واجهة مؤكدة (CourierFinanceContent country:"SA" مصمتة)` : `الخادم رفض (${d2.status}): ${errMsg(d2.data)}`);
  const d3 = await destFor(ctx.yeCourier, "YE", `9677${rand4()}${rand4()}`);
  record(P, "مندوب يمني: وجهة صرف country=YE", d3.ok ? "ok" : "gap",
    d3.ok ? `قُبلت · country=${d3.data.country} · currency=${d3.data.currency ?? "—"}` : `الخادم رفض YE (${d3.status}): ${errMsg(d3.data)} ← العقد default SA فقط`);

  // رصيد المندوبين
  for (const c of [ctx.saCourier, ctx.yeCourier]) {
    const b = await req<any>("GET", "/finance/courier/my/balance", { token: c.token });
    record(P, `رصيد ${c.label}`, b.ok ? "info" : "fail",
      b.ok ? `receivable=${b.data.receivable} · currency=${b.data.currency ?? "(بلا عملة!)"}` : errMsg(b.data));
  }
}

/* ── ٧ المالية والعمولات ── */
async function phase7_finance() {
  const P = "٧ مالية";
  console.log(`\n━━━ ${P} ━━━`);

  for (const o of [ctx.saOwner, ctx.yeOwner]) {
    const card = await req<any>("GET", "/finance/owner/card", { token: o.token });
    const cur = card.ok ? card.data.currency : undefined;
    const expected = o === ctx.saOwner ? "SAR" : "YER";
    const leaked = card.ok && cur !== expected;
    record(P, `بطاقة ${o.label} المالية`, leaked ? "leak" : card.ok ? "ok" : "fail",
      card.ok ? `currency=${cur} (المتوقع ${expected}) · عمولات=${card.data.accumulated_commissions} · ذمة=${card.data.outstanding_debt}${leaked ? " ← تسرب!" : ""}` : errMsg(card.data),
      card.ok ? JSON.stringify({ currency: card.data.currency, commissions: card.data.accumulated_commissions }) : undefined);
  }

  // طلب سعودي مدفوع إلكترونياً → هل تتولد عمولة فوراً بعد verify (بلا webhook)؟
  if (ctx.moyasarPK) {
    const order = await req<any>("POST", "/orders", {
      token: ctx.saCustomer.token, market: "966",
      body: {
        facility_id: ctx.saOwner.facilityId,
        items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
        delivery_lat: 24.716, delivery_lng: 46.68,
        delivery_address: "الرياض — فحص عمولة",
        payment_method: "cash",
        notes: "فحص عمولة — بوصمة",
      },
    });
    if (order.status === 201) {
      const probe = await fetch("https://api.moyasar.com/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(ctx.moyasarPK + ":")}` },
        body: JSON.stringify({
          amount: Math.round(Number(order.data.total ?? 30) * 100), currency: "SAR",
          description: `توفير — تدقيق فصل #${order.data.id}`, callback_url: "https://tawfir.giize.com/payment/return?order=0",
          source: { type: "creditcard", name: "Ahmed Ali", number: "4111111111111111", cvc: "123", month: "12", year: "30", manual: false },
        }),
      }).then((r) => r.json());
      if (probe?.id) {
        // سلسلة 3DS المجرّبة من tawfir-e2e (prepare → authenticate → acs_emulator → set_auth_result → acs_return)
        let final: any = await moyasarCompleteCard(probe);
        // انتظار إضافي إن لم تحسم بعد (حتى 10 ثوانٍ)
        for (let i = 0; i < 7 && final?.status === "initiated"; i++) {
          await sleep(1500);
          final = await fetch(`https://api.moyasar.com/v1/payments/${probe.id}`, {
            headers: { Authorization: `Basic ${btoa(ctx.moyasarPK + ":")}` },
          }).then((r) => r.json());
        }
        const verify = final?.status === "paid"
          ? await req<any>("POST", `/finance/orders/${order.data.id}/pay/verify`, {
              token: ctx.saCustomer.token, market: "966",
              body: { moyasar_payment_id: probe.id, idempotency_key: `basma-audit-${order.data.id}` },
            })
          : { ok: false, data: `الدفعة لم تُدفع (حالتها: ${final?.status ?? "؟"})` } as any;
        record(P, "دفع إلكتروني سعودي + verify", verify.ok ? "ok" : "fail",
          verify.ok ? `دفعة #${verify.data.id ?? "?"} مسجلة على الطلب #${order.data.id} (حالة مويسر=${final.status})` : errMsg(verify.data));
        // الأثر المالي: عقد القسم الرابع — القيود تنطلق من verify (record_order_payment) حتى بلا webhook
        await sleep(2000);
        const card2 = await req<any>("GET", "/finance/owner/card", { token: ctx.saOwner.token });
        const entries = await req<any>("GET", "/finance/entries?limit=50", { token: ctx.adminToken });
        const allEntries: any[] = Array.isArray(entries.data)
          ? entries.data
          : Array.isArray(entries.data?.items) ? entries.data.items : [];
        const orderEntries = allEntries.filter((e: any) => Number(e.order_id) === Number(order.data.id));
        const hasPayment = orderEntries.some((e: any) => e.entry_type === "order_payment");
        const hasCommission = orderEntries.some((e: any) => e.entry_type === "platform_commission");
        record(P, "قيود verify تنطلق بلا webhook (القسم الرابع)", hasPayment && hasCommission ? "ok" : "gap",
          `طلب #${order.data.id}: order_payment=${hasPayment ? "موجود ✓" : "مفقود"} · platform_commission=${hasCommission ? "موجود ✓" : "مفقود"}${orderEntries.length ? "" : " — لا قيود لهذا الطلب إطلاقاً"} · بطاقة التاجر: عمولات=${card2.ok ? card2.data.accumulated_commissions : "—"}`,
          JSON.stringify(orderEntries).slice(0, 300));
      } else record(P, "دفعة مويسر للفحص", "fail", JSON.stringify(probe).slice(0, 120));
    } else record(P, "طلب سعودي لفحص العمولة", "fail", errMsg(order.data));
  }

  // نظرات الإدارة
  if (ctx.adminToken) {
    const ov = await req<any>("GET", "/admin/wallets/overview", { token: ctx.adminToken });
    record(P, "admin/wallets/overview", ov.ok ? "info" : "fail",
      ov.ok ? JSON.stringify(ov.data).slice(0, 180) : errMsg(ov.data));
    const po = await req<any[]>("GET", "/finance/payouts?limit=10", { token: ctx.adminToken });
    const curs = Array.isArray(po.data) ? [...new Set(po.data.map((p: any) => p.currency ?? "?"))] : [];
    record(P, "admin/payouts — العملات الموجودة", po.ok ? "info" : "fail",
      po.ok ? `عملات=${curs.join("،") || "بلا بيانات"}` : errMsg(po.data));
  }
}

/* ── ٨ المندوبون والرادار ── */
async function phase8_couriers() {
  const P = "٨ مناديب";
  console.log(`\n━━━ ${P} ━━━`);

  // 1) سوق المندوب السعودي المخزن (مؤكد سابقاً: 967)
  const saMe = await req<any>("GET", "/locale/me", { token: ctx.saCourier.token });
  record(P, "سوق المندوب السعودي المخزن", saMe.ok && saMe.data.country_code !== "966" ? "leak" : saMe.ok ? "ok" : "fail",
    saMe.ok ? `country_code=${saMe.data.country_code}${saMe.data.country_code !== "966" ? " ← مسجل برقم سعودي لكن مخزن يمنياً — نداءات السعودية لن تصل أبداً!" : " ✓ 966"}` : errMsg(saMe.data));

  // 2) رادار قبل الإصلاح: نداء مطعم سعودي — هل يصل للمندوب السعودي؟
  const orderA = await req<any>("POST", "/orders", {
    token: ctx.saCustomer.token, market: "966",
    body: {
      facility_id: ctx.saOwner.facilityId, items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 24.718, delivery_lng: 46.679, delivery_address: "الرياض — رادار قبل",
      payment_method: "cash", notes: "رادار قبل الإصلاح — بوصمة",
    },
  });
  if (orderA.status === 201) {
    await req("PATCH", `/orders/${orderA.data.id}/status`, { token: ctx.saOwner.token, body: { status: "confirmed" } });
    await req("PATCH", `/orders/${orderA.data.id}/status`, { token: ctx.saOwner.token, body: { status: "preparing" } });
    await req("POST", "/courier/availability", { token: ctx.saCourier.token, body: { available: true } });
    await req("POST", "/courier/pulse", { token: ctx.saCourier.token, body: { lat: 24.715, lng: 46.677, accuracy_m: 15 } });
    const rc = await req<any>("POST", `/owner/orders/${orderA.data.id}/request-courier`, { token: ctx.saOwner.token });
    if (rc.ok) {
      let arrived = false;
      for (let i = 0; i < 6 && !arrived; i++) {
        await sleep(1200);
        await req("POST", "/courier/pulse", { token: ctx.saCourier.token, body: { lat: 24.715, lng: 46.677, accuracy_m: 15 } });
        const calls = await req<any[]>("GET", "/courier/calls", { token: ctx.saCourier.token });
        arrived = Array.isArray(calls.data) && calls.data.some((x: any) => x.task_id === rc.data.task_id || x.order_id === orderA.data.id);
      }
      record(P, "رادار: نداء سعودي ← مندوب سعودي (قبل إصلاح السوق)", arrived ? "ok" : "leak",
        arrived ? "النداء وصل (سوق المندوب سليم)" : "النداء لم يصل — المندوب خارج سوق المطعم رغم قربه الجغرافي (جذر انحشار «قيد الإسناد»)");
    } else record(P, "نداء المندوبين (قبل)", "fail", errMsg(rc.data));
  }

  // 3) إصلاح السوق من الواجهة (الترقيع المعروف) ثم إعادة الاختبار
  const fix = await req("PUT", "/locale/me", { token: ctx.saCourier.token, body: { country_code: "966" } });
  record(P, "ترقيع PUT /locale/me {966} للمندوب السعودي", fix.ok ? "ok" : "fail", fix.ok ? "السوق انقلب 966" : errMsg(fix.data));

  const orderB = await req<any>("POST", "/orders", {
    token: ctx.saCustomer.token, market: "966",
    body: {
      facility_id: ctx.saOwner.facilityId, items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 24.718, delivery_lng: 46.679, delivery_address: "الرياض — رادار بعد",
      payment_method: "cash", notes: "رادار بعد الإصلاح — بوصمة",
    },
  });
  if (orderB.status === 201) {
    await req("PATCH", `/orders/${orderB.data.id}/status`, { token: ctx.saOwner.token, body: { status: "confirmed" } });
    await req("PATCH", `/orders/${orderB.data.id}/status`, { token: ctx.saOwner.token, body: { status: "preparing" } });
    const rc = await req<any>("POST", `/owner/orders/${orderB.data.id}/request-courier`, { token: ctx.saOwner.token });
    if (rc.ok) {
      let arrived = false;
      for (let i = 0; i < 6 && !arrived; i++) {
        await sleep(1200);
        await req("POST", "/courier/pulse", { token: ctx.saCourier.token, body: { lat: 24.715, lng: 46.677, accuracy_m: 15 } });
        const calls = await req<any[]>("GET", "/courier/calls", { token: ctx.saCourier.token });
        arrived = Array.isArray(calls.data) && calls.data.some((x: any) => x.task_id === rc.data.task_id || x.order_id === orderB.data.id);
      }
      record(P, "رادار بعد الترقيع", arrived ? "ok" : "fail",
        arrived ? `النداء وصل بعد الترقيع (task=${rc.data.task_id} · fee=${rc.data.fee})` : "حتى بعد الترقيع لم يصل — عامل آخر");
    }
  }

  // 4) نداء عبر السوقين: مندوب يمني قرب مطعم سعودي — يجب ألا يصل
  await req("POST", "/courier/availability", { token: ctx.yeCourier.token, body: { available: true } });
  await req("POST", "/courier/pulse", { token: ctx.yeCourier.token, body: { lat: 24.715, lng: 46.677, accuracy_m: 15 } });
  const orderC = await req<any>("POST", "/orders", {
    token: ctx.saCustomer.token, market: "966",
    body: {
      facility_id: ctx.saOwner.facilityId, items: [{ product_id: ctx.saFacilityProduct ?? 1, quantity: 1 }],
      delivery_lat: 24.718, delivery_lng: 46.679, delivery_address: "الرياض — رادار عبور",
      payment_method: "cash", notes: "رادار عبور — بوصمة",
    },
  });
  if (orderC.status === 201) {
    await req("PATCH", `/orders/${orderC.data.id}/status`, { token: ctx.saOwner.token, body: { status: "confirmed" } });
    await req("PATCH", `/orders/${orderC.data.id}/status`, { token: ctx.saOwner.token, body: { status: "preparing" } });
    const rc = await req<any>("POST", `/owner/orders/${orderC.data.id}/request-courier`, { token: ctx.saOwner.token });
    if (rc.ok) {
      let arrived = false;
      for (let i = 0; i < 5 && !arrived; i++) {
        await sleep(1000);
        const calls = await req<any[]>("GET", "/courier/calls", { token: ctx.yeCourier.token });
        arrived = Array.isArray(calls.data) && calls.data.some((x: any) => x.task_id === rc.data.task_id || x.order_id === orderC.data.id);
      }
      record(P, "رادار: نداء سعودي ← مندوب يمني (موجود جغرافياً)", arrived ? "leak" : "ok",
        arrived ? "⚠️ نداء سعودي وصل لمندوب يمني — الرادار لا يفلتر بالسوق" : "لم يصل — الرادار يفلتر بالسوق ✓ (الفيلترة موجودة، المشكلة في تخزين السوق عند التسجيل فقط)");
      await req("POST", `/owner/orders/${orderC.data.id}/cancel`, { token: ctx.saOwner.token }).catch(() => {});
    }
  }
  await req("POST", "/courier/availability", { token: ctx.saCourier.token, body: { available: false } });
  await req("POST", "/courier/availability", { token: ctx.yeCourier.token, body: { available: false } });
}

/* ── ٩ الإعدادات والعضوية والإشعارات ── */
async function phase9_settings_membership() {
  const P = "٩ إعدادات وعضوية";
  console.log(`\n━━━ ${P} ━━━`);
  if (!ctx.adminToken) return;

  // المناطق: الفلتر والافتراضي
  const r966 = await req<any[]>("GET", "/admin/regions?country_code=966", { token: ctx.adminToken });
  const r967 = await req<any[]>("GET", "/admin/regions?country_code=967", { token: ctx.adminToken });
  const rNone = await req<any[]>("GET", "/admin/regions", { token: ctx.adminToken });
  record(P, "فصل المناطق (966/967)", r966.ok && r967.ok ? "ok" : "fail",
    `سعودية=${Array.isArray(r966.data) ? r966.data.length : "—"} · يمنية=${Array.isArray(r967.data) ? r967.data.length : "—"} · بلا فلتر=${Array.isArray(rNone.data) ? rNone.data.length : "—"}`);
  const newRegion = await req<any>("POST", "/admin/regions", { token: ctx.adminToken, body: { name: `بصمة-فحص-افتراضي-${TAG}`, slug: `basma-${TAG}` } });
  record(P, "POST /admin/regions بلا country_code", newRegion.ok || newRegion.status === 201 ? "gap" : "info",
    newRegion.ok || newRegion.status === 201
      ? `أُنشئت بـ country_code=${newRegion.data.country_code ?? "(غير معاد — العقد default 967)"} ← افتراضي يمني في العقد والواجهة (RegionForm default 967)`
      : errMsg(newRegion.data));

  // إشارة العضوية المجانية + محافظ الدفع
  const fm = await req<any>("GET", "/admin/settings/free-membership", { token: ctx.adminToken });
  record(P, "admin/settings/free-membership", fm.ok ? "info" : "fail",
    fm.ok ? `enabled=${fm.data.is_free_membership_enabled} — علم واحد عالمي بلا بُعد سوق` : errMsg(fm.data));
  const wp = await req<any>("GET", "/admin/settings/wallet-payments", { token: ctx.adminToken });
  record(P, "admin/settings/wallet-payments", wp.ok ? "info" : "fail",
    wp.ok ? JSON.stringify(wp.data).slice(0, 160) : errMsg(wp.data));

  // العضوية: عملة تدفق الاشتراك لكل سوق
  for (const c of [ctx.saCustomer, ctx.yeCustomer]) {
    const mi = await req<any>("GET", "/membership/info", { token: c.token });
    const cur = mi.ok ? mi.data.currency : undefined;
    const expected = c === ctx.saCustomer ? "SAR/ريال سعودي" : "YER/ريال يمني";
    const leaked = mi.ok && !String(cur ?? "").includes(c === ctx.saCustomer ? "سعودي" : "يمني");
    record(P, `membership/info لـ${c.label}`, leaked ? "leak" : mi.ok ? "ok" : "fail",
      mi.ok ? `amount=${mi.data.amount} · currency=${cur} · محفظة=${mi.data.wallet_name} · حساب=${mi.data.transfer_account_number}${leaked ? " ← تدفق يمني كامل لعميل سعودي!" : ""}` : errMsg(mi.data),
      mi.ok ? JSON.stringify(mi.data).slice(0, 220) : undefined);
  }

  // الإشعارات: هل تحمل بعداً سوقياً؟
  for (const c of [ctx.saCustomer, ctx.yeCustomer]) {
    const n = await req<any[]>("GET", "/notifications", { token: c.token });
    const sample = Array.isArray(n.data) ? n.data[0] : null;
    record(P, `إشعارات ${c.label}`, n.ok ? "info" : "fail",
      n.ok ? `${Array.isArray(n.data) ? n.data.length : 0} إشعاراً · حقول سوق=${sample ? Object.keys(sample).filter((k) => /market|country|currency/i.test(k)).join("،") || "لا يوجد" : "—"}` : errMsg(n.data));
  }
}

/* ═══════════════ التشغيل ═══════════════ */

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  تدقيق فصل الأسواق الشامل — توفير · بوصمة · ${TAG}  ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  await phase0_environment();
  await registerAll();
  await phase2_approvals();

  // منتجات الفحوص (بعد الاعتماد) — يمني واحد + سعودية ثلاثة
  const lp = await req("POST", "/owner/login", { body: { identifier: EMAIL(ctx.yeOwner.key), password: PASSWORD } });
  if (lp.ok) {
    ctx.yeOwner.token = lp.data.access_token;
    const p = await req<any>("POST", `/owner/${ctx.yeOwner.facilityId}/products`, {
      token: ctx.yeOwner.token,
      body: { name: "فحسة لحم يمنية", description: "طبق فحص", price: 3500, category: "أطباق رئيسية", is_available: true, available_quantity: 20, display_order: 1 },
    });
    if (p.ok || p.status === 201) ctx.yeFacilityProduct = p.data.id;
  }
  const lps = await req("POST", "/owner/login", { body: { identifier: EMAIL(ctx.saOwner.key), password: PASSWORD } });
  if (lps.ok) {
    ctx.saOwner.token = lps.data.access_token;
    for (const [i, pr] of [
      { name: "كبسة دجاج فحص", desc: "طبق فحص", price: 28 },
      { name: "شاورما فحص", desc: "طبق فحص", price: 18 },
      { name: "كنافة فحص", desc: "طبق فحص", price: 16 },
    ].entries()) {
      const p = await req<any>("POST", `/owner/${ctx.saOwner.facilityId}/products`, {
        token: ctx.saOwner.token,
        body: { ...pr, category: "أطباق رئيسية", is_available: true, available_quantity: 50, display_order: i + 1 },
      });
      if ((p.ok || p.status === 201) && i === 0) ctx.saFacilityProduct = p.data.id;
    }
  }

  // محافظ المنشأتين (قبل فحوص الدفع)
  const provs = await req<any[]>("GET", "/wallets/providers", { token: ctx.yeOwner.token });
  const jw = Array.isArray(provs.data) ? provs.data.find((x: any) => x.code === "jawali") : null;
  for (const [o, wref] of [[ctx.saOwner, "saFacilityWallet"], [ctx.yeOwner, "yeFacilityWallet"]] as [Account, "saFacilityWallet" | "yeFacilityWallet"][]) {
    const w = await req<any>("POST", `/owner/facilities/${o.facilityId}/wallets`, {
      token: o.token,
      body: { provider_id: jw?.id ?? 1, account_type: "phone", phone_number: o.phone, account_name: `بصمة ${o.label}`, display_order: 1 },
    });
    if (w.ok || w.status === 201) ctx[wref] = w.data.id;
  }

  await phase3_facilities_products();
  await phase4_pricing();
  await phase5_payments();
  await phase6_wallets();
  await phase7_finance();
  await phase8_couriers();
  await phase9_settings_membership();

  /* ── الخلاصة ── */
  const total = results.length;
  console.log(`\n━━━━━━━━━━━ الخلاصة النهائية ━━━━━━━━━━━`);
  console.log(`إجمالي الفحوص: ${total}`);
  console.log(`${ICON.ok} فصل سليم خادمياً:      ${counts.ok}`);
  console.log(`${ICON.leak} تسرب سوق خادمي:      ${counts.leak}  ← باك اند (bug)`);
  console.log(`${ICON.gap} فجوة عقد/تصميم:      ${counts.gap}  ← باك اند (design)`);
  console.log(`${ICON.fe} فجوة واجهة:          ${counts.fe}  ← فرونت (بصمة)`);
  console.log(`${ICON.info} ملاحظات معلوماتية:    ${counts.info}`);
  console.log(`${ICON.fail} فشل فحص تقني:        ${counts.fail}`);

  const report = {
    meta: { tag: TAG, ran_at: new Date().toISOString(), api: API, tool: "market-separation-audit — بوصمة" },
    counts,
    results,
  };
  const path = `/home/z/my-project/تقرير-فصل-الأسواق-${TAG}.json`;
  await Bun.write(path, JSON.stringify(report, null, 2));
  console.log(`\n📄 التقرير: تقرير-فصل-الأسواق-${TAG}.json`);

  // قائمة الإصلاحات المستخرجة مباشرة
  const leaks = results.filter((r) => r.status === "leak");
  const gaps = results.filter((r) => r.status === "gap");
  const fes = results.filter((r) => r.status === "fe");
  if (leaks.length) {
    console.log(`\n🔴 تسربات خادمية (${leaks.length}):`);
    leaks.forEach((r, i) => console.log(`  ${i + 1}. [${r.phase}] ${r.step} — ${r.detail}`));
  }
  if (gaps.length) {
    console.log(`\n🟠 فجوات خادمية (${gaps.length}):`);
    gaps.forEach((r, i) => console.log(`  ${i + 1}. [${r.phase}] ${r.step} — ${r.detail}`));
  }
  if (fes.length) {
    console.log(`\n🟣 فجوات واجهة (${fes.length}):`);
    fes.forEach((r, i) => console.log(`  ${i + 1}. [${r.phase}] ${r.step} — ${r.detail}`));
  }
}

main().catch((e) => {
  console.error("فشل التشغيل:", e);
  process.exit(1);
});

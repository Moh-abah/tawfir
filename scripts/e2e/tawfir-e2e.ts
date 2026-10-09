/**
 * tawfir-e2e.ts — سكربت الاختبار الشبه-الحقيقي الشامل لمنصة توفير
 * ═══════════════════════════════════════════════════════════════
 * بوصمة — وكيل الفرونت. يُشغَّل: bun scripts/e2e/tawfir-e2e.ts
 *
 * ماذا يفعل (دورة حياة كاملة على api.tawfir.giize.com الحي):
 *  1) تسجيل 3 تجار سعوديين (مطاعم بقوائم واقعية) + 6 مناديب + 2 عملاء
 *  2) موافقات الإدارة (اعتماد المطاعم + توثيق المناديب) بحساب الأدمن الكلي
 *  3) بناء كتالوج كل مطعم (منتجات بأسعار وتصنيفات واقعية)
 *  4) مصفوفة دفع مويسر كاملة: مدى/فيزا/ماستركارد/أمكس/3DS/فشل/STC Pay
 *  5) دورات حياة طلبات كاملة (دفع إلكتروني + كاش + STC) مع مناديب حقيقيين
 *  6) التحقق المالي: عمولات المنصة، ذمة التاجر، رصيد المندوب، دفتر القيود
 *  7) تقرير JSON عربي + ملخص كونسول
 *
 * كل البيانات تتولد بلاحقة عشوائية لكل تشغيل — إعادة التشغيل آمنة دائماً.
 */

/* ═══════════════ الإعدادات ═══════════════ */

const API = "https://api.tawfir.giize.com/api/v1";
const MOYASAR = "https://api.moyasar.com/v1";

const SUPER_ADMIN = { identifier: "admin@tawfir.giize.com", password: "mohabhb68myaa" };
const PASSWORD = "Test@12345";
const OTP_CODE = "123456";

/** لاحقة التشغيل — تمنع أي تعارض عند الإعادة */
const TAG = Math.random().toString(36).slice(2, 6);
/** نطاق بريد صالح — الخادم يرفض النطاقات المحجوزة مثل .test */
const EMAIL = (n: string) => `basma.${n}.${TAG}@tawfir-sa.com`;

/* ═══════════════ أدوات مساعدة ═══════════════ */

interface StepResult {
  phase: string;
  step: string;
  status: "ok" | "fail" | "warn" | "info";
  detail: string;
}

const results: StepResult[] = [];
let failures = 0;
let warnings = 0;

function record(phase: string, step: string, status: StepResult["status"], detail: string) {
  results.push({ phase, step, status, detail });
  if (status === "fail") failures++;
  if (status === "warn") warnings++;
  const icon = status === "ok" ? "✅" : status === "fail" ? "❌" : status === "warn" ? "⚠️ " : "ℹ️ ";
  console.log(`${icon} [${phase}] ${step} — ${detail}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function rand4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
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

/** رسالة خطأ عربية من أي استجابة */
function errMsg(d: any): string {
  if (d == null) return "بلا جسم";
  if (typeof d === "string") return d.slice(0, 200);
  if (d.detail?.message) {
    const errs = d.detail.errors ? JSON.stringify(d.detail.errors).slice(0, 200) : "";
    return `${d.detail.message} ${errs}`;
  }
  if (typeof d.detail === "string") return d.detail;
  if (d.message) return d.message;
  return JSON.stringify(d).slice(0, 200);
}

/* ─── مويسر: إنشاء دفعة وإكمالها حتى status=paid/failed ─── */

let MOYASAR_PK_KEY = ""; // يُملأ حياً من /finance/payments/config

async function moyasarCreate(source: Record<string, unknown>, amountHalalas: number, desc: string) {
  const res = await fetch(`${MOYASAR}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(MOYASAR_PK_KEY + ":")}`,
    },
    body: JSON.stringify({
      amount: amountHalalas,
      currency: "SAR",
      description: desc,
      callback_url: "https://tawfir.giize.com/payment/return?order=0",
      source,
    }),
  });
  return res.json();
}

/** قراءة أول form action من صفحة HTML مويسر + الحقول المخفية */
function parseForm(html: string): { action: string; fields: Record<string, string> } {
  const action = /action="([^"]+)"/.exec(html)?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) {
    fields[m[1]] = m[2];
  }
  return { action, fields };
}

/** إكمال دفعة بطاقة حتى الحسم — آلة حالات لسلسلة 3DS: كل صفحة يُستخرج
 * نموذجها ويُرسل POST بحقولها حتى الوصول لصفحة بلا نموذج.
 * (prepare → authenticate → acs_emulator → set_auth_result → acs_return)
 * authResult: AUTHENTICATED (نجاح) أو UNAUTHENTICATED (فشل 3DS عمداً)
 */
async function moyasarCompleteCard(pay: any, authResult = "AUTHENTICATED") {
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
    if (action.includes("set_auth_result")) {
      body.set("auth_result", authResult);
    }
    const target = action.startsWith("http") ? action : `https://api.moyasar.com${action}`;
    const res = await fetch(target, { method: "POST", body, redirect: "follow" });
    html = await res.text();
  }
  // جلب الحالة النهائية
  const status = await fetch(`${MOYASAR}/payments/${pay.id}`, {
    headers: { Authorization: `Basic ${btoa(MOYASAR_PK_KEY + ":")}` },
  });
  return status.json().catch(() => null);
}

/** إكمال دفعة STC Pay برمز التحقق 123456 */
async function moyasarCompleteStc(pay: any, otp = OTP_CODE) {
  const url = pay?.source?.transaction_url;
  if (!url) return pay;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp_value: otp }),
  });
  return res.json();
}

/* ═══════════════ البيانات الواقعية ═══════════════ */

interface OwnerSpec {
  key: string;
  name: string;
  phone: string;
  facility: string;
  type: "restaurant" | "cafe" | "cafeteria";
  regionName: string;
  address: string;
  lat: number;
  lng: number;
  discount: number;
  hint: string;
  desc: string;
  products: { name: string; desc: string; price: number; cat: string }[];
}

const SA_OWNERS: OwnerSpec[] = [
  {
    key: "m1",
    name: "سعيد بن عمر الحربي",
    phone: "966551" + rand4() + "01",
    facility: "مطعم البيك الشامي للمشاوي",
    type: "restaurant",
    regionName: "الرياض",
    address: "الرياض، حي الملقا، طريق الأمير محمد بن سلمان",
    lat: 24.8139, lng: 46.6192,
    discount: 10,
    hint: "خصم 10% لأعضاء توفير على كل الأطباق الرئيسية",
    desc: "مشاوي شامية أصيلة — فحم طبيعي ولحوم طازجة يومياً. تخصصنا: كبسة مندي، مشاوي مشكلة، وشاورما على الفحم.",
    products: [
      { name: "كبسة دجاج على الفحم", desc: "نصف دجاجة مشوية على الفحم مع أرز الكبسة البسمتي والصلصة الحمراء", price: 28, cat: "أطباق رئيسية" },
      { name: "مندي لحم غنم", desc: "ربع خروف مندي بالتنور التقليدي مع الأرز والمزاحم", price: 45, cat: "أطباق رئيسية" },
      { name: "مشاوي مشكلة عائلية", desc: "كباب، شيش طاووق، ريش لحم، كفتة — تكفي 4 أشخاص", price: 95, cat: "أطباق رئيسية" },
      { name: "شاورما دجاج عربي", desc: "شاورما على الفحم بخبز الصاج مع البطاطا والمخللات", price: 18, cat: "أطباق رئيسية" },
      { name: "حمص باللحمة", desc: "حمص كريمي مع لحمة مفرومة وصنوبر محمص وزيت زيتون بكر", price: 15, cat: "مقبلات" },
      { name: "متبل باذنجان", desc: "باذنجان مشوي على الفحم مع الطحينة والليمون", price: 12, cat: "مقبلات" },
      { name: "فتوش الشامي", desc: "خضار موسمية مع خبز محمص ودبس رمان", price: 14, cat: "مقبلات" },
      { name: "كنافة بالقشطة", desc: "كنافة نابلسية بالقشطة البلدية والقطر", price: 16, cat: "حلويات" },
      { name: "عراييس لحم", desc: "خبز محشو باللحمة المفرومة والبقدونس مع اللبن", price: 20, cat: "أطباق رئيسية" },
      { name: "عصير مانجو طازج", desc: "مانجو طازج بلا سكر مضاف", price: 9, cat: "مشروبات" },
    ],
  },
  {
    key: "m2",
    name: "نورة عبدالله القحطاني",
    phone: "966552" + rand4() + "02",
    facility: "بيت تحلية للمأكولات البحرية",
    type: "restaurant",
    regionName: "جدة",
    address: "جدة، حي الشاطئ، كورنيش جدة الشمالي",
    lat: 21.6091, lng: 39.1173,
    discount: 15,
    hint: "خصم 15% للعضوية على المأكولات البحرية",
    desc: "مأكولات بحرية من صيد اليوم — سمك مشوي، جريش بحري، وروبيان بمختلف الطرق. طازج من سوق السمك كل صباح.",
    products: [
      { name: "روبيان مشوي بالزعفران", desc: "روبيان جامبو مشوي مع صلصة الزعفران والأرز الأصفر", price: 65, cat: "أطباق رئيسية" },
      { name: "سمك هامور مشوي", desc: "هامور طازج مشوي بالفحم مع الأرز والسلطة", price: 78, cat: "أطباق رئيسية" },
      { name: "جريش بحري", desc: "جريش سمك مع الأرز والبهارات الحجازية", price: 42, cat: "أطباق رئيسية" },
      { name: "سيابي بالفرن", desc: "سمك سيابي مخبوز مع البطاطا والطماطم", price: 55, cat: "أطباق رئيسية" },
      { name: "سلطة سبانخ بالجمبري", desc: "سبانخ طازجة مع جمبري مشوي وصوص الليمون", price: 24, cat: "مقبلات" },
      { name: "كبسة ربيان", desc: "أرز كبسة مع ربيان أحمر طازج وبهارات خاصة", price: 58, cat: "أطباق رئيسية" },
      { name: "أصابع موزاريلا", desc: "8 أصابع جبن موزاريلا مقرمشة مع صوص المارينارا", price: 18, cat: "مقبلات" },
      { name: "تشيز كيك ليمون", desc: "قطعة تشيز كيك بالليمون الطازج", price: 19, cat: "حلويات" },
      { name: "ليمون بالنعناع", desc: "عصير ليمون طازج بالنعناع", price: 10, cat: "مشروبات" },
    ],
  },
  {
    key: "m3",
    name: "فهد سعد العنزي",
    phone: "966553" + rand4() + "03",
    facility: "كافتيريا التراث اليمني",
    type: "cafeteria",
    regionName: "الرياض",
    address: "الرياض، حي السويدي الغربي، شارع المدينة المنورة",
    lat: 24.6282, lng: 46.7140,
    discount: 20,
    hint: "خصم 20% للعضوية — أطباق يمنية تراثية",
    desc: "أطباق يمنية تراثية أصيلة: فتة، زربيان، معصوب، وشوربة يمنية. مطبخ على أصوله.",
    products: [
      { name: "فتة لحم بالمرق", desc: "خبز تنور مع مرق اللحم والأرز والطحينة", price: 32, cat: "أطباق رئيسية" },
      { name: "زربيان دجاج يمني", desc: "أرز زربيان بالدجاج والبطاطا والتوابل اليمنية", price: 36, cat: "أطباق رئيسية" },
      { name: "معصوب موز بالقشدة", desc: "معصوب يمني بالموز والعسل والقشطة", price: 22, cat: "أطباق رئيسية" },
      { name: "شوربة يمنية", desc: "شوربة عدس بالكمون والليمون والخبز", price: 10, cat: "مقبلات" },
      { name: "سلتة بطاطس", desc: "سلتة يمنية بالبطاطا والبيض والمرق", price: 24, cat: "أطباق رئيسية" },
      { name: "ملوخية بالدجاج", desc: "ملوخية يمنية مع قطع الدجاج والخلط", price: 30, cat: "أطباق رئيسية" },
      { name: "بنت الصحن", desc: "حلوى يمنية تراثية بالعسل والسمن", price: 15, cat: "حلويات" },
      { name: "شاي أحمر يمني", desc: "شاي أحمر بالنعناع مع الحبة السوداء", price: 6, cat: "مشروبات" },
    ],
  },
];

const COURIERS = [
  { name: "عبدالرحمن بن ناصر الشمري", pub: "عبدالرحمن الشمري", vehicle: "motorcycle", plate: "1-4821-ح", license: "1098234712" },
  { name: "محمد صالح الغامدي", pub: "محمد الغامدي", vehicle: "electric_bike", plate: "2-7734-أ", license: "2087319456" },
  { name: "سلطان محمد العتيبي", pub: "سلطان العتيبي", vehicle: "motorcycle", plate: "3-1290-س", license: "3019284756" },
  { name: "خالد علي الدوسري", pub: "خالد الدوسري", vehicle: "motorcycle", plate: "4-6612-م", license: "4567123890" },
  { name: "راكان فهد السبيعي", pub: "راكان السبيعي", vehicle: "electric_bike", plate: "5-3358-ط", license: "5678341290" },
  { name: "فارس تركي المطيري", pub: "فارس المطيري", vehicle: "motorcycle", plate: "6-9903-ب", license: "6789451230" },
];

const CUSTOMERS = [
  { name: "أحمد محمد الزهراني", phone: "966544" + rand4() + "11", lat: 24.8206, lng: 46.6395, addr: "الرياض، حي النرجس، شارع أنس بن مالك، مبنى 12" },
  { name: "سارة فهد العمري", phone: "966545" + rand4() + "22", lat: 21.5812, lng: 39.1510, addr: "جدة، حي الروضة، شارع الأمير سلطان، مبنى 8" },
];

/** بطاقات الاختبار المويسر */
const CARDS: Record<string, { label: string; number: string; expect: string; cvc: string }> = {
  madaOK: { label: "مدى — نجاح", number: "4201320111111010", expect: "paid", cvc: "123" },
  visa: { label: "فيزا — نجاح", number: "4111111111111111", expect: "paid", cvc: "123" },
  visa3ds: { label: "فيزا 3DS — تحدي ثم نجاح", number: "4111114005765430", expect: "paid", cvc: "123" },
  master: { label: "ماستركارد — نجاح", number: "5421080101000000", expect: "paid", cvc: "123" },
  amex: { label: "أمريكان إكسبرس — نجاح", number: "340000000900000", expect: "paid", cvc: "123" },
  madaNoFunds: { label: "مدى — رصيد غير كافٍ", number: "4201320000311101", expect: "failed", cvc: "123" },
  madaLost: { label: "مدى — بطاقة مفقودة", number: "4201320131000508", expect: "failed", cvc: "123" },
  madaExpired: { label: "مدى — منتهية", number: "4201322267774310", expect: "failed", cvc: "123" },
  visa3dsFail: { label: "فيزا — 3DS فاشل", number: "4111118250252531", expect: "failed", cvc: "123" },
};

/* ═══════════════ حالة التشغيل ═══════════════ */

interface Ctx {
  adminToken?: string;
  owners: { spec: OwnerSpec; token: string; userId: number; facilityId: number }[];
  couriers: { spec: (typeof COURIERS)[number]; token: string; userId: number; courierId: number }[];
  customers: { spec: (typeof CUSTOMERS)[number]; token: string; userId: number }[];
  regions: Record<string, number>;
}

const ctx: Ctx & { moyasarPK: string } = { owners: [], couriers: [], customers: [], regions: {}, moyasarPK: "" };

/* ═══════════════ المراحل ═══════════════ */

async function phase0_environment() {
  const P = "٠ بيئة";
  console.log(`\n━━━ ${P}: فحص البيئة الحية ━━━`);
  const t0 = Date.now();
  const ping = await req("GET", "/locale/countries");
  record(P, "الوصول إلى api.tawfir.giize.com", ping.ok ? "ok" : "fail",
    `${ping.status} (${Date.now() - t0}ms)`);

  const adm = await req("POST", "/admin/login", { body: SUPER_ADMIN });
  if (adm.ok) {
    ctx.adminToken = adm.data.access_token;
    record(P, "دخول الأدمن الكلي (admin@tawfir.giize.com)", "ok", "توكن حي");
  } else record(P, "دخول الأدمن الكلي", "fail", errMsg(adm.data));

  const regs = await req<any[]>("GET", "/regions?country_code=966", { market: "966" });
  if (regs.ok && Array.isArray(regs.data)) {
    ctx.regions = Object.fromEntries(regs.data.map((r: any) => [r.name, r.id]));
    record(P, "مناطق السعودية", "ok", `${regs.data.length} منطقة — الرياض=${ctx.regions["الرياض"]} جدة=${ctx.regions["جدة"]}`);
  } else record(P, "مناطق السعودية", "fail", errMsg(regs.data));

  const login = await req("POST", "/auth/login", { body: { identifier: "customer.sa@tawfir.test", password: PASSWORD } });
  if (login.ok) {
    const cfg = await req<any>("GET", "/finance/payments/config", { token: login.data.access_token });
    if (cfg.ok) {
      ctx.moyasarPK = cfg.data.publishable_key;
      MOYASAR_PK_KEY = ctx.moyasarPK;
      record(P, "بوابة مويسر", "ok", `mode=${cfg.data.mode} · methods=${(cfg.data.methods ?? []).join(",")} · key=${ctx.moyasarPK.slice(0, 12)}…`);
    } else record(P, "بوابة مويسر", "fail", errMsg(cfg.data));
  } else record(P, "دخول العميل المرجعي customer.sa", "fail", errMsg(login.data));
}

async function requestVerifiedToken(phone: string, name: string): Promise<string | null> {
  const rq = await req("POST", "/otp/request", { body: { target: phone, name } });
  if (!rq.ok) {
    record("١ تسجيل", `OTP طلب للرقم ${phone}`, "fail", errMsg(rq.data));
    return null;
  }
  const dev = rq.data.dev_code ?? OTP_CODE;
  const vf = await req("POST", "/otp/verify", { body: { target: phone, code: dev } });
  if (!vf.ok || !vf.data.verified_token) {
    record("١ تسجيل", `OTP تحقق للرقم ${phone}`, "fail", errMsg(vf.data));
    return null;
  }
  return vf.data.verified_token;
}

async function phase1_registration() {
  const P = "١ تسجيل";
  console.log(`\n━━━ ${P}: 3 تجار + 6 مناديب + 2 عملاء (بلاحقة ${TAG}) ━━━`);

  for (const spec of SA_OWNERS) {
    const tok = await requestVerifiedToken(spec.phone, spec.name);
    if (!tok) continue;
    const reg = await req("POST", "/owner/register", {
      body: {
        full_name: spec.name,
        email: EMAIL(spec.key),
        phone: spec.phone,
        password: PASSWORD,
        password_confirm: PASSWORD,
        otp_verified_token: tok,
        facility_name: spec.facility,
        facility_type: spec.type,
        region_id: ctx.regions[spec.regionName],
        description: spec.desc,
        address: spec.address,
        latitude: spec.lat,
        longitude: spec.lng,
        location_source: "map",
        discount_rate: spec.discount,
        discount_hint: spec.hint,
        country_code: "966",
      },
    });
    if (reg.ok || reg.status === 201) {
      ctx.owners.push({ spec, token: "", userId: reg.data.user_id, facilityId: reg.data.facility_id });
      record(P, `تاجر: ${spec.facility}`, "ok", `user=${reg.data.user_id} facility=${reg.data.facility_id} — ${reg.data.status}`);
    } else record(P, `تاجر: ${spec.facility}`, "fail", errMsg(reg.data));
  }

  for (let i = 0; i < COURIERS.length; i++) {
    const c = COURIERS[i];
    const phone = `9665${rand4()}${rand4()}`; // 966 + 9 خانات = 12 خانة (صيغة سعودية صحيحة)
    const tok = await requestVerifiedToken(phone, c.name);
    if (!tok) continue;
    const reg = await req("POST", "/courier/auth/register", {
      market: "966", // بوابة المناديب تتحقق من صيغة الهاتف حسب السوق المعلن
      body: {
        document_full_name: c.name,
        public_name: c.pub,
        birth_date: "1996-05-14",
        email: EMAIL(`c${i + 1}`),
        phone,
        password: PASSWORD,
        password_confirm: PASSWORD,
        vehicle_type: c.vehicle,
        vehicle_plate: c.plate,
        license_number: c.license,
        region_id: ctx.regions["الرياض"],
        preferred_shifts: "مسائي 4م-12م",
        id_document_type: "national_id",
        id_document_number: c.license,
      },
    });
    if (reg.ok || reg.status === 201) {
      ctx.couriers.push({ spec: c, token: "", userId: reg.data.user_id, courierId: reg.data.courier_id });
      record(P, `مندوب: ${c.pub}`, "ok", `user=${reg.data.user_id} courier=${reg.data.courier_id} — ${reg.data.verification_status_ar ?? ""}`);
    } else record(P, `مندوب: ${c.pub}`, "fail", errMsg(reg.data));
  }

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    const tok = await requestVerifiedToken(c.phone, c.name);
    if (!tok) continue;
    const reg = await req("POST", "/auth/register", {
      body: {
        full_name: c.name,
        email: EMAIL(`k${i + 1}`),
        phone: c.phone,
        password: PASSWORD,
        password_confirm: PASSWORD,
        region_id: ctx.regions["الرياض"],
        country_code: "966",
        otp_verified_token: tok,
      },
    });
    if (reg.ok || reg.status === 201) {
      ctx.customers.push({ spec: c, token: "", userId: reg.data.user_id });
      record(P, `عميل: ${c.name}`, "ok", `user=${reg.data.user_id} — ${(reg.data.detail ?? "").slice(0, 80)}`);
    } else record(P, `عميل: ${c.name}`, "fail", errMsg(reg.data));
  }
}

async function phase2_admin_approvals() {
  const P = "٢ اعتمادات";
  console.log(`\n━━━ ${P}: اعتماد المطاعم وتوثيق المناديب ━━━`);
  if (!ctx.adminToken) {
    record(P, "تخطي — لا توكن أدمن", "fail", "لم ينجح دخول الأدمن الكلي");
    return;
  }
  for (const o of ctx.owners) {
    const r = await req("PATCH", `/admin/facilities/${o.facilityId}/approve`, { token: ctx.adminToken });
    record(P, `اعتماد «${o.spec.facility}»`, r.ok ? "ok" : "fail",
      r.ok ? `is_visible=${r.data.is_visible}` : errMsg(r.data));
  }
  for (const c of ctx.couriers) {
    const r = await req("POST", `/admin/couriers/${c.courierId}/decision`, {
      token: ctx.adminToken,
      body: { action: "verify" },
    });
    record(P, `توثيق المندوب «${c.spec.pub}»`, r.ok ? "ok" : "fail",
      r.ok ? "عضوية مفعلة" : errMsg(r.data));
  }
}

async function phase3_catalog_and_wallets() {
  const P = "٣ كتالوج ومحافظ";
  console.log(`\n━━━ ${P}: قوائم المنتجات + محافظ الاستلام ━━━`);
  for (const o of ctx.owners) {
    const lg = await req("POST", "/owner/login", { body: { identifier: EMAIL(o.spec.key), password: PASSWORD } });
    if (!lg.ok) {
      record(P, `دخول ${o.spec.facility}`, "fail", errMsg(lg.data));
      continue;
    }
    o.token = lg.data.access_token;
    let added = 0;
    for (let i = 0; i < o.spec.products.length; i++) {
      const p = o.spec.products[i];
      const r = await req("POST", `/owner/${o.facilityId}/products`, {
        token: o.token,
        body: { name: p.name, description: p.desc, price: p.price, category: p.cat, is_available: true, available_quantity: 50, display_order: i + 1 },
      });
      if (r.ok || r.status === 201) added++;
      else record(P, `منتج «${p.name}»`, "fail", errMsg(r.data));
    }
    record(P, `منتجات «${o.spec.facility}»`, added === o.spec.products.length ? "ok" : "warn",
      `${added}/${o.spec.products.length} منتج أُضيف`);
  }

  const o1 = ctx.owners[0];
  let jawaliId = 1;
  if (o1?.token) {
    const provs = await req<any[]>("GET", "/wallets/providers", { token: o1.token });
    const jawali = Array.isArray(provs.data) ? provs.data.find((p: any) => p.code === "jawali") : null;
    if (jawali) jawaliId = jawali.id;
  }
  for (const o of ctx.owners) {
    if (!o.token) continue;
    const r = await req("POST", `/owner/facilities/${o.facilityId}/wallets`, {
      token: o.token,
      body: {
        provider_id: jawaliId,
        account_type: "phone",
        phone_number: o.spec.phone,
        account_name: o.spec.name,
        display_order: 1,
      },
    });
    record(P, `محفظة استلام لـ«${o.spec.facility}»`, r.ok ? "ok" : "warn",
      r.ok ? `#${r.data.id} ${r.data.account_label ?? ""}` : `سلوك السوق السعودي: ${errMsg(r.data)}`);
  }

  if (o1?.token) {
    const products = await req<any[]>("GET", `/facilities/${o1.facilityId}/products`, { token: o1.token, market: "966" });
    const pid = Array.isArray(products.data) ? products.data[0]?.id : null;
    const prev = await req("POST", `/owner/${o1.facilityId}/pricing-preview`, {
      token: o1.token,
      body: { product_id: pid, price: 28, quantity: 2 },
    });
    record(P, "معاينة تسعير حية", prev.ok ? "info" : "info",
      prev.ok ? JSON.stringify(prev.data).slice(0, 160) : `غير متاحة: ${errMsg(prev.data)}`);
  }
}

async function customerLoginAll() {
  for (let i = 0; i < ctx.customers.length; i++) {
    const lg = await req("POST", "/auth/login", { body: { identifier: EMAIL(`k${i + 1}`), password: PASSWORD } });
    if (lg.ok) ctx.customers[i].token = lg.data.access_token;
  }
}

async function courierLoginAll() {
  for (let i = 0; i < ctx.couriers.length; i++) {
    const lg = await req("POST", "/courier/auth/login", { body: { identifier: EMAIL(`c${i + 1}`), password: PASSWORD } });
    if (lg.ok) {
      ctx.couriers[i].token = lg.data.access_token;
      // بوابة المناديب تسجّل السوق 967 افتراضياً حتى مع رقم سعودي —
      // نداءات المطاعم السعودية لا تصل إلا لمناديب سوقهم — التبديل إلزامي:
      await req("PUT", "/locale/me", { token: ctx.couriers[i].token, body: { country_code: "966" } });
    }
  }
}

async function phase4_customers_browse() {
  const P = "٤ تصفح";
  console.log(`\n━━━ ${P}: العميل يتصفح ويقدّر التوصيل ━━━`);
  await customerLoginAll();
  await courierLoginAll();
  if (!ctx.owners.length || !ctx.customers[0]?.token) {
    record(P, "تخطي — لا تجار أو عملاء", "fail", "فشل التسجيل يمنع المتابعة");
    return;
  }
  const k = ctx.customers[0];
  const list = await req<any>("GET", `/facilities/${ctx.owners[0].facilityId}/products`, { token: k.token, market: "966" });
  record(P, "قائمة منتجات مطعم المشاوي", list.ok ? "ok" : "fail",
    list.ok ? `${Array.isArray(list.data) ? list.data.length : "?"} منتج ظاهر` : errMsg(list.data));

  const est = await req<any>("GET",
    `/orders/delivery-estimate?facility_id=${ctx.owners[0].facilityId}&lat=${k.spec.lat}&lng=${k.spec.lng}`,
    { token: k.token, market: "966" });
  record(P, "تقدير أجرة التوصيل الحي", est.ok ? "info" : "warn",
    est.ok ? `${est.data.distance_display} → ${est.data.fee} ريال` : errMsg(est.data));
}

interface OrderInfo {
  id: number;
  total: number;
  deliveryFee: number;
  facilityId: number;
  paymentMethod: string;
}

async function createOrder(kIdx: number, oIdx: number, paymentMethod: "cash" | "wallet", paymentWalletId?: number, coords?: { lat: number; lng: number; addr?: string }): Promise<OrderInfo | null> {
  const k = ctx.customers[kIdx];
  const o = ctx.owners[oIdx];
  if (!k?.token || !o) return null;
  const products = await req<any[]>("GET", `/facilities/${o.facilityId}/products`, { token: k.token, market: "966" });
  if (!products.ok || !Array.isArray(products.data) || !products.data.length) return null;
  const p1 = products.data[0];
  const p2 = products.data.find((p: any) => p.id !== p1.id) ?? p1;
  const r = await req<any>("POST", "/orders", {
    token: k.token,
    market: "966",
    body: {
      facility_id: o.facilityId,
      items: [{ product_id: p1.id, quantity: 2 }, { product_id: p2.id, quantity: 1 }],
      delivery_lat: coords?.lat ?? k.spec.lat,
      delivery_lng: coords?.lng ?? k.spec.lng,
      delivery_address: coords?.addr ?? k.spec.addr,
      payment_method: paymentMethod,
      payment_wallet_id: paymentWalletId ?? null,
      notes: "طلب اختبار من سكربت بوصمة — بدون صوص حار",
    },
  });
  if (!r.ok && r.status !== 201) return null;
  return {
    id: r.data.id,
    total: Number(r.data.total ?? 0),
    deliveryFee: Number(r.data.delivery_fee ?? 0),
    facilityId: o.facilityId,
    paymentMethod,
  };
}

async function payOrderWithCard(order: OrderInfo, card: { label: string; number: string; expect: string; cvc: string }) {
  const pay = await moyasarCreate(
    { type: "creditcard", name: "Ahmed Ali", number: card.number, cvc: card.cvc, month: "12", year: "30", manual: false },
    Math.round(order.total * 100),
    `توفير — طلب رقم ${order.id} (اختبار بوصمة)`
  );
  if (!pay?.id) return { pay: null, final: null };
  const final = await moyasarCompleteCard(pay, "AUTHENTICATED");
  return { pay, final };
}

async function verifyOrderPayment(order: OrderInfo, payId: string, kIdx = 0): Promise<{ ok: boolean; detail: string }> {
  const k = ctx.customers[kIdx];
  const r = await req<any>("POST", `/finance/orders/${order.id}/pay/verify`, {
    token: k.token, market: "966",
    body: { moyasar_payment_id: payId, idempotency_key: `basma-${order.id}-${payId.slice(0, 8)}` },
  });
  return { ok: r.ok, detail: r.ok ? `تم تسجيل دفعة #${r.data.id ?? "?"} على الطلب` : errMsg(r.data) };
}

async function phase5_payment_matrix() {
  const P = "٥ مدفوعات";
  console.log(`\n━━━ ${P}: مصفوفة بطاقات مويسر + STC Pay ━━━`);
  const k = ctx.customers[0];
  if (!k?.token) {
    record(P, "لا توكن عميل", "fail", "تخطي المصفوفة");
    return;
  }
  if (!ctx.owners.length) {
    record(P, "لا تجار", "fail", "تخطي المصفوفة — فشل تسجيل التجار");
    return;
  }

  for (const key of ["madaOK", "visa", "master", "amex", "visa3ds"] as const) {
    const card = CARDS[key];
    const order = await createOrder(0, 0, "cash");
    if (!order) {
      record(P, `طلب لبطاقة ${card.label}`, "fail", "تعذر إنشاء الطلب");
      continue;
    }
    const { pay, final } = await payOrderWithCard(order, card);
    const status = final?.status ?? pay?.status;
    const authCode = final?.source?.authorization_code ?? "—";
    if (pay?.id && status !== "failed") {
      // سلطة الحسم النهائية = التحقق الخادمي (GET بمفتاح النشر قد يُمنع لمدى)
      const v = await verifyOrderPayment(order, pay.id);
      record(P, `${card.label} (••••${card.number.slice(-4)}) — طلب #${order.id} بمبلغ ${order.total} ريال`,
        v.ok ? "ok" : "fail",
        v.ok ? `تحقق خادمي: ${v.detail} · auth=${authCode}` : `الحالة=${status ?? "؟"} · ${final?.source?.message ?? ""} · رفض الخادم: ${v.detail}`);
    } else {
      record(P, `${card.label} (••••${card.number.slice(-4)}) — طلب #${order.id}`, "fail",
        `الحالة=${status ?? "؟"} · ${final?.source?.message ?? pay?.source?.message ?? "لم تُنشأ دفعة"}`);
    }
    await sleep(400);
  }

  for (const key of ["madaNoFunds", "madaLost", "madaExpired", "visa3dsFail"] as const) {
    const card = CARDS[key];
    const order = await createOrder(0, 0, "cash");
    if (!order) {
      record(P, `طلب لبطاقة ${card.label}`, "fail", "تعذر إنشاء الطلب");
      continue;
    }
    let pay: any = null;
    let final: any = null;
    try {
      const res = await payOrderWithCard(order, card);
      pay = res.pay;
      final = res.final;
    } catch { /* الفشل متوقع */ }
    const status = final?.status ?? pay?.status ?? "منع الإنشاء";
    let verifyBlocked = false;
    let verifyMsg = "لم تُنشأ دفعة أصلاً";
    if (pay?.id) {
      const v = await verifyOrderPayment(order, pay.id);
      verifyBlocked = !v.ok;
      verifyMsg = v.ok ? "قبِل الخادم الدفعة (انتباه!)" : "الخادم رفض التحقق ✓";
    }
    const passed = status !== "paid" && (verifyBlocked || !pay?.id);
    record(P, `${card.label} (••••${card.number.slice(-4)}) — طلب #${order.id}`,
      passed ? "ok" : "warn",
      `الحالة=${status}${final?.source?.message ? ` · ${final.source.message}` : ""} · ${verifyMsg}`);
    await sleep(400);
  }

  const orderSTC = await createOrder(0, 0, "cash");
  if (orderSTC) {
    const pay = await moyasarCreate(
      { type: "stcpay", mobile: "966512345678" },
      Math.round(orderSTC.total * 100),
      `توفير — طلب رقم ${orderSTC.id} (اختبار بوصمة STC)`
    );
    if (pay?.id) {
      const fin = await moyasarCompleteStc(pay, "123456");
      const status = fin?.status ?? pay.status;
      if (status === "paid") {
        const v = await verifyOrderPayment(orderSTC, pay.id);
        record(P, `STC Pay 966512345678 — طلب #${orderSTC.id}`, v.ok ? "ok" : "warn",
          `paid · otp=123456 · تحقق خادمي: ${v.detail}`);
      } else record(P, "STC Pay", "fail", `الحالة=${status}`);
    } else record(P, "STC Pay", "fail", JSON.stringify(pay).slice(0, 160));
  }

  const badStc = await moyasarCreate({ type: "stcpay", mobile: "96651234567" }, 1000, "اختبار تنسيق خاطئ");
  record(P, "STC Pay برقم غير صحيح 96651234567", badStc?.id ? "warn" : "ok",
    badStc?.id ? "مويسر قبل الإنشاء لكن انتبه للتنسيق الصحيح 9665XXXXXXXX في التطبيق"
      : `رفض مويسر: ${errMsg(badStc)}`);
}

async function runFullLifecycle(
  kIdx: number, oIdx: number, cIdx: number,
  payment: { method: "cash" | "wallet"; walletId?: number; payWith?: (o: OrderInfo) => Promise<{ payId: string | null; ok: boolean; detail: string }> },
  label: string
): Promise<OrderInfo | null> {
  const P = "٦ دورة حياة";
  const k = ctx.customers[kIdx];
  const o = ctx.owners[oIdx];
  const c = ctx.couriers[cIdx];
  if (!k?.token || !o?.token || !c?.token) {
    record(P, `${label} — أطراف ناقصة`, "fail", "توكنات غير جاهزة");
    return null;
  }

  const order = await createOrder(kIdx, oIdx, payment.method, payment.walletId, {
    // نقطة توصيل على بعد ~1.3 كم من المطعم — داخل سقف التوصيل دائماً
    lat: o.spec.lat + 0.012,
    lng: o.spec.lng + 0.010,
    addr: `${o.spec.address.replace(/^([^،]+)،/, "$1، حي جديد،")} — نقطة اختبار بوصمة`,
  });
  if (!order) {
    record(P, `${label}: إنشاء الطلب`, "fail", "فشل إنشاء الطلب");
    return null;
  }
  record(P, `${label}: طلب #${order.id}`, "ok", `${payment.method} · إجمالي ${order.total} ريال · توصيل ${order.deliveryFee} ريال`);

  if (payment.payWith) {
    const paid = await payment.payWith(order);
    record(P, `${label}: الدفع الإلكتروني`, paid.ok ? "ok" : "fail", paid.detail);
  }

  let r = await req("PATCH", `/orders/${order.id}/status`, { token: o.token, body: { status: "confirmed" } });
  if (!r.ok) {
    record(P, `${label}: تأكيد التاجر`, "fail", errMsg(r.data));
    return order;
  }
  r = await req("PATCH", `/orders/${order.id}/status`, { token: o.token, body: { status: "preparing" } });
  record(P, `${label}: التاجر أكد وحضّر`, r.ok ? "ok" : "warn", r.ok ? "confirmed → preparing" : errMsg(r.data));

  // المندوب يفتح توفره ويرسل موقعه (نبضة) قرب المطعم — قبل النداء
  // (الرادار يجمع مناديب بمواقع حية ضمن call_radius_km لحظة إطلاق الموجة حصراً)
  await req("POST", "/courier/availability", { token: c.token, body: { available: true } });
  await req("POST", "/courier/pulse", {
    token: c.token,
    body: { lat: o.spec.lat + 0.004, lng: o.spec.lng - 0.003, accuracy_m: 15 },
  });

  const rc = await req<any>("POST", `/owner/orders/${order.id}/request-courier`, { token: o.token });
  const taskId = rc.ok ? rc.data.task_id : null;
  record(P, `${label}: نداء المندوبين`, rc.ok ? "ok" : "fail",
    rc.ok ? `task=${taskId} · أجرة ${rc.data.fee} ريال${rc.data.fee !== order.deliveryFee ? ` ⚠️ (تقدير الطلب كان ${order.deliveryFee} ريال)` : ""}` : errMsg(rc.data));
  if (!taskId) return order;
  let accepted = false;
  for (let i = 0; i < 8 && !accepted; i++) {
    await sleep(1500);
    // نبضة موقع بين المحاولات — الرادار يبحث عن مناديب بمواقع حية
    await req("POST", "/courier/pulse", {
      token: c.token,
      body: { lat: o.spec.lat + 0.004, lng: o.spec.lng - 0.003, accuracy_m: 15 },
    });
    const calls = await req<any[]>("GET", "/courier/calls", { token: c.token });
    if (Array.isArray(calls.data)) {
      const call = calls.data.find((x: any) => x.task_id === taskId || x.order_id === order.id);
      if (call) {
        const acc = await req("POST", "/courier/tasks/accept", { token: c.token, body: { call_id: call.call_id } });
        if (acc.ok) { accepted = true; break; }
      }
    }
    const tasks = await req<any[]>("GET", "/courier/tasks", { token: c.token });
    if (Array.isArray(tasks.data) && tasks.data.some((x: any) => x.task_id === taskId)) {
      const acc = await req("POST", "/courier/tasks/accept", { token: c.token, body: { call_id: taskId } });
      if (acc.ok) { accepted = true; break; }
    }
  }
  record(P, `${label}: حجز «${c.spec.pub}» للمهمة`, accepted ? "ok" : "fail", accepted ? `task=${taskId}` : "لم يظهر النداء له");

  // التسلسل الدقيق: وصل المتجر → تأكيد المالك للتسليم (handover) → استلام المندوب → وصل العميل → تسليم بكود
  const pr1 = await req<any>("POST", `/courier/tasks/${taskId}/progress`, { token: c.token, body: { action: "arrived_store" } });
  record(P, `${label}: وصل المتجر`, pr1.ok ? "ok" : "fail", pr1.ok ? pr1.data.status_ar ?? "" : errMsg(pr1.data));

  await sleep(500);
  const hd = await req<any>("POST", `/owner/tasks/${taskId}/handover`, { token: o.token, body: { confirmed: true } });
  record(P, `${label}: تأكيد التاجر للتسليم`, hd.ok ? "ok" : "fail", hd.ok ? "handover ✓" : errMsg(hd.data));

  await sleep(500);
  const pr2 = await req<any>("POST", `/courier/tasks/${taskId}/progress`, { token: c.token, body: { action: "confirm_pickup" } });
  record(P, `${label}: استلم الطلب`, pr2.ok ? "ok" : "fail", pr2.ok ? pr2.data.status_ar ?? "" : errMsg(pr2.data));

  await sleep(500);
  const pr3 = await req<any>("POST", `/courier/tasks/${taskId}/progress`, { token: c.token, body: { action: "arrived_customer" } });
  record(P, `${label}: وصل العميل`, pr3.ok ? "ok" : "fail", pr3.ok ? pr3.data.status_ar ?? "" : errMsg(pr3.data));

  await sleep(500);
  const tr = await req<any>("GET", `/orders/${order.id}/tracking`, { token: k.token, market: "966" });
  const code = tr.ok ? tr.data.delivery_code : null;
  const pr4 = await req<any>("POST", `/courier/tasks/${taskId}/progress`, {
    token: c.token, body: { action: "complete_delivery", delivery_code: code },
  });
  record(P, `${label}: تسليم بكود العميل ${code ?? "—"}`, pr4.ok ? "ok" : "fail",
    pr4.ok ? pr4.data.status_ar ?? "تم التسليم" : errMsg(pr4.data));

  const fin = await req<any>("GET", `/orders/${order.id}`, { token: k.token, market: "966" });
  record(P, `${label}: الحالة النهائية`, fin.ok ? (fin.data.status === "delivered" ? "ok" : "warn") : "fail",
    fin.ok ? `الطلب #${order.id} = ${fin.data.status}` : errMsg(fin.data));

  const rat = await req("POST", "/ratings", {
    token: k.token, market: "966",
    body: { stars: 5, comment: "خدمة ممتازة ووصول سريع — اختبار بوصمة", facility_id: o.facilityId },
  });
  record(P, `${label}: تقييم العميل للمطعم`, rat.ok || rat.status === 201 ? "ok" : "warn",
    rat.ok || rat.status === 201 ? "5 نجوم" : errMsg(rat.data));
  const crate = await req("POST", "/owner/courier-ratings", {
    token: o.token,
    body: { task_id: taskId, stars: 5, timeliness: 5, care: 5, conduct: 5, comment: "متعاون وسريع" },
  });
  record(P, `${label}: تقييم التاجر للمندوب`, crate.ok || crate.status === 201 ? "ok" : "warn",
    crate.ok || crate.status === 201 ? "5 نجوم + التزام" : errMsg(crate.data));

  return order;
}

async function phase6_lifecycles() {
  console.log(`\n━━━ ٦ دورات حياة: 3 سيناريوهات كاملة ━━━`);
  if (!ctx.owners.length || !ctx.couriers.length || !ctx.customers.length) {
    record("٦ دورة حياة", "تخطي — أطراف ناقصة من مراحل سابقة", "fail", "فشل التسجيل/الاعتماد يمنع الدورات");
    return;
  }

  await runFullLifecycle(0, 0, 0, {
    method: "cash",
    payWith: async (o) => {
      const { pay, final } = await payOrderWithCard(o, CARDS.madaOK);
      if (final?.status === "paid" && pay?.id) {
        const v = await verifyOrderPayment(o, pay.id);
        return { payId: pay.id, ok: v.ok, detail: `مدى ${o.total} ريال · ${v.detail}` };
      }
      return { payId: null, ok: false, detail: `حالة الدفع=${final?.status ?? "؟"}` };
    },
  }, "أ. دفع إلكتروني");

  await runFullLifecycle(1, 1, 1, { method: "cash" }, "ب. كاش عند الاستلام");

  await runFullLifecycle(0, 2, 2, {
    method: "cash",
    payWith: async (o) => {
      const pay = await moyasarCreate(
        { type: "stcpay", mobile: "966512345678" },
        Math.round(o.total * 100),
        `توفير — طلب رقم ${o.id} STC`
      );
      if (!pay?.id) return { payId: null, ok: false, detail: "تعذر إنشاء دفعة STC" };
      const fin = await moyasarCompleteStc(pay, "123456");
      if (fin?.status === "paid") {
        const v = await verifyOrderPayment(o, pay.id);
        return { payId: pay.id, ok: v.ok, detail: `STC Pay ${o.total} ريال · ${v.detail}` };
      }
      return { payId: null, ok: false, detail: `حالة STC=${fin?.status ?? "؟"}` };
    },
  }, "ج. STC Pay");

  const k = ctx.customers[0];
  const pend = await createOrder(0, 0, "cash");
  if (pend) {
    const cx = await req("POST", `/orders/${pend.id}/cancel`, { token: k.token, market: "966" });
    record("٦ دورة حياة", `د. إلغاء طلب معلق #${pend.id}`, cx.ok ? "ok" : "warn",
      cx.ok ? `status=${cx.data.status}` : errMsg(cx.data));
  }
  const walletOrder = await createOrder(0, 0, "wallet");
  record("٦ دورة حياة", "د. طلب بمحفظة تاجر (سلوك السوق السعودي)", walletOrder ? "info" : "info",
    walletOrder
      ? `طلب #${walletOrder.id} أُنشئ بطريقة wallet — الدفع سيكون رفع إشعار تحويل لمحفظة التاجر`
      : "السوق السعودي يقيّد الدفع بالمحفظة (كاش/إلكتروني فقط) — المتاح للتاجر السعودي");
}

async function phase7_money() {
  const P = "٧ مالية";
  console.log(`\n━━━ ${P}: العمولات والذمم والأرصدة ━━━`);

  for (const o of ctx.owners) {
    if (!o.token) continue;
    const card = await req<any>("GET", "/finance/owner/card", { token: o.token });
    record(P, `بطاقة «${o.spec.facility}» المالية`, card.ok ? "info" : "warn",
      card.ok
        ? `عمولات=${card.data.accumulated_commissions} · ذمة=${card.data.outstanding_debt} · مدفوع=${card.data.paid_total} · طلبات=${card.data.orders_count} ${card.data.currency ?? ""}`
        : errMsg(card.data));
  }

  for (let i = 0; i < 3; i++) {
    const c = ctx.couriers[i];
    if (!c?.token) continue;
    const bal = await req<any>("GET", "/finance/courier/my/balance", { token: c.token });
    record(P, `رصيد المندوب «${c.spec.pub}»`, bal.ok ? "info" : "warn",
      bal.ok ? `${bal.data.receivable} ${bal.data.currency} مستحقة له` : errMsg(bal.data));
  }

  if (ctx.adminToken) {
    const pricing = await req<any>("GET", "/admin/pricing", { token: ctx.adminToken });
    if (pricing.ok) {
      record(P, "إعدادات التسعير (الإدارة)", "info", JSON.stringify(pricing.data).slice(0, 300));
    } else record(P, "إعدادات التسعير (الإدارة)", "warn", errMsg(pricing.data));

    const ov = await req<any>("GET", "/finance/owner/overview", { token: ctx.adminToken });
    record(P, "نظرة الإدارة الشاملة", ov.ok ? "info" : "warn",
      ov.ok ? `${(ov.data.owners ?? []).length} تاجر · عمولات=${JSON.stringify(ov.data.commissions ?? {}).slice(0, 120)}` : errMsg(ov.data));

    const entries = await req<any>("GET", "/finance/entries?page=1&per_page=10", { token: ctx.adminToken });
    if (entries.ok && entries.data?.items) {
      const lines = (entries.data.items as any[]).slice(0, 5)
        .map((e) => `${e.entry_type}/${e.party_type}#${e.party_id} ${e.amount}${e.currency} ${e.status}`).join(" | ");
      record(P, `دفتر القيود (${entries.data.total} قيد)`, "info", lines);
    } else record(P, "دفتر القيود", "warn", errMsg(entries.data));

    const wallets = await req<any>("GET", "/admin/wallets/overview", { token: ctx.adminToken });
    record(P, "نظرة المحافظ (الإدارة)", wallets.ok ? "info" : "warn",
      wallets.ok ? JSON.stringify(wallets.data).slice(0, 180) : errMsg(wallets.data));
  }

  const c1 = ctx.couriers[0];
  if (c1?.token) {
    const dest = await req("POST", "/finance/courier/destination", {
      token: c1.token,
      body: { type: "wallet", holder_name: c1.spec.pub, mobile: "966512345678", country: "SA", city: "الرياض" },
    });
    record(P, `وجهة صرف STC Pay لـ«${c1.spec.pub}»`, dest.ok || dest.status === 201 ? "ok" : "warn",
      dest.ok || dest.status === 201 ? "أُضيفت" : errMsg(dest.data));
    const myPayouts = await req<any>("GET", "/finance/courier/my", { token: c1.token });
    record(P, "سجل صرف المناديب", myPayouts.ok ? "info" : "warn",
      myPayouts.ok ? `${Array.isArray(myPayouts.data) ? myPayouts.data.length : myPayouts.data?.items?.length ?? 0} عملية` : errMsg(myPayouts.data));
  }
}

async function phase8_wallet_question() {
  const P = "٨ سؤال المحفظة";
  console.log(`\n━━━ ${P}: هل يضيف العميل الجديد محفظة؟ ━━━`);
  const k = ctx.customers[0];
  if (!k?.token) return;
  const tryCreate = await req("POST", "/wallets/providers", { token: k.token, body: { name: "محفظة عميل", code: "cust" } });
  record(P, "POST /wallets/providers من بوابة العميل", !tryCreate.ok ? "info" : "warn",
    tryCreate.ok ? "مسموح (غير متوقع)" : `مرفوض كما هو مصمم (${tryCreate.status}) — المحافظ تُدار من الإدارة`);
  const fw = await req<any[]>("GET", `/facilities/${ctx.owners[0]?.facilityId}/wallets`, { token: k.token, market: "966" });
  record(P, "محافظ المطعم من عين العميل", fw.ok ? "info" : "warn",
    fw.ok ? `${Array.isArray(fw.data) ? fw.data.length : 0} محفظة استلام معروضة عند الدفع` : errMsg(fw.data));
}

/* ═══════════════ التقرير ═══════════════ */

function printSummary() {
  const ok = results.filter((r) => r.status === "ok").length;
  const info = results.filter((r) => r.status === "info").length;
  console.log(`\n══════════ ملخص التشغيل (بلاحقة ${TAG}) ══════════`);
  console.log(`✅ نجاح: ${ok}   ℹ️ معلومات: ${info}   ⚠️ تنبيهات: ${warnings}   ❌ إخفاقات: ${failures}`);
  const byPhase: Record<string, StepResult[]> = {};
  for (const r of results) (byPhase[r.phase] ??= []).push(r);
  for (const [phase, items] of Object.entries(byPhase)) {
    const bad = items.filter((i) => i.status === "fail" || i.status === "warn");
    if (!bad.length) continue;
    console.log(`\n— ${phase}`);
    for (const b of bad) console.log(`  ${b.status === "fail" ? "❌" : "⚠️ "} ${b.step}: ${b.detail}`);
  }
}

async function main() {
  console.log(`\n🔍 اختبار توفير الشامل — بلاحقة ${TAG} — ${new Date().toISOString()}\n`);
  await phase0_environment();
  await phase1_registration();
  await phase2_admin_approvals();
  await phase3_catalog_and_wallets();
  await phase4_customers_browse();
  await phase5_payment_matrix();
  await phase6_lifecycles();
  await phase7_money();
  await phase8_wallet_question();
  printSummary();

  const fs = await import("fs");
  const reportPath = `/home/z/my-project/تقرير-الاختبار-${TAG}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({ tag: TAG, started_at: new Date().toISOString(), results }, null, 2));
  console.log(`\n📄 التقرير الكامل: ${reportPath}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("💥 انهيار غير متوقع:", e);
  process.exit(2);
});

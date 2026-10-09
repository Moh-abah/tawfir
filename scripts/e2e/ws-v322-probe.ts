/**
 * ws-v322-probe.ts — إثبات حي لقناة WS من منظور الواجهة (v3.2.2)
 * يُشغَّل: bun scripts/e2e/ws-v322-probe.ts
 *
 * الخطوات: دخول مالك المصنع التجريبي → فتح WS بالتوكن عبر البوابة العامة
 * → انتظار hello → إرسال ping وانتظار pong → إغلاق نظيف.
 * هذا بالضبط ما يفعله src/lib/ws-client.ts في المتصفح.
 */

const API = "https://api.tawfir.giize.com/api/v1";
const WS_URL = "wss://api.tawfir.giize.com/api/v1/ws/notifications";

const ACCOUNTS = [
  { label: "owner.sa@tawfir.test", password: "Test@12345" },
  { label: "customer.sa@tawfir.test", password: "Test@12345" },
];

interface LoginResp { access_token?: string; token_type?: string }

async function login(identifier: string, password: string): Promise<string | null> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    console.log(`  ⚠️ دخول ${identifier} → HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as LoginResp;
  return data.access_token ?? null;
}

function probeWs(token: string): Promise<{ hello: unknown; pong: unknown }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* تجاهل */ }
      reject(new Error("انتهت المهلة (10 ثوانٍ) دون إكمال المصافحة"));
    }, 10_000);
    let hello: unknown = null;
    ws.onopen = () => console.log(`  ✓ المصافحة 101 — القناة مفتوحة عبر البوابة العامة`);
    ws.onmessage = (ev) => {
      let msg: Record<string, unknown> | null = null;
      try { msg = JSON.parse(String(ev.data)); } catch { msg = null; }
      console.log(`  ← رسالة: ${String(ev.data).slice(0, 160)}`);
      if (msg?.type === "hello" && hello === null) {
        hello = msg;
        ws.send(JSON.stringify({ type: "ping" }));
        console.log(`  → أرسلنا ping`);
        return;
      }
      if (msg?.type === "pong") {
        clearTimeout(timer);
        ws.close(1000);
        resolve({ hello, pong: msg });
      }
    };
    ws.onerror = () => { /* يتبعه onclose */ };
    ws.onclose = (ev) => {
      if (hello === null) {
        clearTimeout(timer);
        reject(new Error(`أغلقت القناة قبل hello — code=${ev.code} reason=${ev.reason || "—"}`));
      }
    };
  });
}

async function main() {
  console.log("═══ إثبات حي — قناة WS للإشعارات v3.2.2 (من منظور الواجهة) ═══");
  for (const acc of ACCOUNTS) {
    console.log(`\n── الحساب: ${acc.label}`);
    const token = await login(acc.label, acc.password);
    if (!token) continue;
    try {
      const { hello, pong } = await probeWs(token);
      console.log(`  ✅ hello=${JSON.stringify(hello)} · pong=${JSON.stringify(pong)} — القناة حية بالكامل`);
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("\n═══ انتهى الإثبات ═══");
}

void main();

#!/usr/bin/env node
/**
 * توليد أصوات الإشعارات الاختبارية — توفير (الجولة 8)
 * =====================================================
 * يولّد 18 ملف MP3: 15 صوت إشعارات في public/sounds/notifications/
 *                   + 3 أصوات نظام في public/sounds/system/
 *
 * ⚠️ هذه نغمات تركيبية مؤقتة للاختبار — النغمات النهائية مسؤولية المشرف:
 *    استبدل أي ملف بنفس الاسم (بلا أي كود) وسيُشغَّل الصوت الجديد فوراً.
 *    القيود: mp3 | أقل من 100KB | 0.5-1.5 ثانية.
 *
 * البنية: توليد PCM خام (جيبية + توافقية) → WAV مؤقت → ترميز MP3 عبر ffmpeg.
 *
 * التشغيل: node scripts/generate-sounds.mjs
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const SR = 44100; // معدل العينات

/* ═══════════════ محرّك التوليد ═══════════════ */

/** نغمة واحدة بمغلف هجوم/تلاشٍ لتفادي الطقطقة. */
function synthNote({ freq, dur, gain = 0.75, wave = "sine", attack = 0.012, release = 0.06 }) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v;
    if (wave === "square") {
      v = Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.6;
    } else if (wave === "triangle") {
      v = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
    } else {
      v = Math.sin(2 * Math.PI * freq * t);
    }
    // توافقية رابعة خفيفة تمنح «جرساً» بدل صافرة ميتة
    v = v * 0.82 + 0.18 * Math.sin(4 * Math.PI * freq * t);
    const env = Math.min(1, t / attack, Math.max(0, (dur - t) / release));
    out[i] = v * gain * env;
  }
  return out;
}

/** انزلاق ترددي (glide) من تردد إلى آخر. */
function synthGlide({ from, to, dur, gain = 0.7, wave = "sine", attack = 0.02, release = 0.08 }) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = from + ((to - from) * t) / dur;
    phase += (2 * Math.PI * f) / SR;
    let v = wave === "triangle" ? 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1 : Math.sin(phase);
    v = v * 0.82 + 0.18 * Math.sin(2 * phase);
    const env = Math.min(1, t / attack, Math.max(0, (dur - t) / release));
    out[i] = v * gain * env;
  }
  return out;
}

/** يبني مقطعاً كاملاً من نغمات وفواصل صمت متتابعة. */
function buildSequence(parts) {
  const chunks = [];
  for (const p of parts) {
    if (p.silence) {
      chunks.push(new Float32Array(Math.round(p.silence * SR)));
    } else if (p.to) {
      chunks.push(synthGlide(p));
    } else {
      chunks.push(synthNote(p));
    }
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** يحوّل العينات إلى ملف WAV (مونو 16-بت). */
function toWavBuffer(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // حجم chunk
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // مونو
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // بايت/ثانية
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // بت/عينة
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/* ═══════════════ تعريف الأصوات الـ18 ═══════════════
   الروح العامة: النجاح صاعد / الإلغاء والرفض نازل / الطلب الجديد حاد.
   كل نوع بدرجة صوتية مختلفة لتمييزه سمعياً أثناء الاختبار. */

const NOTIFICATION_SOUNDS = {
  /* طلب جديد — عاجل حاد: نبضتان مرتفعتان متقطعتان */
  order_new: () =>
    buildSequence([
      { freq: 880.0, dur: 0.1, gain: 0.8, wave: "square", release: 0.03 },
      { silence: 0.045 },
      { freq: 1174.66, dur: 0.13, gain: 0.8, wave: "square", release: 0.04 },
    ]),
  /* تأكيد طلب — ثنائية صاعدة */
  order_confirmed: () =>
    buildSequence([
      { freq: 523.25, dur: 0.14, gain: 0.78 },
      { freq: 783.99, dur: 0.24, gain: 0.78 },
    ]),
  /* قيد التحضير — ثنائية محايدة أهدأ */
  order_preparing: () =>
    buildSequence([
      { freq: 493.88, dur: 0.15, gain: 0.72, wave: "triangle" },
      { silence: 0.03 },
      { freq: 587.33, dur: 0.17, gain: 0.72, wave: "triangle" },
    ]),
  /* في الطريق — ثلاثية صاعدة سريعة */
  order_out_for_delivery: () =>
    buildSequence([
      { freq: 587.33, dur: 0.1, gain: 0.78 },
      { freq: 739.99, dur: 0.1, gain: 0.78 },
      { freq: 880.0, dur: 0.2, gain: 0.78 },
    ]),
  /* تم التوصيل — احتفال أربيجيو دو الكبير */
  order_delivered: () =>
    buildSequence([
      { freq: 523.25, dur: 0.12, gain: 0.78 },
      { freq: 659.25, dur: 0.12, gain: 0.78 },
      { freq: 783.99, dur: 0.12, gain: 0.78 },
      { freq: 1046.5, dur: 0.28, gain: 0.8 },
    ]),
  /* إلغاء طلب — هبوط حزين */
  order_cancelled: () =>
    buildSequence([
      { freq: 523.25, dur: 0.14, gain: 0.72 },
      { freq: 415.3, dur: 0.14, gain: 0.72 },
      { freq: 329.63, dur: 0.26, gain: 0.72 },
    ]),
  /* موافقة عضوية — فانفار صاعد */
  membership_approved: () =>
    buildSequence([
      { freq: 392.0, dur: 0.11, gain: 0.78 },
      { freq: 523.25, dur: 0.11, gain: 0.78 },
      { freq: 659.25, dur: 0.11, gain: 0.78 },
      { freq: 783.99, dur: 0.3, gain: 0.8 },
    ]),
  /* رفض عضوية — هبوط مينور */
  membership_rejected: () =>
    buildSequence([
      { freq: 440.0, dur: 0.18, gain: 0.7 },
      { freq: 349.23, dur: 0.18, gain: 0.7 },
      { freq: 261.63, dur: 0.3, gain: 0.7 },
    ]),
  /* قرب انتهاء عضوية — نبضات تحذير متوترة */
  membership_expiring: () =>
    buildSequence([
      { freq: 739.99, dur: 0.09, gain: 0.75, wave: "triangle", release: 0.02 },
      { silence: 0.055 },
      { freq: 739.99, dur: 0.09, gain: 0.75, wave: "triangle", release: 0.02 },
      { silence: 0.055 },
      { freq: 739.99, dur: 0.14, gain: 0.75, wave: "triangle", release: 0.05 },
    ]),
  /* طلب عضوية جديد — جرس إخطار */
  membership_new_request: () =>
    buildSequence([
      { freq: 659.25, dur: 0.16, gain: 0.75 },
      { freq: 987.77, dur: 0.3, gain: 0.75 },
    ]),
  /* عرض خاص جديد — انزلاق صاعد متوهج */
  special_offer_new: () =>
    buildSequence([
      { from: 440.0, to: 880.0, dur: 0.27, gain: 0.75 },
      { freq: 1046.5, dur: 0.2, gain: 0.78 },
    ]),
  /* نفاد عرض — هبوط مسطح */
  special_offer_soldout: () =>
    buildSequence([
      { freq: 392.0, dur: 0.17, gain: 0.7, wave: "triangle" },
      { freq: 311.13, dur: 0.3, gain: 0.7, wave: "triangle" },
    ]),
  /* موافقة منشأة — فانفار مزدوج */
  facility_approved: () =>
    buildSequence([
      { freq: 523.25, dur: 0.11, gain: 0.78 },
      { freq: 523.25, dur: 0.11, gain: 0.78 },
      { freq: 783.99, dur: 0.3, gain: 0.8 },
    ]),
  /* رفض منشأة — هبوط ثلاثي */
  facility_rejected: () =>
    buildSequence([
      { freq: 415.3, dur: 0.15, gain: 0.7 },
      { freq: 311.13, dur: 0.15, gain: 0.7 },
      { freq: 246.94, dur: 0.28, gain: 0.7 },
    ]),
  /* تسجيل مالك جديد — ترحيب صاعد ناعم */
  owner_registered: () =>
    buildSequence([
      { freq: 659.25, dur: 0.13, gain: 0.72 },
      { freq: 783.99, dur: 0.13, gain: 0.72 },
      { freq: 1046.5, dur: 0.26, gain: 0.75 },
    ]),
};

const SYSTEM_SOUNDS = {
  /* نجاح إجراء — نقرة صاعدة قصيرة */
  success_action: () =>
    buildSequence([
      { freq: 659.25, dur: 0.09, gain: 0.7, release: 0.03 },
      { freq: 880.0, dur: 0.2, gain: 0.72 },
    ]),
  /* خطأ — ازدواج منخفض مكتوم */
  error_occurred: () =>
    buildSequence([
      { freq: 233.08, dur: 0.12, gain: 0.6, wave: "square", release: 0.03 },
      { freq: 185.0, dur: 0.22, gain: 0.6, wave: "square" },
    ]),
  /* فتح الإشعارات — نقرة ناعمة واحدة */
  notification_open: () =>
    buildSequence([{ freq: 523.25, dur: 0.3, gain: 0.6, release: 0.22 }]),
};

/* ═══════════════ التنفيذ ═══════════════ */

async function encodeMp3(wavPath, mp3Path) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", wavPath,
    "-codec:a", "libmp3lame",
    "-b:a", "96k",
    "-ar", String(SR),
    "-ac", "1",
    mp3Path,
  ], { stdio: "ignore" });
}

async function generateSound(name, buildFn, dir, tmpDir) {
  const samples = buildFn();
  const wavPath = path.join(tmpDir, `${name}.wav`);
  const mp3Path = path.join(dir, `${name}.mp3`);
  writeFileSync(wavPath, toWavBuffer(samples));
  await encodeMp3(wavPath, mp3Path);
  unlinkSync(wavPath);
  const kb = statSync(mp3Path).size / 1024;
  const dur = (samples.length / SR).toFixed(2);
  console.log(`  OK ${name}.mp3 — ${dur}s — ${kb.toFixed(1)}KB`);
}

async function main() {
  const root = path.resolve(process.cwd(), "public", "sounds");
  const notifDir = path.join(root, "notifications");
  const sysDir = path.join(root, "system");
  mkdirSync(notifDir, { recursive: true });
  mkdirSync(sysDir, { recursive: true });
  const tmpDir = path.join(os.tmpdir(), `tawfir-sounds-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  console.log("\n[1/2] توليد أصوات الإشعارات (15):");
  for (const [name, fn] of Object.entries(NOTIFICATION_SOUNDS)) {
    await generateSound(name, fn, notifDir, tmpDir);
  }
  console.log("\n[2/2] أصوات النظام (3):");
  for (const [name, fn] of Object.entries(SYSTEM_SOUNDS)) {
    await generateSound(name, fn, sysDir, tmpDir);
  }

  // تنظيف مجلد المؤقتات
  try { unlinkSync(tmpDir); } catch { /* قد يفشل على بعض الأنظمة — غير حرج */ }

  const total = Object.keys(NOTIFICATION_SOUNDS).length + Object.keys(SYSTEM_SOUNDS).length;
  console.log(`\nDONE ${total} صوتاً في public/sounds/`);
  console.log("NOTE: نغمات اختبارية مؤقتة — استبدلها بنغمات نهائية بنفس الأسماء (بلا كود).");
}

main().catch((err) => {
  console.error("فشل التوليد:", err.message);
  process.exit(1);
});

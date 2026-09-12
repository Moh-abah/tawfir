/**
 * courier-call-sound — محرك نداء المندوب (Web Audio + Vibration).
 * ═══════════════════════════════════════════════════════════════
 * مكافئات الويب الحاكم (§0-3): صوت النداء = Web Audio API (نغمتان
 * متناوبتان كسماعة هاتف — بلا ملف صوتي خارجي إطلاقاً)، الاهتزاز =
 * Vibration API بنمط متكرر.
 *
 * قيود المتصفح: AudioContext يبدأ suspended حتى أول إيماءة مستخدم —
 * unlockCourierAudio() يُستدعى من أي نقطة تفاعل مبكرة (دخول/لمس أول)
 * لضمان جهوزية الصوت قبل وصول أول نداء.
 */

type RingHandle = {
  stop: () => void;
};

let ctx: AudioContext | null = null;

/** فتح قفل الصوت عند أول إيماءة (سياسة المتصفحات) */
export function unlockCourierAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* صوت غير متاح — الاهتزاز والتوثيق المرئي يكفيان */
  }
}

/** نبضة نغمية واحدة (beep) بمستوى صوت منخفض مهذّب */
function beep(freq: number, durationMs: number, gainValue = 0.14): void {
  if (!ctx || ctx.state !== "running") return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.setValueAtTime(gainValue, now + durationMs / 1000 - 0.02);
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

/** نمط الاهتزاز: نبضتان قويتان ثم سكون (كرر كل 1.4 ث) */
const VIBRATE_PATTERN: number[] = [450, 180, 450, 320];

/** دقّة النداء — نغمتان متناوبتان (880/660Hz) بنمط سماعة هاتف */
export function startCourierCallRing(): RingHandle {
  let ringing = true;

  const ringOnce = () => {
    if (!ringing) return;
    beep(880, 160);
    window.setTimeout(() => ringing && beep(660, 160), 220);
  };

  ringOnce();
  const soundTimer = window.setInterval(ringOnce, 1250);

  /* الاهتزاز — متصفحات بلا Vibration API (iOS Safari): تخطٍّ صامت */
  let vibTimer: number | null = null;
  const nav = navigator as Navigator & {
    vibrate?: (p: number | number[]) => boolean;
  };
  if (typeof nav.vibrate === "function") {
    const vibrateOnce = () => {
      if (!ringing) return;
      nav.vibrate?.(VIBRATE_PATTERN);
    };
    vibrateOnce();
    vibTimer = window.setInterval(vibrateOnce, 1400);
  }

  return {
    stop() {
      ringing = false;
      window.clearInterval(soundTimer);
      if (vibTimer !== null) window.clearInterval(vibTimer);
      nav.vibrate?.(0);
    },
  };
}

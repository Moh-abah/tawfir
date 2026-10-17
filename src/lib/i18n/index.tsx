"use client";

/**
 * i18n — نواة اللغتين العربية/الإنجليزية (جولة التدويل)
 * ═══════════════════════════════════════════════════════════════
 * القواعد الملزمة:
 *  - العربية هي الافتراضية والأساس (dir=rtl من <html>) — لا يتغير أي
 *    سلوك قائم لمن يختر العربية.
 *  - القراءة من localStorage عبر useSyncExternalStore (نمط المخزن
 *    الخارجي القياسي): الخادم يرسم عربي دائماً (getServerSnapshot) ثم
 *    يتحرك العميل بعد الترطيب — بلا اختلاف ترطيب وبلا setState داخل
 *    effect (قاعدة react-hooks).
 *  - المفتاح المحفوظ: tawfir-lang = "ar" | "en".
 *  - القواميس في src/lib/i18n/dict/* — كل ملف تصدير Record<string,
 *    DictEntry> حيث {ar, en} — وindex يدمجها كلها.
 *  - t(key) يعيد النص العربي دائماً إن غاب المفتاح (fallback آمن).
 *  - أسماء المنتجات/المتاجر/المحتوى الخادمي تُعرض كما هي (محتوى التجار)
 *    — الترجمة تشمل واجهة التطبيق حصراً في هذه الجولة.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type Lang = "ar" | "en";
export type Dir = "rtl" | "ltr";

/** مدخل القاموس — النصان دائماً معاً حتى لا يفلت مفتاح بلا ترجمة. */
export interface DictEntry {
  ar: string;
  en: string;
}

const STORAGE_KEY = "tawfir-lang";

/* ═══ سجل القواميس — يُدمج من كل ملفات dict/ ═══ */
import { commonDict } from "@/lib/i18n/dict/common";
import { onboardingDict } from "@/lib/i18n/dict/onboarding";
import { homeDict } from "@/lib/i18n/dict/home";
import { catalogDict } from "@/lib/i18n/dict/catalog";
import { cartDict } from "@/lib/i18n/dict/cart";
import { ordersDict } from "@/lib/i18n/dict/orders";
import { paymentDict } from "@/lib/i18n/dict/payment";
import { authDict } from "@/lib/i18n/dict/auth";
import { profileDict } from "@/lib/i18n/dict/profile";

const DICTIONARIES: Record<string, DictEntry> = {
  ...commonDict,
  ...onboardingDict,
  ...homeDict,
  ...catalogDict,
  ...cartDict,
  ...ordersDict,
  ...paymentDict,
  ...authDict,
  ...profileDict,
};

/* ═══ المخزن الخارجي (localStorage) — نمط useSyncExternalStore ═══ */

/* اللغة النشطة على مستوى الوحدة — لمن يستدعي التنسيق خارج React
   (مثل formatMoney في format.ts) — تُحدَّث في نقطة الحقيقة واحدة:
   الكاش أسفل، مع كل notify */
let activeLang: Lang = "ar";

/** قراءة اللغة النشطة حالياً (لأدوات خارج سياق React). */
export function getActiveLang(): Lang {
  return activeLang;
}

function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ar" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

/* كاش قراءة — يمنع إعادة قراءة localStorage في كل استدعاء snapshot
   ويجعل التحقق من التغير رخيصاً (Object.is) */
let cachedLang: Lang | null = null;
let cacheValid = false;

function refreshCache(): Lang | null {
  if (!cacheValid) {
    cachedLang = readStoredLang();
    cacheValid = true;
  }
  return cachedLang;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  /* تزامن بين تبويبات المتصفح */
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

function setStoredLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* الحفظ اختياري — لا نرمي */
  }
  cacheValid = true;
  cachedLang = lang;
  activeLang = lang;
  notify();
}

/* getSnapshot: نقي بلا آثار جانبية — القراءة من الكاش فقط. مزامنة
   مرآة activeLang تحدث في effect المزود وبعد setStoredLang حصراً */
function getLangSnapshot(): Lang {
  const stored = refreshCache();
  return stored ?? activeLang;
}

function getLangServerSnapshot(): Lang {
  return "ar";
}

/* decided: null (خادم/قبل الترطيب) · true (تفضيل محفوظ) · false (أول
   تشغيل بلا تفضيل → بوابة الاختيار) */
function getDecidedSnapshot(): boolean | null {
  if (typeof window === "undefined") return null;
  return refreshCache() != null ? true : false;
}

function getDecidedServerSnapshot(): boolean | null {
  return null;
}

/* ═══ السياق ═══ */

interface LangContextValue {
  lang: Lang;
  dir: Dir;
  decided: boolean | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
  /** اختيار من بوابة أول تشغيل — يثبّت القرار نهائياً */
  choose: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(
    subscribe,
    getLangSnapshot,
    getLangServerSnapshot
  );
  const decided = useSyncExternalStore(
    subscribe,
    getDecidedSnapshot,
    getDecidedServerSnapshot
  );

  /* عكس اللغة على مستند فعلياً + مزامنة مرآة الوحدة (لمنسّقات خارج
     React مثل formatMoney) — تعديل DOM/وحدة لا حالة React */
  useEffect(() => {
    activeLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      /* يقرأ قيمة الـhook نفسها (لا المتغير الوحدوي) — أثناء الترطيب
         lang="ar" مطابق للخادم حتماً، وبعد الجبل يتقلب بالإنجليزية */
      const entry = DICTIONARIES[key];
      const text = entry ? entry[lang] : key;
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (_m, name: string) =>
        vars[name] != null ? String(vars[name]) : `{${name}}`
      );
    },
    /* activeLang يتغير مع lang دائماً — اعتماد lang يعيد بناء t */
    [lang]
  );

  const setLang = useCallback((next: Lang) => {
    setStoredLang(next);
  }, []);

  const choose = useCallback((next: Lang) => {
    setStoredLang(next);
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      dir: lang === "en" ? "ltr" : "rtl",
      decided,
      t,
      setLang,
      choose,
    }),
    [lang, decided, t, setLang, choose]
  );

  return (
    <LangContext.Provider value={value}>
      {children}
      {/* بوابة أول تشغيل — تظهر فقط عند غياب أي تفضيل محفوظ.
          decided=null (خادم/قبل الترطيب) ترسم لا شيء فلا وميض. */}
      {decided === false ? <LanguageGate /> : null}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    /* احتياط آمن: مكوّن خارج المزود — يرى العربية دون انهيار */
    return {
      lang: "ar",
      dir: "rtl",
      decided: true,
      t: (key, vars) => {
        const text = DICTIONARIES[key]?.ar ?? key;
        if (!vars) return text;
        return text.replace(/\{(\w+)\}/g, (_m, name: string) =>
          vars[name] != null ? String(vars[name]) : `{${name}}`
        );
      },
      setLang: () => undefined,
      choose: () => undefined,
    };
  }
  return ctx;
}

/* ═══ عكس-بحث: نص عربي حرفي ← مفتاح القاموس ═══
   لعناوين الشاشات القادمة كخصائص من صفحات خادمية (ScreenHeader إلخ):
   إن وُجد مدخل قاموس نصه العربي مطابقاً حرفياً يُعرض النص باللغة
   النشطة، وإلا يعود النص الأصلي كما هو — بلا أي كسر. */
const AR_INDEX: Map<string, DictEntry> | null =
  typeof window === "undefined"
    ? null
    : (() => {
        const m = new Map<string, DictEntry>();
        for (const entry of Object.values(DICTIONARIES)) {
          if (!m.has(entry.ar)) m.set(entry.ar, entry);
        }
        return m;
      })();

/** ترجمة نص عربي حرفي إن وُجد في القاموس — وإلا يعود كما هو. */
export function tByAr(arText: string | null | undefined): string {
  if (!arText) return arText ?? "";
  const lang = getActiveLang();
  if (lang !== "en") return arText;
  const entry = AR_INDEX?.get(arText);
  return entry ? entry.en : arText;
}

/* ═══ بوابة اختيار اللغة — أول تشغيل فقط ═══ */

function LanguageGate() {
  const { choose } = useLang();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="اختر لغتك / Choose your language"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background px-6 py-10"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-black text-primary-foreground shadow-soft"
          aria-hidden="true"
        >
          ت
        </span>
        <h1 className="text-2xl font-black text-foreground">
          <span className="block">مرحباً بك في توفير</span>
          <span className="block text-lg font-bold text-muted-foreground" dir="ltr">
            Welcome to Tawfir
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="block">اختر لغة التطبيق المفضلة لديك</span>
          <span className="block" dir="ltr">
            Choose your preferred app language
          </span>
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose("ar")}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.98]"
          aria-label="اختر اللغة العربية"
        >
          <span className="text-3xl" aria-hidden="true">
            🇸🇦
          </span>
          <span className="text-xl font-black text-foreground">العربية</span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            Arabic — RTL
          </span>
        </button>

        <button
          type="button"
          onClick={() => choose("en")}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card p-6 text-center transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.98]"
          aria-label="Choose English language"
        >
          <span className="text-3xl" aria-hidden="true">
            🌍
          </span>
          <span className="text-xl font-black text-foreground" dir="ltr">
            English
          </span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            English — LTR
          </span>
        </button>
      </div>

      <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
        <span className="block">
          يمكنك تغيير اللغة في أي وقت من أيقونة الكرة الأرضية أو من ملفك.
        </span>
        <span className="block" dir="ltr">
          You can change the language anytime from the globe icon or your
          profile.
        </span>
      </p>
    </div>
  );
}

/* ═══ زر تبديل اللغة — أيقونة الكرة الأرضية ═══ */

export function LanguageToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { lang, setLang } = useLang();
  const next: Lang = lang === "ar" ? "en" : "ar";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={() => setLang(next)}
      aria-label={
        lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"
      }
      title={lang === "ar" ? "English" : "العربية"}
      className={cn(
        "min-h-[44px] min-w-[44px] gap-2 rounded-full text-foreground",
        className
      )}
    >
      <Globe className="h-5 w-5" aria-hidden="true" />
      {showLabel ? (
        <span className="text-sm font-bold" dir="ltr">
          {lang === "ar" ? "EN" : "ع"}
        </span>
      ) : null}
    </Button>
  );
}

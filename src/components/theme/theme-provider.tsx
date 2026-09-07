"use client";

import * as React from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "tawfir-theme";

/* قراءة الثيم الفعلي — أولوية اختيار المستخدم، وإلا وضع النظام
   (الجولة 23: نفس منطق سكربت no-flash في layout — بلا اختيار مخزّن
   يتبع prefers-color-scheme مثل التطبيقات الأصلية).
   تعيد قيمة بدائية مستقلة (متوافقة مع getSnapshot). */
function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // تجاهل فشل التخزين (وضع التصفح الخاص مثلاً)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/* الاشتراك بتغيّر وضع النظام: إن لم يختر المستخدم ثيماً صراحةً، ينعكس
   تبديل الوضع من إعدادات الجهاز فوراً على التطبيق (كالتطبيقات الأصلية).
   إن وُجد اختيار مخزّن فالـ snapshot لا يتأثر أصلاً بالتغيير. */
function subscribeToSystem(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /* القراءة الأولية عبر useSyncExternalStore: "light" على الخادم وأول رسم
     العميل (ضمان تطابق الـHydration)، ثم القيمة الفعلية بعد التركيب —
     بلا setState داخل effect (قاعدة react-hooks/set-state-in-effect).
     الاشتراك يعيش مع تغيّر وضع النظام (انظر subscribeToSystem). */
  const storedTheme = React.useSyncExternalStore(
    subscribeToSystem,
    readStoredTheme,
    () => "light" as Theme,
  );

  /* تجاوز صريح من المستخدم (زر التبديل) — له الأولوية فوق المخزّن */
  const [override, setOverride] = React.useState<Theme | null>(null);
  const theme = override ?? storedTheme;

  /* مزامنة صنف <html> + <meta name=theme-color> مع الثيم الفعلي —
     تحديث نظام خارجي (DOM) داخل effect: مسموح. الجولة 23: شريط
     المتصفح/النظام يتبع الثيم (فاتح = فاتح، داكن = كحلي الهوية). */
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0A1A2F" : "#F7F7F7");
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setOverride(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // تجاهل فشل التخزين (وضع التصفح الخاص مثلاً)
    }
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

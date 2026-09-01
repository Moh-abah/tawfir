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

/* قراءة الثيم من localStorage — تعيد قيمة بدائية مستقرة (متوافقة مع getSnapshot) */
function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

const emptySubscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /* القراءة الأولية عبر useSyncExternalStore: "light" على الخادم وأول رسم
     العميل (ضمان تطابق الـHydration)، ثم القيمة المخزنة فعلياً بعد التركيب —
     بلا setState داخل effect (قاعدة react-hooks/set-state-in-effect) */
  const storedTheme = React.useSyncExternalStore(
    emptySubscribe,
    readStoredTheme,
    () => "light" as Theme,
  );

  /* تجاوز صريح من المستخدم (زر التبديل) — له الأولوية فوق المخزّن */
  const [override, setOverride] = React.useState<Theme | null>(null);
  const theme = override ?? storedTheme;

  /* مزامنة صنف <html> مع الثيم الفعلي — تحديث نظام خارجي (DOM) داخل effect: مسموح */
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
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

"use client";

import * as React from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
 theme: Theme;
 resolvedTheme: Theme;
 setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "wafir-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
 const [theme, setThemeState] = React.useState<Theme>("light");

 React.useEffect(() => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const initial: Theme = stored === "dark" ? "dark" : "light";
   
  setThemeState(initial);
  document.documentElement.classList.toggle("dark", initial === "dark");
 }, []);

 const setTheme = React.useCallback((next: Theme) => {
  setThemeState(next);
  try {
   window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
   // تجاهل فشل التخزين (وضع التصفح الخاص مثلاً)
  }
  document.documentElement.classList.toggle("dark", next === "dark");
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
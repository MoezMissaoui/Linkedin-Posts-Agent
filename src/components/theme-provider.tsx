"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const [, startTransition] = React.useTransition();

  const applyTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      const root = document.documentElement;
      root.classList.toggle("dark", next === "dark");
      root.style.colorScheme = next;
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      startTransition(() => router.refresh());
    },
    [router],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: applyTheme,
      toggle: () => applyTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, applyTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

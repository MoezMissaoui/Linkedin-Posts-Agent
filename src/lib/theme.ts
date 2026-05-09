export type Theme = "light" | "dark";

export const THEME_COOKIE = "postilys-theme";
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

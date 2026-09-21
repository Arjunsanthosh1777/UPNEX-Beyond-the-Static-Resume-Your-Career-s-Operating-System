import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "upnex_theme";

const ThemeContext = createContext(null);

function systemPreference() {
  if (typeof window === "undefined") return "dark";
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

function initialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore storage errors
  }
  return systemPreference();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Keep the theme in sync if the user changes the OS preference while any
  // stored choice is absent (first-run behaviour).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event) => {
      try {
        if (!window.localStorage.getItem(STORAGE_KEY) && event.matches) setThemeState("light");
        if (!window.localStorage.getItem(STORAGE_KEY) && !event.matches) setThemeState("dark");
      } catch {
        // ignore storage errors
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isLight: theme === "light",
      toggleTheme: () => setThemeState((current) => (current === "light" ? "dark" : "light")),
      setTheme: setThemeState
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
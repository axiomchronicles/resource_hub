import { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  const getInitial = (): ThemeMode => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark" || saved === "system") return saved as ThemeMode;
    } catch {}
    return "system";
  };

  const [mode, setMode] = useState<ThemeMode>(getInitial);

  // system dark?
  const prefersDark = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }, []);

  // apply class based on mode
  const apply = (m: ThemeMode) => {
    const root = document.documentElement;
    const shouldDark = m === "dark" || (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", shouldDark);
  };

  useEffect(() => {
    try {
      localStorage.setItem("theme", mode);
    } catch {}
    apply(mode);
  }, [mode]);

  // react to system changes when in "system"
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mode]);

  return { mode, setMode };
}

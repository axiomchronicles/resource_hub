import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Sparkles } from "lucide-react";

const THEME_TRANSITION_MS = 550;
const THEME_DELAY_MS = 300;

function getInitialDark(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

function withThemeTransition(apply: () => void, ms = THEME_TRANSITION_MS) {
  if (typeof window === "undefined") {
    apply();
    return;
  }
  const root = document.documentElement;
  const rmo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (rmo) {
    apply();
    return;
  }
  root.classList.add("theme-switching");
  requestAnimationFrame(() => {
    apply();
    setTimeout(() => root.classList.remove("theme-switching"), ms + 60);
  });
}

type Props = {
  size?: number;
  onChange?: (dark: boolean) => void;
  ariaLabel?: string;
};

export default function ThemeButtonEnhanced({
  size = 36,
  onChange,
  ariaLabel = "Toggle color theme",
}: Props) {
  const [dark, setDark] = useState<boolean>(() => getInitialDark());
  const [pulseKey, setPulseKey] = useState<number>(0);
  const [switching, setSwitching] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = useCallback(() => {
    const next = !dark;
    setSwitching(true);
    setTimeout(() => {
      withThemeTransition(() => {
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
        document.documentElement.classList.toggle("dark", next);
        setDark(next);
        setPulseKey((k) => k + 1);
        setSwitching(false);
        if (onChange) onChange(next);
      });
    }, THEME_DELAY_MS);
  }, [dark, onChange]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  const iconVariants = {
    enter: { rotate: 0, opacity: 1, scale: 1 },
    initialSun: { rotate: 120, opacity: 0, scale: 0.4 },
    initialMoon: { rotate: -120, opacity: 0, scale: 0.4 },
    exitSun: { rotate: -120, opacity: 0, scale: 0.4 },
    exitMoon: { rotate: 120, opacity: 0, scale: 0.4 },
  } as const;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const pad = Math.round(size * 0.14);
  const iconSize = Math.max(12, Math.round(size * 0.45));

  return (
    <div className="relative inline-block">
      {/* pulse ring */}
      <AnimatePresence>
        <motion.div
          key={`pulse-${pulseKey}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.25, scale: 2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.9, ease: "easeOut" }}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: dark ? "0 0 30px rgba(147,197,253,0.3)" : "0 0 30px rgba(253,224,71,0.3)" }}
        />
      </AnimatePresence>

      <motion.button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label={ariaLabel}
        aria-pressed={dark}
        onClick={toggle}
        onKeyDown={onKeyDown}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        whileHover={reduced ? undefined : { y: -1, scale: 1.06 }}
        animate={switching ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        className="relative flex items-center justify-center rounded-full border bg-[hsl(var(--card))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] overflow-hidden"
        style={{
          width: size,
          height: size,
          padding: pad,
          borderColor: "hsl(var(--border))",
        }}
      >
        {/* sparkles animation overlay when switching */}
        {switching && (
          <motion.div
            key={`sparkle-${pulseKey}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute -top-1 -right-1 text-yellow-300 dark:text-sky-300"
          >
            <Sparkles size={12} />
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {dark ? (
            <motion.span
              key="moon"
              role="img"
              aria-hidden
              initial={iconVariants.initialMoon}
              animate={iconVariants.enter}
              exit={iconVariants.exitMoon}
              transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
              className="text-sky-400"
            >
              <Moon className="block" width={iconSize} height={iconSize} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              role="img"
              aria-hidden
              initial={iconVariants.initialSun}
              animate={iconVariants.enter}
              exit={iconVariants.exitSun}
              transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
              className="text-yellow-400"
            >
              <Sun className="block" width={iconSize} height={iconSize} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* gradient overlay */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: dark ? 0.18 : 0 }}
          transition={{ duration: reduced ? 0 : 0.6 }}
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: dark ? "linear-gradient(135deg,#1e3a8a,#0ea5e9)" : "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
        />
      </motion.button>
    </div>
  );
}
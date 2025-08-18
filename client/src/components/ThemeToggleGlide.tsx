import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

const THEME_TRANSITION_MS = 550;

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

function withThemeTransition(apply: () => void, ms = THEME_TRANSITION_MS) {
  const root = document.documentElement;
  const rmo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (rmo) {
    apply();
    return;
  }
  root.classList.add("theme-switching");
  // Do the class flip on the next frame so CSS can catch transitions
  requestAnimationFrame(() => {
    apply();
    setTimeout(() => root.classList.remove("theme-switching"), ms + 60);
  });
}

export default function ThemeToggleGlide() {
  const [dark, setDark] = useState<boolean>(getInitialDark);

  // ensure correct class on mount (SSR-safe)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
  }, []); // run once

  const toggle = () => {
    withThemeTransition(() => {
      const next = !dark;
      const root = document.documentElement;
      root.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
      setDark(next);
    });
  };

  // Smaller sizing:
  const KNOB = 20; // px
  const PAD = 4; // px
  const WIDTH = 48; // px (w-12 -> 12 * 4)
  const left = dark ? WIDTH - PAD - KNOB : PAD;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      title={dark ? "Switch to light" : "Switch to dark"}
      className="relative inline-flex h-7 w-12 items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
    >
      {/* Sun (left) */}
      <Sun
        className={`absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 transition-opacity ${
          dark ? "opacity-40" : "opacity-100"
        }`}
      />
      {/* Moon (right) */}
      <Moon
        className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 transition-opacity ${
          dark ? "opacity-100" : "opacity-40"
        }`}
      />

      {/* Knob that glides - vertically centered to match icons */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white dark:bg-[hsl(var(--muted))] shadow"
        initial={false}
        animate={{ left: `${left}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
      />

      {/* subtle pill tint when dark */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={false}
        animate={{ opacity: dark ? 0.14 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ background: "linear-gradient(90deg, #4f46e5, #06b6d4)" }}
      />
    </button>
  );
}

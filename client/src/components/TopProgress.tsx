import React, { useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

/**
 * TopProgressPro – an advanced, GPU-friendly 2–3px top progress indicator.
 *
 * ▶ What it adds over the simple version
 * - React Query + navigation aware (starts on route change or when queries run)
 * - Programmatic control API (start/stop) via window events for non-query work
 * - Smart easing with frame-time delta (butter-smooth on 60Hz/120Hz/144Hz)
 * - Stall detection (adds subtle stripes + keeps creeping so it never “sticks”)
 * - Prefers-reduced-motion support (disables shimmer/stripes/spinner)
 * - A11y: proper ARIA attributes while active
 * - Highly configurable: height, color, rainbow, spinner, zIndex, position
 * - SSR-safe (guards for window/document usage)
 *
 * Usage:
 *  <TopProgressPro height={3} rainbow showSpinner />
 *
 * Programmatic (for long actions outside React Query):
 *  TopProgressPro.busyStart();
 *  // ... do work ...
 *  TopProgressPro.busyEnd();
 */
export interface TopProgressProProps {
  /** Bar thickness in px */
  height?: number;
  /** z-index for the container */
  zIndex?: number;
  /** CSS color; defaults to currentColor / --primary */
  color?: string;
  /** Places the bar at the top (default) or bottom */
  position?: "top" | "bottom";
  /** Show the small spinner at the right */
  showSpinner?: boolean;
  /** Fun rainbow gradient mode */
  rainbow?: boolean;
  /** Enable moving shimmer within the bar */
  shimmer?: boolean;
  /** Drop shadow glow for a touch of depth */
  glow?: boolean;
  /** ms with no progress considered a stall */
  stallThresholdMs?: number;
  /** Delay (ms) before hiding after 100% */
  hideDelayMs?: number;
  /** Additional class for outer container */
  className?: string;
}

const DEFAULTS = {
  height: 2,
  zIndex: 9999,
  color: "hsl(var(--primary, 221 83% 53%))",
  position: "top" as const,
  showSpinner: true,
  rainbow: false,
  shimmer: true,
  glow: true,
  stallThresholdMs: 1200,
  hideDelayMs: 220,
};

// ---- Programmatic control bus ----
const EVT_START = "top-progress:start";
const EVT_END = "top-progress:end";

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefers(!!mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return prefers;
}

function injectOnce(id: string, css: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

// Minimal CSS for spinner + stripes
const CSS = `
@keyframes tpp-spin { to { transform: rotate(360deg) } }
@keyframes tpp-stripes { to { background-position: 200% 0 } }
.tpp-spinner { animation: tpp-spin 700ms linear infinite; }
.tpp-stripes { background-size: 200% 100%; animation: tpp-stripes 1.4s linear infinite; }
`;

export default function TopProgressPro(props: TopProgressProProps) {
  const cfg = { ...DEFAULTS, ...props };
  injectOnce("tpp-styles", CSS);

  const prefersReduced = usePrefersReducedMotion();
  const { pathname, search } = useLocation();
  const fetchingCount = useIsFetching();

  // Programmatic external busy counter
  const [externalBusy, setExternalBusy] = useState(0);
  useEffect(() => {
    const onStart = () => setExternalBusy((n) => n + 1);
    const onEnd = () => setExternalBusy((n) => Math.max(0, n - 1));
    if (typeof window !== "undefined") {
      window.addEventListener(EVT_START, onStart);
      window.addEventListener(EVT_END, onEnd);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVT_START, onStart);
        window.removeEventListener(EVT_END, onEnd);
      }
    };
  }, []);

  const busy = (fetchingCount ?? 0) + externalBusy > 0;

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const [stalled, setStalled] = useState(false);

  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const lastAdvanceAt = useRef<number>(0);
  const mounted = useRef(true);

  // Start when navigating
  useEffect(() => {
    setActive(true);
    setProgress((p) => (p > 0 && p < 98 ? p : 8 + Math.random() * 6));
    lastAdvanceAt.current = performance.now();
  }, [pathname, search]);

  // Also start when queries begin
  useEffect(() => {
    if (busy) {
      setActive(true);
      if (progress === 0) setProgress(8 + Math.random() * 6);
    }
  }, [busy, progress]);

  // Drive progress while active
  useEffect(() => {
    if (!active) return;
    mounted.current = true;

    const step = (ts: number) => {
      if (!mounted.current) return;
      if (lastTs.current == null) lastTs.current = ts;
      const dt = Math.max(0.001, (ts - lastTs.current) / 1000); // seconds
      lastTs.current = ts;

      setProgress((p) => {
        const cap = busy ? 92 : 100; // don’t reach 100 while busy
        const remaining = Math.max(0, cap - p);
        // Velocity: asymptotic easing + a small base speed
        const base = busy ? 8 : 24; // % per second base
        const ease = remaining * (busy ? 0.55 : 1.1); // proportional to how far we are
        const inc = (base + ease) * dt; // frame-time aware
        const next = Math.min(cap, p + inc);
        if (next > p + 0.05) {
          lastAdvanceAt.current = ts;
          if (stalled) setStalled(false);
        }
        return next;
      });

      // Stall detection while we’re busy
      if (busy && ts - lastAdvanceAt.current > cfg.stallThresholdMs) {
        setStalled(true);
        // tiny nudge so users see motion
        setProgress((p) => Math.min(92, p + 0.3));
        lastAdvanceAt.current = ts;
      }

      raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      mounted.current = false;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      lastTs.current = null;
    };
  }, [active, busy, cfg.stallThresholdMs, stalled]);

  // Hide when complete
  useEffect(() => {
    if (!active) return;
    if (progress >= 100 - 0.001) {
      const t = setTimeout(() => {
        setActive(false);
        setProgress(0);
        setStalled(false);
      }, cfg.hideDelayMs);
      return () => clearTimeout(t);
    }
  }, [progress, active, cfg.hideDelayMs]);

  // Auto-complete when work finishes
  useEffect(() => {
    if (active && !busy) {
      // Fast-track to 100
      setProgress((p) => Math.max(p, 98));
      // The step loop will take it to 100 quickly
    }
  }, [active, busy]);

  if (!active) return null;

  const thickness = Math.max(1, cfg.height ?? DEFAULTS.height);

  const barStyle: React.CSSProperties = {
    height: thickness,
    width: "100%",
    transform: `translate3d(${progress - 100}%, 0, 0)`,
    transition: "transform 60ms linear",
    willChange: "transform",
    background: cfg.rainbow
      ? "linear-gradient(90deg, #4f46e5, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)"
      : "linear-gradient(90deg, rgba(0,0,0,0), currentColor 40%, rgba(0,0,0,0))",
    color: cfg.color,
    filter: cfg.glow ? "drop-shadow(0 0 6px currentColor)" : undefined,
  };

  const outerStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    [cfg.position === "top" ? "top" : "bottom"]: 0,
    height: thickness,
    zIndex: cfg.zIndex,
    background: "transparent",
    pointerEvents: "none",
  } as React.CSSProperties;

  const stripesStyle: React.CSSProperties = prefersReduced || !cfg.shimmer
    ? {}
    : {
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0, rgba(255,255,255,0.35) 20px, rgba(255,255,255,0.0) 20px, rgba(255,255,255,0.0) 40px)",
      };

  return (
    <div style={outerStyle} className={cfg.className} aria-hidden={false}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress)}>
      <div
        className={(stalled && !prefersReduced && cfg.shimmer) ? "tpp-stripes" : undefined}
        style={{ ...barStyle, ...(stalled ? stripesStyle : {}), }}
      />

      {cfg.showSpinner && !prefersReduced && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: cfg.position === "top" ? 2 + thickness : undefined,
            bottom: cfg.position === "bottom" ? 2 + thickness : undefined,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: 999,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            opacity: 0.8,
            color: cfg.color,
            zIndex: cfg.zIndex,
            pointerEvents: "none",
          }}
          className="tpp-spinner"
        />
      )}
    </div>
  );
}

// ---- Programmatic API ----
// Moved busyStart and busyEnd to TopProgressAPI.ts

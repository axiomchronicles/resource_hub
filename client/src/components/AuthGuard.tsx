import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AuthGuard with a deeply enhanced loading experience.
 *
 * Highlights:
 * - Smart delay before showing UI (avoid flash for fast loads)
 * - Rich, accessible Spinner with multiple variants and sizes
 * - Optional linear progress sweep + rotating helpful tips
 * - Detects offline state and long loads, offering a Retry button
 * - Debug panel (toggle with `?debug=1` or press "d") showing auth state snapshot
 * - Respects prefers-reduced-motion and announces progress via aria-live
 */

interface AuthGuardProps {
  children: ReactNode;
  isPublic?: boolean;
  redirectTo?: string; // default redirect for unauthenticated users
  allowedRoles?: string[]; // role-based access control

  // --- Enhanced loading UI options ---
  delayMs?: number; // delay before showing the overlay (ms), to avoid flicker
  longLoadMs?: number; // when exceeded, show extra guidance & retry
  loadingTitle?: string; // heading above spinner
  loadingMessage?: string; // primary loading copy (overrides default)
  loadingTips?: string[]; // rotating footnote tips
  showSkeleton?: boolean; // show subtle skeletons below spinner
  onRetry?: () => Promise<void> | void; // custom retry logic (defaults to reload)
  debug?: boolean; // force debug panel open
}

export const AuthGuard = ({
  children,
  isPublic = false,
  redirectTo = "/login",
  allowedRoles,
  delayMs = 300,
  longLoadMs = 4000,
  loadingTitle = "Checking your session…",
  loadingMessage,
  loadingTips = DEFAULT_TIPS,
  showSkeleton = false,
  onRetry,
  debug,
}: AuthGuardProps) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Derived debug flag (query param has precedence if present)
  const debugFromQuery = searchParams.get("debug");
  const debugEnabled = useMemo(() => {
    if (typeof debug === "boolean") return debug;
    return debugFromQuery === "1" || debugFromQuery === "true";
  }, [debug, debugFromQuery]);

  // Manage document.title while loading for a touch of polish
  useEffect(() => {
    const original = document.title;
    if (isLoading) document.title = "Authenticating…";
    return () => {
      document.title = original;
    };
  }, [isLoading]);

  // Navigate logic
  useEffect(() => {
    if (isLoading) return;

    if (!isPublic && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    } else if (isPublic && isAuthenticated) {
      navigate("/", { replace: true });
    } else if (allowedRoles && isAuthenticated && !hasRole(allowedRoles)) {
      toast.error("You do not have access to this page.");
      navigate("/403", { replace: true }); // optional forbidden page
    }
  }, [isLoading, isAuthenticated, isPublic, allowedRoles, hasRole, navigate, redirectTo]);

  // Show loading overlay with a slight delay to avoid flicker
  const show = useDelayedMount(isLoading, delayMs);

  if (show) {
    return (
      <LoadingOverlay
        title={loadingTitle}
        message={
          loadingMessage ??
          (user?.name
            ? `Welcome back, ${user.name}. Validating your session…`
            : "Verifying your session…")
        }
        tips={loadingTips}
        longLoadMs={longLoadMs}
        onRetry={onRetry}
        showSkeleton={showSkeleton}
        debug={debugEnabled}
        debugSnapshot={{
          isAuthenticated,
          isLoading,
          allowedRoles,
          redirectTo,
          user: user ? { id: (user as any)?.id, name: (user as any)?.name, email: (user as any)?.email } : null,
          hasRequiredRole: allowedRoles ? hasRole(allowedRoles) : true,
        }}
      />
    );
  }

  if ((!isPublic && !isAuthenticated) || (isPublic && isAuthenticated)) {
    return null;
  }

  if (allowedRoles && isAuthenticated && !hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
};

// ---------------------
// Loading Overlay
// ---------------------

type LoadingOverlayProps = {
  title?: string;
  message?: string;
  tips?: string[];
  longLoadMs?: number;
  onRetry?: () => Promise<void> | void;
  showSkeleton?: boolean;
  debug?: boolean;
  debugSnapshot?: Record<string, any>;
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title,
  message,
  tips = DEFAULT_TIPS,
  longLoadMs = 4000,
  onRetry,
  showSkeleton,
  debug = false,
  debugSnapshot,
}) => {
  const [tookLong, setTookLong] = useState(false);
  const [showDebug, setShowDebug] = useState(debug);
  const online = useOnlineStatus();
  const tip = useRotatingText(tips, 2400);

  useEffect(() => {
    const t = setTimeout(() => setTookLong(true), longLoadMs);
    return () => clearTimeout(t);
  }, [longLoadMs]);

  // Keyboard shortcut to toggle debug
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d") setShowDebug((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleRetry = async () => {
    try {
      await onRetry?.();
    } finally {
      if (!onRetry) window.location.reload();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900" aria-busy>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="mx-4 flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border border-gray-200/60 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-900/70"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" variant="ring" />
            {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>}
            {message && (
              <p className="max-w-prose text-center text-sm text-gray-600 dark:text-gray-300">{message}</p>
            )}
          </div>

          {/* Linear progress sweep */}
          <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-500"
              initial={{ x: "-100%" }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              aria-hidden
            />
          </div>

          {/* Status rows */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {online ? "Online" : "Offline"} • {new Date().toLocaleTimeString()}
            </div>
            <RotatingHint text={tip} />
          </div>

          {/* Long-load guidance */}
          {tookLong && (
            <div className="mt-2 flex w-full flex-col items-center gap-3 border-t border-gray-200 pt-4 text-center dark:border-gray-800">
              {!online && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You appear to be offline. Check your connection and try again.
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This is taking longer than expected. You can retry safely.
              </p>
              <button
                onClick={handleRetry}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-white dark:text-gray-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Debug panel */}
          {showDebug && (
            <div className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-950">
              <div className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Debug</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">{JSON.stringify(debugSnapshot, null, 2)}</pre>
              <div className="mt-2 text-[10px] text-gray-500">Press "d" to toggle</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Optional skeleton backdrop to suggest layout */}
      {showSkeleton && <SkeletonBackdrop />}
    </div>
  );
};

// ---------------------
// Enhanced Spinner
// ---------------------

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  message?: string;
  variant?: "ring" | "dots" | "wave" | "logo";
  className?: string;
};

/**
 * Accessible, theme-aware Spinner with variants:
 * - ring (SVG gradient arc)
 * - dots (three bouncing dots)
 * - wave (equalizer style)
 * - logo (slot for small brand mark)
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  message,
  variant = "ring",
  className = "",
}) => {
  const sizeMap = {
    sm: { wrapper: "w-6 h-6", svg: "w-6 h-6", stroke: 3, text: "text-sm" },
    md: { wrapper: "w-10 h-10", svg: "w-10 h-10", stroke: 4, text: "text-sm" },
    lg: { wrapper: "w-16 h-16", svg: "w-16 h-16", stroke: 5, text: "text-base" },
  } as const;
  const s = sizeMap[size];
  const ariaLabel = message ? message : "Loading";

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div
        className={`flex items-center justify-center ${s.wrapper} rounded-full shadow-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm`}
      >
        {variant === "ring" && (
          <svg
            className={`${s.svg} motion-safe:animate-spin motion-reduce:animate-none`}
            viewBox="0 0 50 50"
            aria-hidden="true"
            style={{ animationDuration: "900ms" }}
          >
            <defs>
              <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <circle cx="25" cy="25" r="20" fill="none" stroke="#e6e6e6" strokeWidth={s.stroke} />
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="url(#spinner-gradient)"
              strokeWidth={s.stroke}
              strokeLinecap="round"
              strokeDasharray="90 150"
            />
          </svg>
        )}

        {variant === "dots" && (
          <div className="flex items-end gap-1 px-2" aria-hidden>
            <span className="inline-block h-2 w-2 rounded-full bg-gray-600 motion-safe:animate-bounce motion-reduce:animate-pulse dark:bg-gray-200" />
            <span
              className="inline-block h-2 w-2 rounded-full bg-gray-500 motion-safe:animate-bounce motion-reduce:animate-pulse dark:bg-gray-300"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="inline-block h-2 w-2 rounded-full bg-gray-400 motion-safe:animate-bounce motion-reduce:animate-pulse dark:bg-gray-400"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}

        {variant === "wave" && (
          <div className="flex items-end gap-1 px-2" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="inline-block w-1.5 rounded bg-gray-600 dark:bg-gray-300"
                style={{ height: "6px", animation: "wave 1s ease-in-out infinite", animationDelay: `${i * 100}ms` }}
              />
            ))}
            <style>{`@keyframes wave { 0%, 100% { transform: scaleY(0.6) } 50% { transform: scaleY(1.4) } }`}</style>
          </div>
        )}

        {variant === "logo" && (
          // small slot for an app logo — replace path with your logo
          <svg
            className={`${s.svg} motion-safe:animate-spin motion-reduce:animate-none`}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ animationDuration: "1000ms" }}
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="#c7d2fe" strokeWidth="2" />
            <path d="M6 12a6 6 0 0112 0" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}

        {/* Motion-reduced fallback: accessible label only */}
        <span className="sr-only">{ariaLabel}</span>
      </div>

      {message && (
        <div className={`flex flex-col items-center gap-1 ${s.text}`}>
          <span className="font-medium text-gray-700 dark:text-gray-100">{message}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------
// Small utilities
// ---------------------

const DEFAULT_TIPS = [
  "We rotate your token and check roles.",
  "Sessions are encrypted at rest.",
  "Hitting the auth gateway…",
  "Almost there — prepping your dashboard.",
];

function useDelayedMount(active: boolean, delayMs: number) {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setMounted(true), delayMs);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [active, delayMs]);
  return mounted;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useRotatingText(items: string[], intervalMs = 2400) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [items, intervalMs]);
  return items[index] ?? "";
}

const RotatingHint: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="h-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 0.9, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const SkeletonBackdrop: React.FC = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid grid-cols-6 gap-3 p-8 opacity-60">
      {[...Array(18)].map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
};

export default AuthGuard;

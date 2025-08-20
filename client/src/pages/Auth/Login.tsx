import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { loginUser } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import React, { useId, useRef, useEffect, useMemo } from "react";

// Tokens
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";

// FXDefs and Backdrop
const FXDefs = React.memo(function FXDefs() {
  const uid = useId().replace(/:/g, "");
  const gooId = `indigo-goo-${uid}`;
  const glowId = `soft-glow-${uid}`;

  return (
    <svg className="absolute pointer-events-none w-0 h-0">
      <defs>
        <filter id={gooId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>

        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <desc data-goo-id={gooId} data-glow-id={glowId} />
    </svg>
  );
});

function ParticleFieldCSS({ count = 14, glowId }: { count?: number; glowId?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        d: Math.random() * 3 + 3,
        delay: Math.random() * 3,
      })),
    [count]
  );

  return (
    <div ref={ref} className="absolute inset-0">
      {particles.map((p) => (
        <span
          key={p.id}
          className="gpu absolute rounded-full bg-white/70 animate-floatY"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            filter: glowId ? `url(#${glowId})` : undefined,
            animationDuration: `${p.d}s`,
            animationDelay: `${p.delay}s`,
            animationPlayState: playing ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}

const IndigoBackdrop = React.memo(function IndigoBackdrop({
  reduceMotion = false,
  playing = true,
}: {
  reduceMotion?: boolean;
  playing?: boolean;
}) {
  const svg = document?.querySelector("desc[data-goo-id]") as HTMLElement | null;
  const gooId = svg?.getAttribute("data-goo-id") ?? undefined;
  const glowId = svg?.getAttribute("data-glow-id") ?? undefined;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px]">
      <div
        className="absolute inset-0 mix-blend-screen"
        style={gooId ? { filter: `url(#${gooId})` } : undefined}
      >
        <div
          className={`gpu absolute top-[-10%] left-[12%] h-[18rem] w-[18rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.6),transparent_70%)] ${
            playing && !reduceMotion ? "animate-slow-float" : ""
          }`}
        />
        <div
          className={`gpu absolute bottom-[-10%] right-[12%] h-[22rem] w-[22rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(34,211,238,0.35),transparent_70%)] ${
            playing && !reduceMotion ? "animate-slower-float" : ""
          }`}
        />
      </div>
      <div
        className="gpu absolute bottom-[-14%] left-1/2 h-[38vh] w-[140vw] -translate-x-1/2 origin-top"
        style={{ transform: "rotateX(60deg) translateZ(-100px)" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      {!reduceMotion && <ParticleFieldCSS count={14} glowId={glowId} />}
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,white_1px,transparent_1.2px)] [background-size:18px_18px]" />
    </div>
  );
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await loginUser({ email, password });
      login(response.token, response.user);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`Redirecting to ${provider} authentication...`);
  };

  return (
<div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
      <FXDefs />
      <IndigoBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass border-white/20 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <ArrowRight className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className={`text-3xl font-bold mb-2 ${h1Grad}`}>Welcome Back</h1>
              <p className={subText}>Sign in to access your account</p>
            </div>

            <div className="space-y-3 mb-6">
              <Button
                variant="outline"
                className={`${gradientOutline} w-full`}
                onClick={() => handleSocialLogin("Google")}
              >
                <Chrome className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className={`${gradientOutline} w-full`}
                onClick={() => handleSocialLogin("GitHub")}
              >
                <Github className="w-4 h-4 mr-2" />
                Continue with GitHub
              </Button>
            </div>

            <div className="relative mb-6">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className={`${filledBtn} w-full`}
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Don't have an account? {" "}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
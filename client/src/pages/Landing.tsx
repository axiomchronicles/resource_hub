import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useReducedMotion,
  useMotionTemplate,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Aurora from "@/components/Aurora";
import {
  Sparkles,
  Rocket,
  Star,
  ShieldCheck,
  CloudDownload,
  Search,
  FileText,
  Zap,
  Layers,
  Users,
  Plug,
  Globe,
  Check,
  Github,
  ArrowRight,
  Eye,
  Download,
  Sun,
  Moon,
  FolderOpen,
  Wand2,
  Keyboard,
  History,
  Link2,
  Menu,
  X,
} from "lucide-react";

/**
 * LandingPage — extra-polished, animated, and fully responsive.
 * Upgrades in this version:
 * - Aurora 2.0: layered conic/radial blends with parallax on scroll + pointer, subtle indigo bias.
 * - TiltCard 2.0: springy 3D tilt with perspective + dynamic glare + gradient border + touch-safe fallback.
 * - Ultra responsive: fluid type via clamp(), tighter grids, safe-area padding, mobile nav, reduced-motion support.
 */

/* ------------------------- Dark-mode controller ------------------------- */
function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t") setTheme((t) => (t === "dark" ? "light" : "dark"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { theme, setTheme };
}

/* ------------------------------ Hooks ------------------------------ */
function usePointerParallax() {
  // returns normalized pointer values in [-0.5, 0.5]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  useEffect(() => {
    const canPointer = matchMedia("(pointer: fine)").matches;
    if (!canPointer) return; // avoid listeners on touch-only devices
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      px.set(x);
      py.set(y);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [px, py]);

  return { px, py };
}

/* ------------------------- Reusable micro components ------------------------- */
const SectionHeader: React.FC<{
  label: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  center?: boolean;
}> = ({ label, title, subtitle, center }) => (
  <div className={center ? "text-center max-w-3xl mx-auto" : "max-w-3xl"}>
    <Badge className="rounded-full px-3 py-1 text-xs bg-primary/10 text-primary border border-primary/20">
      {label}
    </Badge>
    <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-tight text-balance">{title}</h2>
    {subtitle && <p className="mt-3 text-muted-foreground leading-relaxed text-pretty">{subtitle}</p>}
  </div>
);

const Glow: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]`}
  >
    <div
      className={`absolute aspect-square w-[90vw] md:w-[55vw] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-indigo-500/50 via-fuchsia-500/40 to-cyan-400/40 dark:from-indigo-500/40 dark:via-fuchsia-600/40 dark:to-cyan-500/40 ${className}`}
    />
  </div>
);

/* ------------------------------ TiltCard 2.0 ------------------------------ */
const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // deg
  glare?: boolean;
  scaleOnHover?: number; // e.g. 1.02
}> = ({ children, className = "", maxTilt = 10, glare = true, scaleOnHover = 1.01 }) => {
  const supportsHover = useMemo(() => (typeof window !== "undefined" ? matchMedia("(hover: hover) and (pointer:fine)").matches : false), []);
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rX = useTransform(y, [-40, 40], [maxTilt, -maxTilt]);
  const rY = useTransform(x, [-40, 40], [-maxTilt, maxTilt]);
  const springRX = useSpring(rX, { stiffness: 180, damping: 16, mass: 0.6 });
  const springRY = useSpring(rY, { stiffness: 180, damping: 16, mass: 0.6 });
  const scale = useSpring(1, { stiffness: 200, damping: 18 });

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const glareGradient = useMotionTemplate`radial-gradient(200px 200px at ${mx * 100}% ${my * 100}%, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 60%)`;

  const onMove = (e: React.MouseEvent) => {
    if (!supportsHover) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const nx = (e.clientX - rect.left) / rect.width; // [0,1]
    const ny = (e.clientY - rect.top) / rect.height; // [0,1]
    x.set(Math.max(-40, Math.min(40, dx)));
    y.set(Math.max(-40, Math.min(40, dy)));
    mx.set(nx);
    my.set(ny);
    if (!reduceMotion) scale.set(scaleOnHover);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
    mx.set(0.5);
    my.set(0.5);
    scale.set(1);
  };

  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX: supportsHover ? springRX : 0, rotateY: supportsHover ? springRY : 0, scale }}
        className={`relative transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10 rounded-2xl border bg-card/60 backdrop-blur ${className}`}
      >
        {/* gradient border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            padding: 1,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor" as any,
            maskComposite: "exclude" as any,
            background: "conic-gradient(from 120deg at 50% 50%, rgba(99,102,241,0.35), rgba(236,72,153,0.35), rgba(34,211,238,0.35), rgba(99,102,241,0.35))",
          }}
        />
        {/* glossy highlight / glare */}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ backgroundImage: glareGradient, mixBlendMode: "soft-light" }}
          />
        )}
        {/* subtle top-left sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.00) 60%)",
            maskImage: "radial-gradient(150%_150% at 0% 0%, black 30%, transparent 60%)",
          }}
        />
        {children}
      </motion.div>
    </div>
  );
};

const StatChip: React.FC<{ icon: React.ReactNode; value: string | number; label: string }> = ({ icon, value, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs">
    <span className="opacity-70">{icon}</span>
    <span className="font-semibold">{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-xs">
    {icon}
    <span>{children}</span>
  </div>
);

/* ------------------------------ Main page ------------------------------ */
export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
<div className="relative min-h-screen overflow-x-hidden [padding-inline:clamp(0rem,env(safe-area-inset-left),0rem)] bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
      <Aurora />

      {/* Scroll progress bar */}
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400"
        style={{ scaleX }}
      />

      {/* Floating FREE ribbon */}
      <div className="pointer-events-none fixed right-[-60px] top-14 z-40 rotate-45 select-none hidden sm:block">
        <div className="rounded-none bg-emerald-500 text-white px-16 py-1 text-xs font-bold shadow-md">
          COMPLETELY FREE
        </div>
      </div>

      {/* Subtle global glows */}
      <Glow className="-top-32 -left-20" />
      <Glow className="bottom-10 right-[-10vw]" />

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">NoteHub</span>
            <Badge variant="outline" className="hidden sm:inline-flex ml-2">100% Free</Badge>
            <Badge className="hidden md:inline-flex ml-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Open & Private</Badge>
          </div>

          {/* desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost">Pricing</Button>
            <Button variant="ghost">Docs</Button>
            <Button variant="outline" className="gap-2">
              <Github className="h-4 w-4" /> Star us
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow hover:shadow-lg">
              Launch app <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              aria-label="Toggle theme"
              variant="outline"
              size="icon"
              className="ml-1"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle dark mode (T)"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          {/* mobile */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              aria-label="Toggle theme"
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle dark mode (T)"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} aria-controls="mobile-menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>
        {/* mobile menu panel */}
        <div id="mobile-menu" className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${mobileOpen ? "max-h-48" : "max-h-0"}`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-3 flex flex-col gap-2">
            <Button variant="ghost" className="justify-start">Pricing</Button>
            <Button variant="ghost" className="justify-start">Docs</Button>
            <Button variant="outline" className="gap-2 justify-start w-full">
              <Github className="h-4 w-4" /> Star us
            </Button>
            <Button className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white w-full">
              Launch app <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 pb-8">
        <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">100% Free Forever</Badge>
              <Badge variant="outline" className="border-dashed">No ads • No tracking</Badge>
              <Badge variant="outline" className="border-dashed">Unlimited previews</Badge>
            </div>
            <h1 className="mt-4 text-[clamp(2rem,6vw,3.75rem)] leading-[1.08] font-extrabold tracking-tight text-balance">
              Study smarter with a
              <span className="relative ml-2 inline-block">
                <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
                  beautiful notes hub
                </span>
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground text-pretty">
              Upload, preview, search, organize, rate, and download course materials — fast. Built for students and educators,
              optimized for focus, and <span className="font-semibold text-emerald-600 dark:text-emerald-400">free forever</span>.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow hover:shadow-lg">Start for Free <Rocket className="h-4 w-4" /></Button>
              <Button variant="outline" className="w-full sm:w-auto gap-2">Browse Notes <Search className="h-4 w-4" /></Button>
              <div className="flex w-full sm:w-auto items-center gap-3 pl-1">
                <StatChip icon={<Eye className="h-3.5 w-3.5" />} value={"1.2M+"} label="views" />
                <StatChip icon={<Download className="h-3.5 w-3.5" />} value={"480k+"} label="downloads" />
                <StatChip icon={<Star className="h-3.5 w-3.5" />} value={"4.8"} label="avg rating" />
              </div>
            </div>

            {/* Feature marquee */}
            <div className="mt-6 overflow-hidden">
              <motion.div
                className="flex gap-2 whitespace-nowrap"
                initial={{ x: 0 }}
                animate={{ x: [0, -600] }}
                transition={{ duration: 18, ease: "linear", repeat: Infinity }}
              >
                {[...MARQUEE, ...MARQUEE].map((m, i) => (
                  <Pill key={i} icon={m.icon}>{m.label}</Pill>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Mock preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="relative lg:col-span-6"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-indigo-500/15 via-fuchsia-500/15 to-cyan-400/15 blur-2xl" />
            <TiltCard className="p-2">
              <div className="rounded-[1.2rem] border bg-card p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="rounded-full">PDF</Badge>
                    <span className="font-medium">Signals & Systems — Midterm Notes</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> 2,319</div>
                    <div className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> 842</div>
                    <div className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" /> 4.9</div>
                  </div>
                </div>
                <div className="mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border bg-muted/40" />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Upload", "Preview", "Organize", "Download"].map((t, i) => (
                    <div key={i} className="rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm">
                      <span className="font-medium">{t}</span>
                      <p className="text-muted-foreground">One click {t.toLowerCase()}.</p>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* Why Free */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <SectionHeader
          center
          label="Why it's free"
          title={
            <>
              Built for students — <span className="bg-gradient-to-r from-emerald-500 to-cyan-400 bg-clip-text text-transparent">free forever</span>
            </>
          }
          subtitle="We believe access to quality study materials should be universal. No subscriptions, no paywalls, and no ads. Optional donations and future add-ons keep the lights on without compromising your learning experience."
        />

        <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
          {FREE_POINTS.map((p, i) => (
            <TiltCard key={i} className="h-full">
              <div className="p-5">
                <div className="mb-2 inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> {p.kicker}</div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <SectionHeader
          center
          label="Everything you need"
          title={
            <>
              Powerful features. <span className="whitespace-nowrap">Zero friction.</span>
            </>
          }
          subtitle="Modern workflows that feel effortless and fast."
        />

        <div className="mt-8 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <TiltCard className="h-full">
                <Card className="h-full border-0 bg-transparent">
                  <CardHeader className="space-y-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background/80">
                      {f.icon}
                    </div>
                    <CardTitle>{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {f.points.map((p, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <Check className="mt-[2px] h-4 w-4 text-emerald-500" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader center label="Get productive in minutes" title="How it works" subtitle="A simple, joyful flow from upload to download." />

        <div className="mt-8 grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative"
            >
              <TiltCard className="h-full">
                <div className="p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                    <Badge variant="outline" className="rounded-full">Step {i + 1}</Badge>
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-muted-foreground">{s.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader center label="Why switch" title="Compare at a glance" subtitle="We keep it simple: generous free plan without compromises." />

        <div className="mt-8 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-12 bg-muted/50 text-sm">
            <div className="col-span-6 p-3 font-medium">Feature</div>
            <div className="col-span-3 p-3 text-center font-medium">NoteHub (Free)</div>
            <div className="col-span-3 p-3 text-center font-medium">Others</div>
          </div>
          {COMPARE.map((row, i) => (
            <div key={i} className="grid grid-cols-12 border-t text-sm">
              <div className="col-span-6 p-3">{row.label}</div>
              <div className="col-span-3 p-3 text-center">{row.us}</div>
              <div className="col-span-3 p-3 text-center text-muted-foreground">{row.them}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader center label="Pricing" title="Free today, free tomorrow" subtitle="No credit card. No trial. Just great tools." />
        <div className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Free */}
          <TiltCard>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Free Forever</h3>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Best Value</Badge>
              </div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight">$0</div>
              <p className="text-sm text-muted-foreground">Everything you need to study and share.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <Button className="mt-5 w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow hover:shadow-lg">Create Free Account <Rocket className="h-4 w-4" /></Button>
            </div>
          </TiltCard>
          {/* Pro placeholder */}
          <TiltCard>
            <div className="p-6 opacity-70">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Pro</h3>
                <Badge variant="outline">Coming soon</Badge>
              </div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight">$—</div>
              <p className="text-sm text-muted-foreground">Advanced collaboration for teams.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4" /> {f}</li>
                ))}
              </ul>
              <Button variant="outline" className="mt-5 w-full">Notify me</Button>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader center label="Loved by students" title="What users say" subtitle="A few words from our community." />
        <div className="mt-8 grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <TiltCard>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/70 to-fuchsia-500/70 grid place-items-center text-white">{t.avatar}</div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
                  <div className="mt-2 flex items-center gap-1 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader center label="Questions" title="FAQ" subtitle="Everything you might want to know." />
        <Accordion type="single" collapsible className="mt-6">
          <AccordionItem value="f1">
            <AccordionTrigger>Is it really free forever?</AccordionTrigger>
            <AccordionContent>
              Yes. We rely on optional donations and future, clearly-marked add-ons — never paywalls or ads. Core features stay free.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="f2">
            <AccordionTrigger>Do you track me or sell my data?</AccordionTrigger>
            <AccordionContent>
              No. We keep analytics minimal and anonymous. Files remain private to you unless you choose to share them.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="f3">
            <AccordionTrigger>What file types are supported?</AccordionTrigger>
            <AccordionContent>
              PDF, images, videos, PPTX, DOCX, XLSX and more. Quick previews for most common formats.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="f4">
            <AccordionTrigger>How do ratings work?</AccordionTrigger>
            <AccordionContent>
              Anyone signed in can rate 1–5 stars. We show the average and total count, helping surface the best notes.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="f5">
            <AccordionTrigger>Can I organize into folders or collections?</AccordionTrigger>
            <AccordionContent>
              Yes. Use Collections to group notes by course, semester, or any custom taxonomy.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden rounded-2xl border">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/15 to-cyan-400/15" />
          <div className="relative grid gap-6 p-6 md:grid-cols-3 md:items-center md:p-10">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold tracking-tight text-balance">Ready to supercharge your studying?</h3>
              <p className="mt-1 text-muted-foreground text-pretty">
                Join thousands of learners using NoteHub every day — it's <strong>completely free</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
              <Button className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow hover:shadow-lg">Create a Free Account <Rocket className="h-4 w-4" /></Button>
              <Button variant="outline" className="gap-2">Browse Library <Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:px-8 py-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-semibold">NoteHub</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">A fast, friendly platform for sharing notes. Free forever.</p>
          </div>
          <div>
            <div className="text-sm font-semibold">Product</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Features</li>
              <li>Docs</li>
              <li>Changelog</li>
              <li>Roadmap</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Community</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>GitHub</li>
              <li>Discord</li>
              <li>Twitter</li>
              <li>Support</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Legal</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} NoteHub. Built with ❤️ for students.</div>
      </footer>
    </div>
  );
}

/* ------------------------------ Data ------------------------------ */
const FEATURES = [
  {
    icon: <CloudDownload className="h-5 w-5" />,
    title: "Fast uploads & downloads",
    desc: "Optimized for large lecture decks and handouts.",
    points: ["Chunked uploads for reliability", "Clever caching for speed", "Resume-friendly downloads"],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Lightning search",
    desc: "Find the right note instantly.",
    points: ["Fuzzy matching across title, tags, subject", "Filter by semester and type", "Smart ranking by quality"],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Beautiful previews",
    desc: "Crisp inline viewers for PDFs, images & videos.",
    points: ["Sandboxed embeds for safety", "Keyboard navigation & zoom", "Graceful fallbacks"],
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Ratings & reviews",
    desc: "Help the best notes rise to the top.",
    points: ["1–5 star system", "Weighted averages", "Per-user rating memory"],
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Privacy-first",
    desc: "No ads. Minimal analytics. Your data is yours.",
    points: ["Local previews when possible", "Explicit sharing controls", "Secure file headers"],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Multi-format support",
    desc: "PDF, PPTX, DOCX, XLSX, images, video and more.",
    points: ["Auto MIME detection", "Smart file labeling", "Quick open with one click"],
  },
  {
    icon: <Plug className="h-5 w-5" />,
    title: "API friendly",
    desc: "Clean endpoints for search, ratings and downloads.",
    points: ["RESTful design", "Pagination & ordering", "Auth tokens supported"],
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Snappy performance",
    desc: "Lean UI with buttery-smooth animations.",
    points: ["Framer Motion micro-interactions", "GPU-accelerated transforms", "Optimized images"],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Works everywhere",
    desc: "Responsive layouts for phones, tablets and desktops.",
    points: ["Accessible color contrast", "Keyboard friendly", "RTL-ready base styles"],
  },
  {
    icon: <FolderOpen className="h-5 w-5" />,
    title: "Collections & folders",
    desc: "Organize by course, semester, or custom tags.",
    points: ["Drag to sort", "Shareable collections", "Granular privacy"],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Collaboration",
    desc: "Build study libraries together.",
    points: ["Invite classmates", "Role-based access", "Public profiles"],
  },
  {
    icon: <History className="h-5 w-5" />,
    title: "Version history",
    desc: "Keep track of updates over time.",
    points: ["Restore older files", "Change notes", "At-a-glance diffs"],
  },
];

const FREE_POINTS = [
  { kicker: "No credit card", title: "Free by design", desc: "Core features will always be free. Education shouldn’t be paywalled." },
  { kicker: "Sustainable", title: "Community-backed", desc: "Optional donations and ethical add-ons keep the project healthy." },
  { kicker: "Open culture", title: "Transparent roadmap", desc: "You can see what we're building and suggest features." },
];

const STEPS = [
  { icon: <UploadIcon />, title: "Upload", desc: "Drop a file or paste a link. We detect type and size automatically." },
  { icon: <PreviewIcon />, title: "Preview", desc: "Open instantly in the viewer with zoom and page navigation." },
  { icon: <RateDownloadIcon />, title: "Rate & Download", desc: "Leave a quick rating, then save locally with a single click." },
];

const COMPARE = [
  { label: "Storage limits", us: "Generous", them: "Tight" },
  { label: "Ads / popups", us: "None", them: "Often" },
  { label: "Price", us: "Free forever", them: "Subscription" },
  { label: "Preview quality", us: "High", them: "Mixed" },
  { label: "Privacy", us: "Strong", them: "Variable" },
];

const FREE_FEATURES = [
  "Unlimited previews",
  "Fast downloads",
  "Smart search & filters",
  "Ratings & reviews",
  "Collections & folders",
  "Mobile friendly",
  "Privacy-first defaults",
];

const PRO_FEATURES = [
  "Team workspaces",
  "Advanced permissions",
  "Bulk actions",
  "Priority processing",
];

const TESTIMONIALS = [
  { name: "Aisha R.", role: "EE Undergrad", avatar: "AR", quote: "The previews are crisp and the rating system actually helps me find the best summaries before exams." },
  { name: "Vikram P.", role: "TA • CS", avatar: "VP", quote: "Upload → share → done. My class finally has a single hub for everything — and it’s free." },
  { name: "Maya K.", role: "Med Student", avatar: "MK", quote: "Super fast on mobile. I love the no-ads policy and the dark mode for late-night study sessions." },
];

const MARQUEE = [
  { icon: <Wand2 className="h-3.5 w-3.5" />, label: "Gorgeous previews" },
  { icon: <Search className="h-3.5 w-3.5" />, label: "Lightning search" },
  { icon: <FolderOpen className="h-3.5 w-3.5" />, label: "Collections" },
  { icon: <Users className="h-3.5 w-3.5" />, label: "Collaboration" },
  { icon: <Keyboard className="h-3.5 w-3.5" />, label: "Keyboard shortcuts" },
  { icon: <History className="h-3.5 w-3.5" />, label: "Version history" },
  { icon: <Link2 className="h-3.5 w-3.5" />, label: "Share links" },
  { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Privacy-first" },
];

/* ------------------------------ Inline Icons ------------------------------ */
function UploadIcon() {
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/80">
      <CloudDownload className="h-4 w-4" />
    </div>
  );
}
function PreviewIcon() {
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/80">
      <Eye className="h-4 w-4" />
    </div>
  );
}
function RateDownloadIcon() {
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/80">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500" />
        <Download className="h-4 w-4" />
      </div>
    </div>
  );
}

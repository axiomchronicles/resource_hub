import React, { Suspense, lazy, memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, useMotionValue, useTransform, useReducedMotion } from "framer-motion";
import {
  FileText,
  Presentation,
  ScrollText,
  PlayCircle,
  TrendingUp,
  Users,
  Download,
  Star,
  ArrowRight,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { QuickPreviewDrawer } from "@/components/QuickPreviewDrawer";
import { useAppStore } from "@/stores/appStore";

// Lazy load heavy visual component
const Aurora = lazy(() => import("@/components/Aurora"));

/* -------------------------------------------------------------------------- */
/*                                   DATA                                     */
/* -------------------------------------------------------------------------- */
const categories = [
  { title: "Notes", description: "Study materials and lecture notes", icon: FileText, href: "/notes", count: "2,450+", color: "from-indigo-500 to-indigo-600" },
  { title: "PPTs", description: "Presentations and slide decks", icon: Presentation, href: "/ppts", count: "1,280+", color: "from-violet-500 to-indigo-600" },
  { title: "Past Papers", description: "Previous year question papers", icon: ScrollText, href: "/past-papers", count: "890+", color: "from-blue-500 to-indigo-600" },
  { title: "Tutorials", description: "Video guides and how-tos", icon: PlayCircle, href: "/tutorials", count: "560+", color: "from-sky-500 to-indigo-600" }
];

const trendingResources = [
  { title: "Data Structures & Algorithms", type: "Notes", downloads: 1240, rating: 4.9, subject: "Computer Science" },
  { title: "Machine Learning Basics", type: "PPT", downloads: 980, rating: 4.8, subject: "Computer Science" },
  { title: "Database Systems 2023", type: "Paper", downloads: 760, rating: 4.7, subject: "Computer Science" }
];

const stats = [
  { label: "Resources", value: "5,180+" },
  { label: "Students", value: "12,000+" },
  { label: "Downloads", value: "45,000+" },
  { label: "Universities", value: "50+" }
];

/* -------------------------------------------------------------------------- */
/*                              THEME / UTILITIES                              */
/* -------------------------------------------------------------------------- */
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white w-full sm:w-auto shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";

// Gradient-like outline (theme-aware)
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";

// Prefers-color-scheme friendly text helpers
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";

// Small hook to detect coarse pointers (mobile/tablet) to disable hover-heavy effects
function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(pointer: coarse)");
      const set = () => setIsCoarse(mq.matches);
      set();
      try { mq.addEventListener("change", set); } catch { mq.addListener(set); }
      return () => { try { mq.removeEventListener("change", set); } catch { mq.removeListener(set); } };
    }
  }, []);
  return isCoarse;
}

/* -------------------------------------------------------------------------- */
/*                               SVG FILTER DEFS                               */
/* -------------------------------------------------------------------------- */
const FXDefs = memo(function FXDefs() {
  const uid = useId().replace(/:/g, "");
  const gooId = `indigo-goo-${uid}`;
  const glowId = `soft-glow-${uid}`;
  return (
    <svg className="absolute pointer-events-none w-0 h-0">
      <defs>
        <filter id={gooId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
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
      {/* Expose ids to children via data attributes */}
      <desc data-goo-id={gooId} data-glow-id={glowId} />
    </svg>
  );
});

/* -------------------------------------------------------------------------- */
/*                             LIGHTWEIGHT BACKDROP                            */
/* -------------------------------------------------------------------------- */
const IndigoScene = memo(function IndigoScene({ reduceMotion = false }) {
  // Read the ids from <FXDefs/>
  const svg = document?.querySelector("desc[data-goo-id]") as HTMLElement | null;
  const gooId = svg?.getAttribute("data-goo-id") ?? undefined;
  const glowId = svg?.getAttribute("data-glow-id") ?? undefined;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px]">
      {/* Gooey gradient blobs (reduced to 2, CSS animated) */}
      <div className="absolute inset-0 mix-blend-screen" style={gooId ? { filter: `url(#${gooId})` } : undefined}>
        <div className="gpu absolute top-[-10%] left-[12%] h-[22rem] w-[22rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.65),transparent_70%)] animate-slow-float" />
        <div className="gpu absolute bottom-[-8%] right-[12%] h-[24rem] w-[24rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(34,211,238,0.4),transparent_70%)] animate-slower-float" />
      </div>

      {/* Static, super-low-cost grid plane (no opacity animation) */}
      <div className="gpu absolute bottom-[-12%] left-1/2 h-[50vh] w-[140vw] -translate-x-1/2 origin-top" style={{ transform: "rotateX(60deg) translateZ(-100px)" }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Particle field (CSS-only, 16 dots) */}
      {!reduceMotion && <ParticleFieldCSS count={16} glowId={glowId} />}

      {/* Subtle star texture */}
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,white_1px,transparent_1.2px)] [background-size:18px_18px]" />
    </div>
  );
});

function ParticleFieldCSS({ count = 16, glowId }: { count?: number; glowId?: string }) {
  const particles = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 1,
    d: Math.random() * 3 + 3,
    delay: Math.random() * 3,
  })), [count]);
  return (
    <div className="absolute inset-0">
      {particles.map((p) => (
        <span
          key={p.id}
          className="gpu absolute rounded-full bg-white/70 animate-floatY"
          style={{ top: `${p.top}%`, left: `${p.left}%`, width: p.size, height: p.size, filter: glowId ? `url(#${glowId})` : undefined, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             INTERACTION HELPERS                             */
/* -------------------------------------------------------------------------- */
const Tilt = memo(function Tilt({ children, intensity = 8, disabled = false }) {
  if (disabled) return <div>{children}</div>;
  return (
    <m.div whileHover={{ rotateX: intensity, rotateY: -intensity, y: -8 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} style={{ transformStyle: "preserve-3d", perspective: 900 }}>
      {children}
    </m.div>
  );
});

const Magnetic = memo(function Magnetic({ children, radius = 10, disabled = false }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relX = e.clientX - (r.left + r.width / 2);
    const relY = e.clientY - (r.top + r.height / 2);
    mx.set((relX / (r.width / 2)) * radius);
    my.set((relY / (r.height / 2)) * radius);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  if (disabled) return <div>{children}</div>;
  return (
    <m.div onMouseMove={onMove} onMouseLeave={onLeave} className="inline-block">
      <m.div style={{ x: mx, y: my }}>{children}</m.div>
    </m.div>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */
export default function Home() {
  const { setPreviewResource, previewResource } = useAppStore();
  const reduceMotion = useReducedMotion();
  const isCoarse = useIsCoarsePointer();

  // Hero micro-tilt with rAF throttling
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rX = useTransform(mouseY, [0, 1], [6, -6]);
  const rY = useTransform(mouseX, [0, 1], [-6, 6]);
  const frame = useRef<number | null>(null);

  const onHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion || isCoarse) return; // skip on low-motion or touch
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      mouseX.set((e.clientX - r.left) / r.width);
      mouseY.set((e.clientY - r.top) / r.height);
    });
  };
  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  return (
    <LazyMotion features={domAnimation}>
      {/* Local keyframes (no Tailwind config needed) */}
      <style>{`
        .gpu{will-change:transform,opacity;transform:translateZ(0)}
        @keyframes floatY{0%,100%{transform:translateY(0);opacity:.6}50%{transform:translateY(-12px);opacity:1}}
        .animate-floatY{animation:floatY 5s ease-in-out infinite}
        @keyframes slowFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(20px)}}
        .animate-slow-float{animation:slowFloat 16s ease-in-out infinite}
        .animate-slower-float{animation:slowFloat 22s ease-in-out infinite}
        @keyframes gradX{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .animate-gradX{animation:gradX 12s linear infinite}
      `}</style>

      <div className="min-h-screen relative bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
        <FXDefs />
        {/* Light, lazy background visuals */}
        {!reduceMotion && (
          <IndigoScene reduceMotion={reduceMotion} />
        )}

        {/* Aurora is heavy: lazy-load & only render on large screens */}
        <Suspense fallback={null}>
          {!reduceMotion && !isCoarse && <Aurora />}
        </Suspense>

        {/* Hero Section */}
        <section className="relative min-h-[86vh] flex items-center justify-center overflow-hidden" onMouseMove={onHeroMouseMove}>
          <m.div className="relative z-10 text-center max-w-4xl mx-auto px-4 transform-gpu" style={{ rotateX: rX, rotateY: rY, transformStyle: "preserve-3d" }}>
            <m.h1 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className={`text-5xl md:text-7xl font-extrabold mb-6 leading-tight ${h1Grad} animate-gradX`}>
              <span>Find</span>{" "}
              <span className="text-slate-900 dark:text-indigo-200">Every Resource</span>{" "}
              <span>You Need</span>
            </m.h1>

            <m.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }} className={`text-lg md:text-2xl ${subText} mb-8 leading-relaxed`}>
              Access thousands of study materials, presentations, and past papers
              <br />
              shared by students from top universities
            </m.p>

            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.5 }} className="mb-10">
              <SearchBar size="lg" className="mx-auto" />
            </m.div>

            <m.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.35, duration: 0.5 }} className="flex flex-col sm:flex-row justify-center gap-4 max-w-xl mx-auto">
              <Magnetic disabled={isCoarse || reduceMotion}>
                <Button asChild className={filledBtn}>
                  <Link to="/notes">
                    Browse Resources
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic disabled={isCoarse || reduceMotion}>
                <Button asChild className={filledBtn}>
                  <Link to="/upload">Upload Material</Link>
                </Button>
              </Magnetic>
            </m.div>
          </m.div>

          {/* Two lightweight floating blocks (CSS anims) */}
          {!reduceMotion && (
            <>
              <div className="gpu absolute top-24 left-10 w-20 h-20 rounded-2xl opacity-30 shadow-[0_15px_40px_-10px_rgba(79,70,229,0.6)] bg-gradient-to-br from-indigo-500 to-indigo-700 animate-slow-float" />
              <div className="gpu absolute bottom-24 right-10 w-16 h-16 rounded-2xl opacity-30 shadow-[0_15px_40px_-10px_rgba(99,102,241,0.6)] bg-gradient-to-br from-indigo-400 to-indigo-600 animate-slower-float" />
            </>
          )}
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-black/20 to-transparent dark:via-white/30 opacity-60" />

        {/* Stats Section */}
        <section className="py-16 border-y border-slate-200/40 dark:border-white/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <m.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-300 dark:via-indigo-200 dark:to-cyan-200 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-slate-700 dark:text-indigo-200/75 text-sm md:text-base">{stat.label}</div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-300 dark:to-cyan-200`}>
                Explore by Category
              </h2>
              <p className={`text-xl ${subText}`}>Find exactly what you're looking for</p>
            </m.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Tilt key={category.title} disabled={isCoarse || reduceMotion}>
                    <m.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} whileHover={!isCoarse && !reduceMotion ? { scale: 1.02 } : undefined} className="group relative">
                      <Link to={category.href}>
                        <Card className="relative p-8 h-full glass border-slate-300/40 dark:border-white/15 hover:border-slate-400/60 dark:hover:border-white/30 transition-all duration-300 hover:shadow-strong overflow-hidden">
                          {/* Glow ring */}
                          <div className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(99,102,241,0.25),transparent_30%,rgba(99,102,241,0.25))] blur" />

                          <div className={`relative w-16 h-16 bg-gradient-to-r ${category.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_10px_25px_-10px_rgba(79,70,229,0.75)]`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <h3 className={`text-2xl font-bold mb-3 ${titleText}`}>{category.title}</h3>
                          <p className={`mb-4 ${subText}`}>{category.description}</p>
                          <div className="text-lg font-semibold text-slate-800 dark:text-indigo-300 group-hover:text-slate-900 dark:group-hover:text-indigo-200">
                            {category.count} resources
                          </div>

                          {/* Shine sweep */}
                          <div className="pointer-events-none absolute -inset-[1px] rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute inset-0 translate-x-[-120%] group-hover:translate-x-[120%] duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                          </div>
                        </Card>
                      </Link>
                    </m.div>
                  </Tilt>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="py-20 border-y border-slate-200/40 dark:border-white/10">
          <div className="container mx-auto px-4">
            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-extrabold mb-2 flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-300 dark:to-cyan-200">
                  <TrendingUp className="w-8 h-8 text-indigo-700 dark:text-indigo-300" />
                  Trending This Week
                </h2>
                <p className={`text-xl ${subText}`}>Most popular resources among students</p>
              </div>
              <Magnetic disabled={isCoarse || reduceMotion}>
                <Button asChild className={filledBtn}>
                  <Link to="/trending">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </Magnetic>
            </m.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingResources.map((resource, index) => (
                <Tilt key={resource.title} intensity={6} disabled={isCoarse || reduceMotion}>
                  <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} whileHover={!isCoarse && !reduceMotion ? { scale: 1.02 } : undefined}>
                    <Card className="relative p-6 glass border-slate-300/40 dark:border-white/15 hover:border-slate-400/60 dark:hover:border-white/30 transition-all duration-300 hover:shadow-medium overflow-hidden">
                      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100" />

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg mb-2 ${titleText}`}>{resource.title}</h3>
                          <p className={`text-sm ${subText} mb-2`}>{resource.subject}</p>
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full border border-indigo-400/20">
                            {resource.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-700 dark:text-indigo-200/75">
                          <span className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {resource.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            {resource.rating}
                          </span>
                        </div>
                        <Magnetic disabled={isCoarse || reduceMotion}>
                          <Button size="sm" className={filledBtn} onClick={() =>
                            setPreviewResource({
                              id: resource.title,
                              title: resource.title,
                              type: "pdf",
                              subject: resource.subject,
                              semester: "3rd",
                              author: "Student",
                              authorId: "student1",
                              uploadDate: "2024-01-15",
                              downloadUrl: "/sample.pdf",
                              fileSize: "2.5 MB",
                              downloads: resource.downloads,
                              rating: resource.rating,
                              tags: [resource.type],
                              description: `Preview of ${resource.title}`,
                              difficulty: "Medium",
                            })
                          }>
                            <Search className="w-4 h-4 mr-2" />
                            Quick Preview
                          </Button>
                        </Magnetic>
                      </div>
                    </Card>
                  </m.div>
                </Tilt>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-300 dark:to-cyan-200">
                Ready to Share Your Knowledge?
              </h2>
              <p className={`text-xl ${subText} mb-8`}>
                Join thousands of students contributing to our growing library of academic resources
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                <Magnetic disabled={isCoarse || reduceMotion}>
                  <Button asChild className={filledBtn}>
                    <Link to="/upload">
                      <Users className="w-5 h-5" />
                      Start Contributing
                    </Link>
                  </Button>
                </Magnetic>
                <Magnetic disabled={isCoarse || reduceMotion}>
                  <Button asChild className={filledBtn}>
                    <Link to="/dashboard">View Dashboard</Link>
                  </Button>
                </Magnetic>
              </div>
            </m.div>
          </div>
        </section>

        <QuickPreviewDrawer resource={previewResource} isOpen={!!previewResource} onClose={() => setPreviewResource(null)} />
      </div>
    </LazyMotion>
  );
}

import { useId, useMemo, useRef, useState, useEffect } from "react";
import React from "react";

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

export { FXDefs, IndigoBackdrop, ParticleFieldCSS };
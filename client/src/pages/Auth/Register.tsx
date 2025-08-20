import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Github,
  Chrome,
  GraduationCap,
  Building,
  Calendar,
  Smartphone,
  ImagePlus,
  CheckCircle,
  Info,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

// Indigo + Aurora FX


// ------------------
// Design tokens (shared with Login)
// ------------------
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";


/* ------------------------------ SVG FX & Backdrops ------------------------------ */
const FXDefs = React.memo(function FXDefs() {
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
      <desc data-goo-id={gooId} data-glow-id={glowId} />
    </svg>
  );
});

const IndigoBackdrop = React.memo(function IndigoBackdrop({ reduceMotion = false, playing = true }: { reduceMotion?: boolean; playing?: boolean }) {
  const svg = document?.querySelector("desc[data-goo-id]") as HTMLElement | null;
  const gooId = svg?.getAttribute("data-goo-id") ?? undefined;
  const glowId = svg?.getAttribute("data-glow-id") ?? undefined;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px]">
      <div className="absolute inset-0 mix-blend-screen" style={gooId ? { filter: `url(#${gooId})` } : undefined}>
        <div className={`gpu absolute top-[-10%] left-[12%] h-[18rem] w-[18rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.6),transparent_70%)] ${playing && !reduceMotion ? "animate-slow-float" : ""}`} />
        <div className={`gpu absolute bottom-[-10%] right-[12%] h-[22rem] w-[22rem] rounded-full blur-3xl bg-[radial-gradient(closest-side,rgba(34,211,238,0.35),transparent_70%)] ${playing && !reduceMotion ? "animate-slower-float" : ""}`} />
      </div>
      <div className="gpu absolute bottom-[-14%] left-1/2 h-[38vh] w-[140vw] -translate-x-1/2 origin-top" style={{ transform: "rotateX(60deg) translateZ(-100px)" }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      {!reduceMotion && <ParticleFieldCSS count={14} glowId={glowId} />}
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,white_1px,transparent_1.2px)] [background-size:18px_18px]" />
    </div>
  );
});

function ParticleFieldCSS({ count = 14, glowId }: { count?: number; glowId?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const particles = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i, top: Math.random() * 100, left: Math.random() * 100, size: Math.random() * 2 + 1, d: Math.random() * 3 + 3, delay: Math.random() * 3,
  })), [count]);
  return (
    <div ref={ref} className="absolute inset-0">
      {particles.map((p) => (
        <span key={p.id} className="gpu absolute rounded-full bg-white/70 animate-floatY" style={{ top: `${p.top}%`, left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, filter: glowId ? `url(#${glowId})` : undefined, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s`, animationPlayState: playing ? "running" : "paused" }} />
      ))}
    </div>
  );
}


// ------------------
// Helper hook: useRegisterApi (axios)
// ------------------
export function useRegisterApi() {
  const { toast } = useToast();
  const controllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function buildFormData(payload: Record<string, any> | FormData) {
    if (payload instanceof FormData) return payload;
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    return fd;
  }

  async function register(payload: Record<string, any> | FormData) {
    const url = `${import.meta.env.VITE_API_URL}/auth/register/`;
    const fd = buildFormData(payload);
    setIsLoading(true);
    setError(null);
    setProgress(0);

    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
      controllerRef.current = null;
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await axios.post(url, fd, {
        signal: controller.signal,
        onUploadProgress: (e: ProgressEvent) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
          } else {
            setProgress((p) => Math.min(99, p + 3));
          }
        },
      });

      setIsLoading(false);
      setProgress(100);
      controllerRef.current = null;

      const parsed = response.data;
      toast({
        title: "Success",
        description: typeof parsed === "string" ? parsed : parsed?.message ?? "Registered successfully."
      });

      return parsed; // may include verificationId or other metadata
    } catch (err: any) {
      setIsLoading(false);
      controllerRef.current = null;

      // canceled
      if (axios.isCancel?.(err) || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        const msg = "Upload canceled";
        setError(msg);
        toast({ title: "Canceled", description: msg, variant: "destructive" });
        throw new Error(msg);
      }

      // no response
      if (!err?.response) {
        const msg = err?.message ?? "Network error during upload";
        setError(msg);
        toast({ title: "Network error", description: "Unable to reach the server.", variant: "destructive" });
        throw new Error(msg);
      }

      const status = err.response.status;
      const body = err.response.data; // already a JS object
      const raw = body?.error ?? body?.message ?? `Request failed with status ${status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
          ? raw.join(", ")
          : JSON.stringify(raw, null, 2);

      toast({
        title: "Registration failed",
        description: msg, // now always a string
        variant: "destructive",
      });
      setError(msg);
      throw { status, body };
    }
  }

  function cancel(message?: string) {
    try { controllerRef.current?.abort(); } catch {}
    controllerRef.current = null;
    setIsLoading(false);
    setProgress(0);
    const msg = message ?? "Upload canceled";
    setError(msg);
    toast({ title: "Canceled", description: msg, variant: "destructive" });
  }

  return { register, isLoading, progress, error, cancel };
}

// ------------------
// Register component
// ------------------
type FormDataShape = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  course: string;
  year: string;
  gender: string;
  dob: string;
  phone: string;
  studentId: string;
  profilePic?: File | null;
  consent: boolean;
};

const UNIVERSITY_SUGGESTIONS = [
  "Manav Rachna International Institute Of Research And Studies",
  "Manav Rachna University",
  "Other"
];

const COURSES = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Business",
  "Other"
];

const YEARS = ["1", "2", "3", "4", "5"];

function debounce<T extends (...args: any[]) => any>(fn: T, wait = 400) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait) as unknown as number;
  };
}

function calcPasswordStrength(pw: string) {
  let score = 0;
  if (!pw) return { score, label: "Very weak" };
  const length = pw.length;
  score += Math.min(40, length * 4);
  if (/[a-z]/.test(pw)) score += 10;
  if (/[A-Z]/.test(pw)) score += 12;
  if (/[0-9]/.test(pw)) score += 12;
  if (/[^A-Za-z0-9]/.test(pw)) score += 18;
  score = Math.min(100, score);
  let label = "Weak";
  if (score > 80) label = "Excellent";
  else if (score > 60) label = "Good";
  else if (score > 40) label = "Fair";
  return { score, label };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
}

export default function Register() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { register, isLoading: apiLoading, progress, error, cancel } = useRegisterApi();

  const [form, setForm] = useState<FormDataShape>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    university: "",
    course: "",
    year: "",
    gender: "",
    dob: "",
    phone: "",
    studentId: "",
    profilePic: null,
    consent: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [univQuery, setUnivQuery] = useState("");
  const [showUnivSuggestions, setShowUnivSuggestions] = useState(false);

  // OTP / verification related state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyContext, setVerifyContext] = useState<any>(null); // store server data returned by register (e.g., verificationId)
  const [termsOpen, setTermsOpen] = useState(false);

  const pwStrength = useMemo(() => calcPasswordStrength(form.password), [form.password]);

  const completion = useMemo(() => {
    const required = [
      "firstName",
      "lastName",
      "email",
      "password",
      "confirmPassword",
      "university",
      "course",
      "year",
      "dob",
      "phone",
      "studentId",
      "consent"
    ];
    const filled = required.reduce((acc, key) => {
      const v = (form as any)[key];
      if (typeof v === "boolean") return acc + (v ? 1 : 0);
      return acc + (v && String(v).trim().length > 0 ? 1 : 0);
    }, 0);
    return Math.round((filled / required.length) * 100);
  }, [form]);

  const checkEmail = (email: string) => {
    if (!isValidEmail(email)) {
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    setEmailAvailable(null);
    setTimeout(() => {
      const taken = email.includes("taken") || email.endsWith("@example.com");
      setEmailAvailable(!taken);
      setEmailChecking(false);
      if (taken) {
        toast({
          title: "Email already in use",
          description: "Try signing in or use a different email.",
          variant: "destructive"
        });
      }
    }, 900);
  };

  const debouncedCheckEmail = useMemo(() => debounce(checkEmail, 600), []);

  useEffect(() => {
    if (form.email && isValidEmail(form.email)) debouncedCheckEmail(form.email);
    else setEmailAvailable(null);
  }, [form.email, debouncedCheckEmail]);

  useEffect(() => {
    if (!form.profilePic) {
      setProfilePreview(null);
      return;
    }
    const url = URL.createObjectURL(form.profilePic);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.profilePic]);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const t = setInterval(() => setOtpResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpResendCooldown]);

  function updateField<K extends keyof FormDataShape>(key: K, value: FormDataShape[K]) {
    let newValue: any = value;

    // Convert year to int
    if (key === "year" && typeof value === "string") {
      newValue = parseInt(value, 10) || 0;
    }

    // Convert consent to boolean
    if (key === "consent") {
      if (typeof value === "string") {
        newValue = value.toLowerCase() === "true";
      } else {
        newValue = Boolean(value);
      }
    }

    // Default update
    setForm((s) => ({
      ...s,
      [key]: newValue,
    }));
  }

  function handleFileInput(file?: File | null) {
    if (!file) {
      updateField("profilePic", null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB allowed.", variant: "destructive" });
      return;
    }
    updateField("profilePic", file);
  }

  const dropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileInput(file);
    };
    el.addEventListener("dragenter", onDrag);
    el.addEventListener("dragover", onDrag);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDrag);
      el.removeEventListener("dragover", onDrag);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (form.email && !isValidEmail(form.email)) e.email = "Enter a valid email";
    if (form.phone && !isValidPhone(form.phone)) e.phone = "Enter a valid phone number";
    if (form.dob) {
      const age = Math.floor((Date.now() - new Date(form.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 13) e.dob = "You must be at least 13 years old";
    }
    if (form.studentId && !/^[A-Za-z0-9\-]{4,20}$/.test(form.studentId)) e.studentId = "Invalid student ID";
    return e;
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) {
      toast({ title: "Consent required", description: "Please agree to terms & privacy.", variant: "destructive" });
      return;
    }
    if (Object.keys(errors).length > 0) {
      toast({ title: "Fix errors", description: "Please fix highlighted fields.", variant: "destructive" });
      return;
    }
    if (emailAvailable === false) {
      toast({ title: "Email unavailable", description: "Use a different email.", variant: "destructive" });
      return;
    }

    // build FormData for upload
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === "profilePic") {
        if (v instanceof File) fd.append("profilePic", v, v.name);
        return;
      }
      fd.append(k, String(v));
    });

    try {
      const res = await register(fd);
      // store response for verification context (if server provides verificationId or similar)
      setVerifyContext(res ?? null);

      // show toast and open OTP modal for verification
      const short = typeof res === "string" ? res : (res?.message ?? JSON.stringify(res)).slice(0, 180);
      toast({ title: "Registered", description: String(short) });

      // open OTP modal
      setOtpOpen(true);
      setOtpResendCooldown(30);

      // subtle success animation on profile picture
      if (form.profilePic) {
        setProfilePreview((p) => p); // trigger re-render so animation can use it
      }
    } catch (err: any) {
      let msg = "Registration failed";

      // try to extract proper message
      if (err?.body) {
        const body = err.body;
        msg =
          typeof body === "string"
            ? body
            : body?.error
            ? body.error
            : body?.message
            ? body.message
            : JSON.stringify(body);
      } else if (err?.message) {
        msg = err.message;
      }

      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  // Get otp string
  const otpValue = otpDigits.join("");

  // OTP input helpers: handle change, paste, backspace, focus
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return; // only digits
    const v = value.slice(-1); // keep only last digit
    setOtpDigits((prev) => {
      const copy = [...prev];
      copy[index] = v;
      return copy;
    });
    // focus next if digit entered
    if (v && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]!.focus();
      inputRefs.current[index + 1]!.select();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const key = e.key;
    if (key === "Backspace") {
      if (otpDigits[index]) {
        // clear current
        setOtpDigits((prev) => {
          const copy = [...prev];
          copy[index] = "";
          return copy;
        });
      } else if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]!.focus();
        setOtpDigits((prev) => {
          const copy = [...prev];
          copy[index - 1] = "";
          return copy;
        });
      }
    } else if (key === "ArrowLeft" && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]!.focus();
    } else if (key === "ArrowRight" && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]!.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("Text").trim();
    const digits = pasted.replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 0) return;
    setOtpDigits((prev) => {
      const copy = [...prev];
      for (let i = 0; i < 6; i++) copy[i] = digits[i] ?? "";
      return copy;
    });
    // focus the last filled or last input
    const nextFocus = Math.min(5, digits.length - 1);
    setTimeout(() => {
      inputRefs.current[nextFocus]?.focus();
      inputRefs.current[nextFocus]?.select();
    }, 0);
  }

  // verify OTP by calling backend
  async function verifyOtp() {
    setVerifyError(null);
    if (otpValue.length !== 6) {
      setVerifyError("Enter the 6-digit code.");
      toast({ title: "Invalid OTP", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }

    setVerifyLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_URL}/auth/verify/email/`;
      // prepare payload: include email + otp + any verificationId if provided by register response
      const payload: Record<string, any> = { email: form.email, code: otpValue };
      if (verifyContext?.verificationId) payload.verificationId = verifyContext.verificationId;
      if (verifyContext?.tempToken) payload.tempToken = verifyContext.tempToken;

      const resp = await axios.post(url, payload, { timeout: 15000 });
      setVerifyLoading(false);

      const data = resp.data;
      toast({ title: "Verified", description: data?.message ?? "Email verified." });

      // close modal and redirect to /home
      setOtpOpen(false);

      // small delay to let toast show and UI settle
      setTimeout(() => navigate("/login"), 300);
    } catch (err: any) {
      setVerifyLoading(false);
      // network / no response
      if (!err?.response) {
        const msg = err?.message ?? "Network error during verification";
        setVerifyError(msg);
        toast({ title: "Network error", description: "Unable to reach verification endpoint.", variant: "destructive" });
        return;
      }
      const status = err.response.status;
      const body = err.response.data;
      const msg = body?.error ?? body?.message ?? `Verification failed (${status})`;
      setVerifyError(String(msg));
      toast({ title: "Verification failed", description: String(msg), variant: "destructive" });
    }
  }

  // resend logic (local cooldown). If you have a backend endpoint to request resend,
  // call it here and handle errors similarly to verifyOtp.
  function resendOtp() {
    if (otpResendCooldown > 0) return;
    setOtpResendCooldown(30);
    toast({ title: "OTP resent", description: "Check your email again." });

    // OPTIONAL: hit backend endpoint to resend (example)
    axios.post(`${import.meta.env.VITE_API_URL}/auth/resend-otp/`, { email: form.email, verificationId: verifyContext?.verificationId })
    .catch(() => toast({ title: "Resend failed", description: "Could not resend OTP.", variant: "destructive" }));
  }

  return (
    <div className="relative min-h-screen w-full p-4 overflow-hidden flex items-start">
      {/* Indigo + Aurora backdrop */}
      <FXDefs />
      <IndigoBackdrop />

      {/* Top upload progress bar */}
      <AnimatePresence>
        {apiLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 4, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed left-0 top-0 right-0 z-50"
          >
            <div className="h-1 bg-white/10 w-full">
              <motion.div
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
                className="h-1 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto relative z-10">
        <Card className="glass border-white/20 overflow-hidden p-6">
          {/* Header + Progress */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <motion.div layout initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold ${h1Grad}`}>Create your student account</h1>
                <p className={`text-sm ${subText}`}>Share notes, past papers & collaborate with classmates.</p>
              </div>
            </div>

            <div className="w-full md:w-96">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className={`text-xs ${subText}`}>Profile completeness</span>
                </div>
                <div className="text-xs font-medium">{completion}%</div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${completion}%` }}
                  transition={{ ease: "easeOut", duration: 0.6 }}
                  className="h-2 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column: profile pic + social */}
            <div className="space-y-4 md:col-span-1">
              <div
                ref={dropRef}
                className={`rounded-lg border-2 p-4 border-dashed ${dragActive ? "border-indigo-400/80 bg-indigo-400/10" : "border-white/10"} text-center`}
                aria-label="Profile picture upload"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    layout
                    initial={{ scale: 0.98 }}
                    animate={apiLoading ? { scale: 0.98, opacity: 0.9 } : { scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative w-28 h-28 rounded-full overflow-hidden bg-white/5 flex items-center justify-center mb-3"
                  >
                    {profilePreview ? (
                      <img src={profilePreview} alt="profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
                        <ImagePlus className="w-6 h-6 mb-1" />
                        <div>Upload photo</div>
                      </div>
                    )}

                    {form.profilePic && !apiLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute right-1 bottom-1 bg-black/40 rounded-full p-1">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </motion.div>
                    )}
                  </motion.div>

                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="profilePicInput"
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileInput(f);
                      }}
                    />

                    <Button
                      className={`${gradientOutline} px-3 py-2`}
                      size="sm"
                      type="button"
                      onClick={() => document.getElementById("profilePicInput")?.click()}
                    >
                      Choose
                    </Button>

                    <Button
                      className={`${gradientOutline} px-3 py-2`}
                      size="sm"
                      type="button"
                      onClick={() => handleFileInput(null)}
                      disabled={!form.profilePic}
                    >
                      Remove
                    </Button>

                    {apiLoading && (
                      <Button className={`${gradientOutline} px-3 py-2`} size="sm" type="button" onClick={() => cancel()}>
                        Cancel upload
                      </Button>
                    )}
                  </div>

                  <p className={`text-xs mt-3 ${subText}`}>Drag & drop or click to upload. Max 5MB. Images only.</p>

                  {apiLoading && (
                    <div className={`mt-2 text-xs ${subText}`}>Uploading... {progress}%</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button className={`w-full ${gradientOutline}`} onClick={() => toast({ title: "Social signup", description: "Social login not wired in demo." })}>
                  <Chrome className="w-4 h-4 mr-2" /> Continue with Google
                </Button>
                <Button className={`w-full ${gradientOutline}`} onClick={() => toast({ title: "Social signup", description: "Social login not wired in demo." })}>
                  <Github className="w-4 h-4 mr-2" /> Continue with GitHub
                </Button>
              </div>
            </div>

            {/* Middle & Right: main form */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First / Last */}
              <div className="space-y-2">
                <label className="text-sm font-medium">First name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="John"
                    className="pl-10"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    required
                    aria-label="First name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last name</label>
                <Input
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  required
                />
              </div>

              {/* Email full width */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="john@university.edu"
                    className="pl-10 pr-28"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-describedby="email-hint"
                    required
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      {emailChecking ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
                      {emailAvailable === true ? <CheckCircle className="w-5 h-5 text-green-400" /> : null}
                    </div>
                  </div>
                </div>
                <div id="email-hint" className={`text-xs flex items-center gap-2 ${subText}`}>
                  <span>{(errors as any).email ?? "We will send a verification code to this address."}</span>
                </div>
              </div>

              {/* University autocomplete */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium">University</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Start typing your university..."
                    value={univQuery || form.university}
                    onFocus={() => setShowUnivSuggestions(true)}
                    onChange={(e) => {
                      setUnivQuery(e.target.value);
                      setShowUnivSuggestions(true);
                    }}
                    className="pl-10"
                    aria-autocomplete="list"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      className={`text-xs underline ${subText}`}
                      onClick={() => {
                        updateField("university", univQuery || form.university);
                        setShowUnivSuggestions(false);
                      }}
                    >
                      Use
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showUnivSuggestions && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-50 w-full bg-background border rounded-md mt-2 max-h-40 overflow-auto shadow-md"
                      style={{ listStyle: "none", padding: 8 }}
                    >
                      {UNIVERSITY_SUGGESTIONS.filter((u) =>
                        u.toLowerCase().includes((univQuery || "").toLowerCase())
                      ).map((u) => (
                        <li key={u} className="p-2 hover:bg-primary/5 cursor-pointer rounded-md" onClick={() => {
                          updateField("university", u === "Other" ? "" : u);
                          setUnivQuery(u === "Other" ? "" : u);
                          setShowUnivSuggestions(false);
                        }}>
                          {u}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
                <div className={`text-xs ${subText}`}>Can't find your university? Choose "Other" and type it in.</div>
              </div>

              {/* Course */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Course / Major</label>
                <Select onValueChange={(v) => updateField("course", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Year of study</label>
                <Select onValueChange={(v) => updateField("year", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y} {y==="1"?"(1st)":"th"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="preferNot">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DOB */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                  />
                </div>
                {(errors as any).dob && <div className="text-xs text-rose-400">{(errors as any).dob}</div>}
              </div>

              {/* Phone */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium">Phone number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="+91 98xxxxxxx"
                    className="pl-10"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
                {(errors as any).phone && <div className="text-xs text-rose-400">{(errors as any).phone}</div>}
              </div>

              {/* Student ID */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium">Student ID</label>
                <Input placeholder="e.g., 20250123" value={form.studentId} onChange={(e) => updateField("studentId", e.target.value)} />
                {(errors as any).studentId && <div className="text-xs text-rose-400">{(errors as any).studentId}</div>}
              </div>

              {/* Password & strength */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pl-10 pr-12"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    aria-describedby="pw-strength"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className={`absolute right-1 top-1/2 -translate-y-1/2 ${iconBtn}`}
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div id="pw-strength" className="text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium">{pwStrength.label}</div>
                    <div className="text-xs text-muted-foreground">({pwStrength.score}%)</div>
                  </div>
                  <div className="w-36 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div initial={false} animate={{ width: `${pwStrength.score}%` }} className="h-2 bg-gradient-to-r from-amber-400 to-green-400" />
                  </div>
                </div>
                <div className={`text-xs ${subText}`}>Use a mix of letters, numbers & symbols for best strength.</div>
              </div>

              {/* Confirm */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    className="pl-10 pr-12"
                    value={form.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className={`absolute right-1 top-1/2 -translate-y-1/2 ${iconBtn}`}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {(errors as any).confirmPassword && <div className="text-xs text-rose-400">{(errors as any).confirmPassword}</div>}
              </div>

              {/* Terms & consent */}
              <div className="md:col-span-2 flex items-start gap-3">
                <input id="consent" type="checkbox" className="rounded mt-1" checked={form.consent} onChange={(e) => updateField("consent", e.target.checked)} />
                <div className={`text-xs ${subText}`}>
                  I agree to the{" "}
                  <button type="button" className="text-primary underline" onClick={() => setTermsOpen(true)}>Terms of Service</button>{" "}
                  and{" "}
                  <button type="button" className="text-primary underline" onClick={() => setTermsOpen(true)}>Privacy Policy</button>.
                  <div className="mt-1 text-xxs text-muted-foreground">We will never share your personal data without permission.</div>
                </div>
              </div>

              {/* Submit */}
              <div className="md:col-span-2">
                <Button type="submit" className={`w-full ${filledBtn}`} size="lg" disabled={apiLoading}>
                  {apiLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      Create account <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* footer */}
          <div className="text-center mt-6">
            <p className={`text-sm ${subText}`}>
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </Card>
      </motion.div>

      {/* OTP Modal (enhanced) */}
      <AnimatePresence>
        {otpOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOtpOpen(false)} />
            <motion.div
              initial={{ scale: 0.98, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-background rounded-lg p-6 z-10 w-full max-w-md shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${titleText}`}>Verify your email</h3>
                  <p className={`text-sm ${subText}`}>
                    Enter the 6-digit code sent to <strong>{form.email}</strong>
                  </p>
                </div>
                <Button size="icon" className={iconBtn} onClick={() => setOtpOpen(false)} aria-label="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      maxLength={1}
                      inputMode="numeric"
                      pattern="\d*"
                      className="w-12 h-12 rounded-2xl border border-blue-300/50 bg-background text-center text-lg font-bold text-foreground 
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
           hover:border-blue-400 
           focus:shadow-md focus:shadow-blue-500/20 
           transition-all duration-200 ease-in-out"

                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>

                {verifyError && <div className="mt-2 text-xs text-rose-400 text-center">{verifyError}</div>}

                <div className="flex items-center justify-between mt-4">
                  <div className={`text-xs ${subText}`}>
                    Didn't get it?{" "}
                    <button className="underline text-primary" onClick={resendOtp} disabled={otpResendCooldown > 0}>
                      {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : "Resend"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button className={gradientOutline} onClick={() => setOtpOpen(false)}>Cancel</Button>
                    <Button className={filledBtn} onClick={verifyOtp} disabled={verifyLoading || otpValue.length !== 6}>
                      {verifyLoading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>

                <div className={`mt-3 text-center text-xs ${subText}`}>
                  Tip: You can paste the full code (ctrl+v) into any input.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms Modal */}
      <AnimatePresence>
        {termsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setTermsOpen(false)} />
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-background rounded-lg p-6 z-50 w-full max-w-3xl max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${titleText}`}>Terms & Privacy</h2>
                <Button size="icon" className={iconBtn} onClick={() => setTermsOpen(false)} aria-label="Close"><X className="w-5 h-5" /></Button>
              </div>
              <div className={`mt-4 text-sm space-y-4 ${subText}`}>
                <p><strong>Short version:</strong> This is a demo. Replace this with your real Terms & Privacy copy before production.</p>
                <p>— We collect basic profile information to enable collaboration and sharing among students. We never sell personal data.</p>
                <p>— You can request data deletion anytime from your profile settings.</p>
                <p>— For analytics and spam prevention we may use third-party services (list them here).</p>
                <p className="text-xs">Long legal copy goes here...</p>
              </div>
              <div className="mt-6 text-right">
                <Button className={filledBtn} onClick={() => setTermsOpen(false)}>Got it</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

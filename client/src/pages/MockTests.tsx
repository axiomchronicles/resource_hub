import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Award,
  BarChart3,
  BookOpen,
  Timer,
  Target,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Users,
  Flag,
  HelpCircle,
  EyeOff,
  Eraser,
  SkipForward,
  Pause,
  PlayCircle,
  Save,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

/************************
 * Accent Tokens (Indigo)
 ************************/
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-slate-200 border border-slate-300/40 dark:border-slate-700/60 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-[linear-gradient(90deg,rgba(255,255,255,0.25),rgba(255,255,255,0.06))] before:opacity-60 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";

/************************
 * FX / Backdrop
 ************************/
const NeutralBackdrop = React.memo(function NeutralBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="gpu absolute bottom-[-14%] left-1/2 h-[38vh] w-[140vw] -translate-x-1/2 origin-top"
        style={{ transform: "rotateX(60deg) translateZ(-100px)" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle,white_1px,transparent_1.2px)] [background-size:18px_18px]" />
    </div>
  );
});

/*********************
 * Types
 *********************/
interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
  topic: string;
}

interface MockTest {
  id: string;
  title: string;
  subject: string;
  duration: number; // minutes
  totalQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  description: string;
  attempts: number;
  averageScore: number;
  questions?: Question[]; // may be absent in list response
}

/*********************
 * API helper + hooks
 *********************/
const API_BASE = import.meta.env.VITE_API_URL;
const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

function fetchJSON(url: string, init: RequestInit = {}) {
  const baseHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(storedToken ? { Authorization: `Token ${storedToken}` } : {}),
  };
  const headers = { ...baseHeaders, ...(init.headers || {}) };

  return fetch(url, { ...init, headers, credentials: "include" }).then(async (res) => {
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = (data && (data.detail || data.non_field_errors)) || res.statusText;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  });
}

function useMockTests() {
  const [data, setData] = useState<MockTest[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/mocktests/`;
      const res = await fetch(url, { signal, credentials: "include", headers: storedToken ? { Authorization: `Token ${storedToken}` } : {} });
      if (!res.ok) throw new Error(`Failed to load tests (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchList(ac.signal);
    return () => ac.abort();
  }, []);

  return { data, loading, error, refetch: fetchList };
}

function useMockTest(testId: string | null) {
  const [data, setData] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const ac = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${API_BASE}/mocktests/${testId}/`;
        const res = await fetch(url, { signal: ac.signal, credentials: "include", headers: storedToken ? { Authorization: `Token ${storedToken}` } : {} });
        if (!res.ok) throw new Error(`Failed to load test (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ac.abort();
  }, [testId]);

  return { data, loading, error };
}

async function submitTestResult(
  testId: string,
  payload: {
    answers: { [k: string]: number };
    timeTaken: number;
    score?: number;
    flags?: string[];
    review?: string[];
    notes?: Record<string, string>;
    eliminated?: Record<string, number[]>;
  }
) {
  const url = `${API_BASE}/mocktests/${encodeURIComponent(testId)}/submit/`;
  return fetchJSON(url, { method: "POST", body: JSON.stringify(payload) });
}

// (Optional) sync in-progress
async function saveProgress(
  testId: string,
  payload: {
    answers: { [k: string]: number };
    timeRemaining: number;
    currentQuestionIndex: number;
    flags: string[];
    review: string[];
    notes: Record<string, string>;
    eliminated: Record<string, number[]>;
  }
) {
  // If you have a backend route, enable this; otherwise it fails silently.
  try {
    await fetchJSON(`${API_BASE}/mocktests/${encodeURIComponent(testId)}/progress/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore if backend route doesn't exist
  }
}

/*********************
 * Component
 *********************/
export default function MockTests() {
  const { data: listData, loading: listLoading, error: listError, refetch } = useMockTests();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const { data: selectedTest, loading: selectedLoading, error: selectedError } = useMockTest(selectedTestId);

  // Test state
  const [isTestActive, setIsTestActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState<Record<string, boolean>>({}); // "unsure but answered"
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [eliminated, setEliminated] = useState<Record<string, number[]>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "flagged" | "review" | "unanswered" | "answered">("all");

  // Results
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const { toast } = useToast();
  const wasPaused = useRef(false);

  // Timer
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, timeRemaining]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Start flow (with resume)
  const startTest = async (testSummary: MockTest) => {
    if (!testSummary) return;
    setSelectedTestId(testSummary.id);
  };

  // Local storage helpers
  const lsKey = (tid: string) => `mocktest:${tid}:state`;
  const hydrateOrInit = (test: MockTest) => {
    const raw = localStorage.getItem(lsKey(test.id));
    if (raw) {
      const shouldResume = window.confirm("Resume previous progress for this test?");
      if (shouldResume) {
        try {
          const s = JSON.parse(raw);
          setAnswers(s.answers || {});
          setFlags(s.flags || {});
          setReview(s.review || {});
          setNotes(s.notes || {});
          setEliminated(s.eliminated || {});
          setTimeRemaining(typeof s.timeRemaining === "number" ? s.timeRemaining : test.duration * 60);
          setCurrentQuestionIndex(s.currentQuestionIndex || 0);
          setAutoAdvance(!!s.autoAdvance);
          return;
        } catch {}
      }
      // drop stale
      localStorage.removeItem(lsKey(test.id));
    }
    // fresh
    setAnswers({});
    setFlags({});
    setReview({});
    setNotes({});
    setEliminated({});
    setTimeRemaining(test.duration * 60);
    setCurrentQuestionIndex(0);
    setAutoAdvance(true);
  };

  // When test details loaded, initialize and start
  useEffect(() => {
    if (!selectedTest) return;
    if (!selectedTest.questions?.length) {
      toast({ title: "No questions yet", description: "This test doesn't have questions. Pick another one.", variant: "destructive" });
      setSelectedTestId(null);
      return;
    }
    hydrateOrInit(selectedTest);
    setIsTestActive(true);
    setShowResults(false);
    setTestResults(null);
    setIsTimerRunning(true);
    toast({ title: "Test Started!", description: `Good luck with ${selectedTest.title}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTest]);

  // Autosave (local + optional API)
  useEffect(() => {
    if (!selectedTest?.id) return;
    const state = {
      answers,
      flags,
      review,
      notes,
      eliminated,
      timeRemaining,
      currentQuestionIndex,
      autoAdvance,
    };
    localStorage.setItem(lsKey(selectedTest.id), JSON.stringify(state));
    // fire-and-forget server sync (throttled)
    const id = setTimeout(() => {
      saveProgress(selectedTest.id, {
        answers,
        timeRemaining,
        currentQuestionIndex,
        flags: Object.keys(flags).filter((k) => flags[k]),
        review: Object.keys(review).filter((k) => review[k]),
        notes,
        eliminated,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [answers, flags, review, notes, eliminated, timeRemaining, currentQuestionIndex, autoAdvance, selectedTest?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTestActive || !selectedTest?.questions) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase?.();
      if (tag === "textarea" || tag === "input") return;

      const q = selectedTest.questions[currentQuestionIndex];
      // 1-9 select answer; Shift+1-9 eliminate
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < q.options.length) {
          if (e.shiftKey) {
            toggleEliminate(q.id, idx);
          } else {
            handleAnswerSelect(q.id, idx, { viaKeyboard: true });
          }
        }
      } else if (e.key.toLowerCase() === "n") {
        nextQuestion();
      } else if (e.key.toLowerCase() === "p") {
        previousQuestion();
      } else if (e.key.toLowerCase() === "f") {
        toggleFlag(q.id);
      } else if (e.key.toLowerCase() === "r") {
        toggleReview(q.id);
      } else if (e.key.toLowerCase() === "c") {
        clearAnswer(q.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestActive, selectedTest, currentQuestionIndex, answers]);

  const handleAnswerSelect = (questionId: string, answerIndex: number, opts?: { viaKeyboard?: boolean }) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    // If answered while it had elimination, keep elimination as is
    if (autoAdvance && selectedTest?.questions && currentQuestionIndex < selectedTest.questions.length - 1) {
      // slight delay to allow selection animation
      setTimeout(() => setCurrentQuestionIndex((i) => i + 1), opts?.viaKeyboard ? 0 : 120);
    }
  };

  const clearAnswer = (qid: string) => {
    setAnswers((prev) => {
      const cp = { ...prev };
      delete cp[qid];
      return cp;
    });
  };

  const toggleFlag = (qid: string) => setFlags((prev) => ({ ...prev, [qid]: !prev[qid] }));
  const toggleReview = (qid: string) => setReview((prev) => ({ ...prev, [qid]: !prev[qid] }));

  const toggleEliminate = (qid: string, optionIdx: number) => {
    setEliminated((prev) => {
      const cur = new Set(prev[qid] || []);
      if (cur.has(optionIdx)) cur.delete(optionIdx);
      else cur.add(optionIdx);
      return { ...prev, [qid]: Array.from(cur) };
    });
  };

  const nextQuestion = () => {
    if (selectedTest && currentQuestionIndex < (selectedTest.questions?.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };
  const previousQuestion = () => currentQuestionIndex > 0 && setCurrentQuestionIndex((prev) => prev - 1);

  const jumpFirstUnanswered = () => {
    if (!selectedTest?.questions) return;
    const idx = selectedTest.questions.findIndex((q) => answers[q.id] === undefined);
    if (idx >= 0) setCurrentQuestionIndex(idx);
    else toast({ title: "All answered", description: "No unanswered questions left." });
  };

  const filteredIndices = useMemo(() => {
    if (!selectedTest?.questions) return [];
    const qs = selectedTest.questions;
    switch (filterMode) {
      case "flagged":
        return qs.map((q, i) => ({ q, i })).filter(({ q }) => !!flags[q.id]).map(({ i }) => i);
      case "review":
        return qs.map((q, i) => ({ q, i })).filter(({ q }) => !!review[q.id]).map(({ i }) => i);
      case "unanswered":
        return qs.map((q, i) => ({ q, i })).filter(({ q }) => answers[q.id] === undefined).map(({ i }) => i);
      case "answered":
        return qs.map((q, i) => ({ q, i })).filter(({ q }) => answers[q.id] !== undefined).map(({ i }) => i);
      default:
        return qs.map((_, i) => i);
    }
  }, [filterMode, selectedTest, answers, flags, review]);

  const handleSubmitTest = async () => {
    if (!selectedTest) return;
    setIsTimerRunning(false);

    // Warn if unanswered remain
    const total = selectedTest.questions?.length || 0;
    const unanswered = selectedTest.questions?.filter((q) => answers[q.id] === undefined).length || 0;
    if (unanswered > 0) {
      const go = window.confirm(`You have ${unanswered} unanswered. Submit anyway?`);
      if (!go) return;
    }

    const correctAnswers = selectedTest.questions?.filter((q) => answers[q.id] === q.correctAnswer).length || 0;
    const score = Math.round((correctAnswers / total) * 100);
    const timeTaken = selectedTest.duration * 60 - timeRemaining;

    setTestResults({
      score,
      correctAnswers,
      totalQuestions: total,
      timeTaken,
      breakdown: selectedTest.questions?.map((q) => ({
        id: q.id,
        question: q.question,
        userAnswer: answers[q.id],
        correctAnswer: q.correctAnswer,
        isCorrect: answers[q.id] === q.correctAnswer,
        explanation: q.explanation,
        flagged: !!flags[q.id],
        review: !!review[q.id],
        note: notes[q.id],
      })),
    });

    setShowResults(true);
    setIsTestActive(false);

    toast({ title: "Test Completed!", description: `You scored ${score}% (${correctAnswers}/${total})` });

    try {
      await submitTestResult(selectedTest.id, {
        answers,
        timeTaken,
        score,
        flags: Object.keys(flags).filter((k) => flags[k]),
        review: Object.keys(review).filter((k) => review[k]),
        notes,
        eliminated,
      });
      // Clear local saved progress
      localStorage.removeItem(lsKey(selectedTest.id));
      refetch?.();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e?.message || "Could not submit results to server", variant: "destructive" });
    }
  };

  const resetTest = () => {
    if (selectedTest?.id) localStorage.removeItem(lsKey(selectedTest.id));
    setSelectedTestId(null);
    setIsTestActive(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlags({});
    setReview({});
    setNotes({});
    setEliminated({});
    setTimeRemaining(0);
    setIsTimerRunning(false);
    setShowResults(false);
    setTestResults(null);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "hard":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const answeredCount = useMemo(
    () => (selectedTest?.questions || []).filter((q) => answers[q.id] !== undefined).length,
    [selectedTest, answers]
  );
  const flaggedCount = useMemo(() => Object.values(flags).filter(Boolean).length, [flags]);
  const reviewCount = useMemo(() => Object.values(review).filter(Boolean).length, [review]);
  const totalCount = selectedTest?.questions?.length || 0;

  /*********************
   * Results View
   *********************/
  if (showResults && testResults) {
    return (
      <div className="relative min-h-screen py-8 bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
        <NeutralBackdrop />
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/40 dark:border-slate-700/60"
              style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(148,163,184,0.55))" }}
            >
              <Award className="w-10 h-10 text-slate-700 dark:text-slate-200" />
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${h1Grad}`}>Test Completed!</h1>
            <p className={`text-xl ${subText}`}>Here are your results for {selectedTest?.title}</p>
          </motion.div>

          <Card className={`${gradientOutline} p-8 mb-8`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{testResults.score}%</div>
                <div className={`text-sm ${subText}`}>Overall Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{testResults.correctAnswers}</div>
                <div className={`text-sm ${subText}`}>Correct Answers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{testResults.totalQuestions}</div>
                <div className={`text-sm ${subText}`}>Total Questions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{formatTime(testResults.timeTaken)}</div>
                <div className={`text-sm ${subText}`}>Time Taken</div>
              </div>
            </div>
          </Card>

          <Card className={`${gradientOutline} p-6`}>
            <h3 className={`text-xl font-bold mb-6 ${titleText}`}>Detailed Breakdown</h3>
            <div className="space-y-6">
              {testResults.breakdown.map((item: any, index: number) => (
                <div key={item.id} className="border-l-4 border-l-slate-300/30 dark:border-l-slate-600/60 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.question}</h4>
                    <div className="flex items-center gap-2">
                      {item.flagged && <Flag className="w-4 h-4 text-amber-500" />}
                      {item.review && <HelpCircle className="w-4 h-4 text-violet-500" />}
                      {item.isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className={item.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      Your answer: {selectedTest?.questions?.[index]?.options[item.userAnswer] || "Not answered"}
                    </span>
                    {!item.isCorrect && (
                      <div className="text-emerald-600 dark:text-emerald-400 mt-1">
                        Correct answer: {selectedTest?.questions?.[index]?.options[item.correctAnswer]}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs ${subText} bg-muted/30 p-2 rounded`}>{item.explanation}</p>
                  {item.note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-300 italic">Your note: {item.note}</p>}
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-4 justify-center mt-8">
            <Button onClick={() => startTest(selectedTest!)} size="lg" className={filledBtn}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retake Test
            </Button>
            <Button variant="outline" onClick={resetTest} size="lg" className={gradientOutline}>
              <ArrowRight className="w-4 h-4 mr-2" /> Browse Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /*********************
   * Active Test View
   *********************/
  if (isTestActive && selectedTest) {
    const qs = selectedTest.questions!;
    const current = qs[currentQuestionIndex];
    const palette = filteredIndices;
    const progressPct = ((answeredCount) / (qs.length || 1)) * 100;

    return (
      <div className="relative min-h-screen py-8 bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
        <NeutralBackdrop />
        {/* Pause overlay */}
        {!isTimerRunning && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="px-6 py-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/30 dark:border-slate-700/50 text-center">
              <p className="text-lg font-semibold mb-2">Paused</p>
              <p className="text-sm mb-4 text-slate-600 dark:text-slate-300">Timer is paused. Resume when ready.</p>
              <Button className={filledBtn} onClick={() => setIsTimerRunning(true)}>
                <PlayCircle className="w-4 h-4 mr-2" /> Resume
              </Button>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main */}
          <div>
            {/* Header + controls */}
            <Card className={`${gradientOutline} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className={`text-2xl font-bold ${h1Grad}`}>{selectedTest.title}</h1>
                  <p className={subText}>
                    Question {currentQuestionIndex + 1} of {qs.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-lg font-mono px-3 py-1.5 rounded-lg border border-slate-300/50 dark:border-slate-700/60">
                    <Timer className="w-5 h-5 text-slate-500" />
                    <span className={timeRemaining < 300 ? "text-rose-500" : "text-slate-900 dark:text-slate-100"}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className={gradientOutline} onClick={() => setIsTimerRunning((v) => !v)}>
                    {isTimerRunning ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Resume</>}
                  </Button>
                  <Button size="sm" onClick={handleSubmitTest} className={filledBtn}>
                    Submit
                  </Button>
                </div>
              </div>

              {/* Progress summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Answered", value: answeredCount, className: "text-emerald-600" },
                  { label: "Flagged", value: flaggedCount, className: "text-amber-600" },
                  { label: "Review", value: reviewCount, className: "text-violet-600" },
                  { label: "Unanswered", value: totalCount - answeredCount, className: "text-slate-600" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/60">
                    <div className={`text-lg font-semibold ${s.className}`}>{s.value}</div>
                    <div className={`text-xs ${subText}`}>{s.label}</div>
                  </div>
                ))}
              </div>
              <Progress value={progressPct} className="h-2" />
            </Card>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <Card className={`${gradientOutline} p-8 mt-6`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyBadge(current.difficulty)}>{current.difficulty}</Badge>
                      <Badge variant="outline">{current.topic}</Badge>
                      {flags[current.id] && (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs"><Flag className="w-3 h-3" /> flagged</span>
                      )}
                      {review[current.id] && (
                        <span className="inline-flex items-center gap-1 text-violet-600 text-xs"><HelpCircle className="w-3 h-3" /> review</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className={gradientOutline} onClick={() => toggleFlag(current.id)}>
                        <Flag className="w-4 h-4 mr-1" /> {flags[current.id] ? "Unflag" : "Flag"}
                      </Button>
                      <Button size="sm" variant="outline" className={gradientOutline} onClick={() => toggleReview(current.id)}>
                        <HelpCircle className="w-4 h-4 mr-1" /> {review[current.id] ? "Unmark" : "Mark review"}
                      </Button>
                      <Button size="sm" variant="outline" className={gradientOutline} onClick={() => clearAnswer(current.id)}>
                        <Eraser className="w-4 h-4 mr-1" /> Clear
                      </Button>
                    </div>
                  </div>

                  <h2 className={`text-xl font-bold leading-relaxed ${titleText} mb-6`}>{current.question}</h2>

                  <div className="space-y-3">
                    {current.options.map((option, index) => {
                      const active = answers[current.id] === index;
                      const isEliminated = (eliminated[current.id] || []).includes(index);
                      return (
                        <motion.div key={index} whileHover={{ scale: 1.01 }} className="flex items-center gap-2">
                          <button
                            onClick={() => handleAnswerSelect(current.id, index)}
                            className={`flex-1 p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                              active
                                ? "border-slate-300/60 bg-white/10 text-slate-900 dark:text-slate-100"
                                : "border-white/20 hover:border-white/40 bg-muted/30"
                            } ${isEliminated ? "opacity-50 line-through" : ""}`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center text-sm font-medium mr-3 ${
                                active ? "border-slate-300 bg-slate-200 text-slate-900" : "border-slate-400/60"
                              }`}
                            >
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span>{option}</span>
                          </button>
                          <button
                            onClick={() => toggleEliminate(current.id, index)}
                            title={isEliminated ? "Restore option" : "Eliminate option (Shift+number)"}
                            className="px-2 py-2 rounded-lg border border-slate-300/40 dark:border-slate-700/60 hover:bg-slate-50/30"
                          >
                            <EyeOff className={`w-4 h-4 ${isEliminated ? "text-rose-500" : "text-slate-500"}`} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <div className="mt-6">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <Save className="w-4 h-4" /> Your note (autosaves)
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-transparent p-3 text-sm"
                      rows={3}
                      placeholder="Jot down a thought to review later…"
                      value={notes[current.id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [current.id]: e.target.value }))}
                    />
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Footer controls */}
            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0} className={gradientOutline}>
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <label className={`text-xs ${subText} inline-flex items-center gap-2 mr-2`}>
                  <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
                  Auto-advance on select
                </label>
                <Button variant="outline" className={gradientOutline} onClick={jumpFirstUnanswered}>
                  <AlertTriangle className="w-4 h-4 mr-1" /> First Unanswered
                </Button>
                {currentQuestionIndex === qs.length - 1 ? (
                  <Button onClick={handleSubmitTest} className={`${filledBtn} bg-emerald-600 hover:opacity-95`}>
                    Submit Test
                  </Button>
                ) : (
                  <Button onClick={nextQuestion} className={filledBtn}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar palette */}
          <div className="lg:sticky lg:top-6 h-fit">
            <Card className={`${gradientOutline} p-5 mb-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Question Palette</div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className={`${gradientOutline} !w-8 !h-8`} onClick={() => setFilterMode("all")}><Filter className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {qs.map((q, idx) => {
                  const answered = answers[q.id] !== undefined;
                  const isFlag = !!flags[q.id];
                  const isRev = !!review[q.id];
                  const isCurrent = idx === currentQuestionIndex;
                  const visible = palette.includes(idx);
                  if (!visible) return null;
                  const cls =
                    isCurrent
                      ? "bg-slate-800 text-white"
                      : isFlag
                      ? "bg-amber-500 text-white"
                      : isRev
                      ? "bg-violet-500 text-white"
                      : answered
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted-foreground/20";
                  return (
                    <button key={q.id} onClick={() => setCurrentQuestionIndex(idx)} className={`w-9 h-9 rounded-full text-sm font-medium ${cls}`}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              {/* Legend + filters */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { k: "all", label: "All" },
                  { k: "flagged", label: "Flagged" },
                  { k: "review", label: "Review" },
                  { k: "answered", label: "Answered" },
                  { k: "unanswered", label: "Unanswered" },
                ].map((f: any) => (
                  <button
                    key={f.k}
                    onClick={() => setFilterMode(f.k)}
                    className={`px-2 py-1 rounded-lg text-xs border ${filterMode === f.k ? "bg-slate-800 text-white border-slate-800" : "border-slate-300/50 dark:border-slate-700/60"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs grid grid-cols-2 gap-2">
                <div className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Answered</div>
                <div className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-muted inline-block" /> Unanswered</div>
                <div className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Flagged</div>
                <div className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block" /> Review</div>
              </div>
            </Card>

            <Card className={`${gradientOutline} p-5`}>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Shortcuts</div>
              <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <li>1–9: choose option</li>
                <li>Shift+1–9: eliminate/restore option</li>
                <li>N / P: next / previous</li>
                <li>F: flag, R: mark review</li>
                <li>C: clear answer</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /*********************
   * Catalog View
   *********************/
  return (
    <div className="relative min-h-screen py-8 bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
      <NeutralBackdrop />
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3 ${h1Grad}`}>
            <Target className="w-10 h-10 text-indigo-500" />
            Mock Tests
          </h1>
          <p className={`text-xl ${subText}`}>Practice with comprehensive mock tests to ace your exams</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Tests Available", value: listLoading ? "…" : (listData ? `${listData.length}` : "0"), icon: BookOpen },
            { label: "Total Attempts", value: "2.8K", icon: TrendingUp },
            { label: "Average Score", value: "74%", icon: BarChart3 },
            { label: "Success Rate", value: "89%", icon: Award },
          ].map((stat) => (
            <Card key={stat.label} className={`${gradientOutline} p-6 text-center`}>
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-slate-500" />
              <div className="text-2xl font-bold mb-1 text-slate-900 dark:text-slate-100">{stat.value}</div>
              <div className={`text-sm ${subText}`}>{stat.label}</div>
            </Card>
          ))}
        </motion.div>

        {listError && <div className="mb-4 text-red-500">Error loading tests: {listError}</div>}
        {listLoading && <div className="mb-4 text-slate-500">Loading tests…</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(listData || []).map((test, index) => (
            <motion.div key={test.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }}>
              <Card className={`${gradientOutline} hover:before:opacity-80 transition-all duration-300 h-full`}>
                <div className="p-6 flex flex-col h-full">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className={`font-bold text-lg leading-tight ${titleText}`}>{test.title}</h3>
                      <Badge className={getDifficultyBadge(test.difficulty)}>{test.difficulty}</Badge>
                    </div>
                    <p className={`text-sm ${subText} mb-3`}>{test.description}</p>
                    <Badge variant="secondary">{test.subject}</Badge>
                  </div>

                  <div className="space-y-3 mb-4 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4" /> Duration
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{test.duration} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <BookOpen className="w-4 h-4" /> Questions
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{test.totalQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <TrendingUp className="w-4 h-4" /> Avg. Score
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{test.averageScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Users className="w-4 h-4" /> Attempts
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{test.attempts?.toLocaleString?.() ?? test.attempts}</span>
                    </div>
                  </div>

                  <Button className={`w-full ${filledBtn}`} onClick={() => startTest(test)}>
                    <Play className="w-4 h-4 mr-2" /> Start Test
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

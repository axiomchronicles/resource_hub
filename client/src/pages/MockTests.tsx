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
// Neutralized outline so the page itself isn't indigo-toned
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-slate-200 border border-slate-300/40 dark:border-slate-700/60 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-[linear-gradient(90deg,rgba(255,255,255,0.25),rgba(255,255,255,0.06))] before:opacity-60 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";

/************************
 * Optional FX (kept neutral)
 ************************/
const FXDefs = React.memo(function FXDefs() {
  // kept for future, not strictly required
  return (
    <svg className="absolute pointer-events-none w-0 h-0">
      <defs></defs>
    </svg>
  );
});

const NeutralBackdrop = React.memo(function NeutralBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle floor grid only */}
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
  questions: Question[];
}

/*********************
 * Sample Data
 *********************/
const mockTests: MockTest[] = [
  {
    id: "1",
    title: "Data Structures & Algorithms Fundamentals",
    subject: "Computer Science",
    duration: 60,
    totalQuestions: 25,
    difficulty: "medium",
    topics: ["Arrays", "Linked Lists", "Trees", "Sorting", "Searching"],
    description: "Test your understanding of basic data structures and algorithms",
    attempts: 1247,
    averageScore: 72,
    questions: [
      {
        id: "q1",
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        correctAnswer: 1,
        explanation:
          "Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.",
        difficulty: "easy",
        subject: "Computer Science",
        topic: "Searching",
      },
      {
        id: "q2",
        question: "Which data structure uses LIFO (Last In, First Out) principle?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        correctAnswer: 1,
        explanation:
          "Stack follows LIFO principle where the last element added is the first one to be removed.",
        difficulty: "easy",
        subject: "Computer Science",
        topic: "Data Structures",
      },
    ],
  },
  {
    id: "2",
    title: "Object-Oriented Programming Concepts",
    subject: "Computer Science",
    duration: 45,
    totalQuestions: 20,
    difficulty: "easy",
    topics: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    description: "Master the core concepts of object-oriented programming",
    attempts: 892,
    averageScore: 78,
    questions: [
      {
        id: "q1-oop",
        question: "Which OOP principle hides internal details and shows only functionality?",
        options: ["Encapsulation", "Abstraction", "Polymorphism", "Inheritance"],
        correctAnswer: 1,
        explanation: "Abstraction exposes only the essential features while hiding the implementation.",
        difficulty: "easy",
        subject: "Computer Science",
        topic: "Abstraction",
      },
      {
        id: "q2-oop",
        question: "What allows a subclass to provide a specific implementation of a method declared in its superclass?",
        options: ["Overloading", "Overriding", "Shadowing", "Hiding"],
        correctAnswer: 1,
        explanation: "Method overriding lets a subclass change the behavior of a superclass method.",
        difficulty: "easy",
        subject: "Computer Science",
        topic: "Polymorphism",
      },
    ],
  },
  {
    id: "3",
    title: "Advanced Database Systems",
    subject: "Computer Science",
    duration: 90,
    totalQuestions: 35,
    difficulty: "hard",
    topics: ["SQL", "Normalization", "Indexing", "Transactions", "Optimization"],
    description: "Comprehensive test on database design and optimization",
    attempts: 567,
    averageScore: 65,
    questions: [
      {
        id: "q1-db",
        question: "Which normal form removes transitive dependencies?",
        options: ["1NF", "2NF", "3NF", "BCNF"],
        correctAnswer: 2,
        explanation:
          "Third Normal Form (3NF) ensures non-key attributes are not transitively dependent on the primary key.",
        difficulty: "medium",
        subject: "Computer Science",
        topic: "Normalization",
      },
      {
        id: "q2-db",
        question: "A clustered index determines the physical order of data in a table.",
        options: ["True", "False"],
        correctAnswer: 0,
        explanation: "In most DBMS, clustered indexes store rows in the same order as the index.",
        difficulty: "easy",
        subject: "Computer Science",
        topic: "Indexing",
      },
    ],
  },
];

/*********************
 * Component
 *********************/
export default function MockTests() {
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [isTestActive, setIsTestActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
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
  }, [isTimerRunning, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTest = (test: MockTest) => {
    if (!test.questions || test.questions.length === 0) {
      toast({
        title: "No questions yet",
        description: "This test doesn't have questions. Pick another one.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTest(test);
    setIsTestActive(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining(test.duration * 60);
    setIsTimerRunning(true);
    setShowResults(false);
    toast({ title: "Test Started!", description: `Good luck with ${test.title}` });
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const nextQuestion = () => {
    if (selectedTest && currentQuestionIndex < selectedTest.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleSubmitTest = () => {
    if (!selectedTest) return;
    setIsTimerRunning(false);

    const correctAnswers = selectedTest.questions.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length;

    const score = Math.round((correctAnswers / selectedTest.questions.length) * 100);

    setTestResults({
      score,
      correctAnswers,
      totalQuestions: selectedTest.questions.length,
      timeTaken: selectedTest.duration * 60 - timeRemaining,
      breakdown: selectedTest.questions.map((q) => ({
        question: q.question,
        userAnswer: answers[q.id],
        correctAnswer: q.correctAnswer,
        isCorrect: answers[q.id] === q.correctAnswer,
        explanation: q.explanation,
      })),
    });

    setShowResults(true);
    setIsTestActive(false);

    toast({
      title: "Test Completed!",
      description: `You scored ${score}% (${correctAnswers}/${selectedTest.questions.length})`,
    });
  };

  const resetTest = () => {
    setSelectedTest(null);
    setIsTestActive(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
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
              style={{
                background: "radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(148,163,184,0.55))",
              }}
            >
              <Award className="w-10 h-10 text-slate-700 dark:text-slate-200" />
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${h1Grad}`}>Test Completed!</h1>
            <p className={`text-xl ${subText}`}>Here are your results for {selectedTest?.title}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className={`${gradientOutline} p-8 mb-8`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{testResults.score}%</div>
                  <div className={`text-sm ${subText}`}>Overall Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                    {testResults.correctAnswers}
                  </div>
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
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className={`${gradientOutline} p-6`}>
              <h3 className={`text-xl font-bold mb-6 ${titleText}`}>Detailed Breakdown</h3>
              <div className="space-y-6">
                {testResults.breakdown.map((item: any, index: number) => (
                  <div key={index} className="border-l-4 border-l-slate-300/30 dark:border-l-slate-600/60 pl-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.question}</h4>
                      {item.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="text-sm">
                      <span
                        className={
                          item.isCorrect
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        Your answer: {selectedTest?.questions[index]?.options[item.userAnswer] || "Not answered"}
                      </span>
                      {!item.isCorrect && (
                        <div className="text-emerald-600 dark:text-emerald-400 mt-1">
                          Correct answer: {selectedTest?.questions[index]?.options[item.correctAnswer]}
                        </div>
                      )}
                    </div>
                    <p className={`text-xs ${subText} bg-muted/30 p-2 rounded`}>{item.explanation}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex gap-4 justify-center mt-8">
            <Button onClick={() => startTest(selectedTest!)} size="lg" className={filledBtn}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retake Test
            </Button>
            <Button variant="outline" onClick={resetTest} size="lg" className={gradientOutline}>
              <ArrowRight className="w-4 h-4 mr-2" /> Browse Tests
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  /*********************
   * Active Test View
   *********************/
  if (isTestActive && selectedTest) {
    const currentQuestion = selectedTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / selectedTest.questions.length) * 100;

    return (
<div className="relative min-h-screen py-8 bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
        <NeutralBackdrop />
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className={`${gradientOutline} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className={`text-2xl font-bold ${h1Grad}`}>{selectedTest.title}</h1>
                  <p className={subText}>
                    Question {currentQuestionIndex + 1} of {selectedTest.questions.length}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-lg font-mono">
                    <Timer className="w-5 h-5 text-slate-500" />
                    <span className={timeRemaining < 300 ? "text-rose-500" : "text-slate-900 dark:text-slate-100"}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <Button size="sm" onClick={handleSubmitTest} className={filledBtn}>
                    Submit Test
                  </Button>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </Card>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <Card className={`${gradientOutline} p-8 mb-8`}>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={getDifficultyBadge(currentQuestion.difficulty)}>
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline">{currentQuestion.topic}</Badge>
                  </div>
                  <h2 className={`text-xl font-bold leading-relaxed ${titleText}`}>{currentQuestion.question}</h2>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const active = answers[currentQuestion.id] === index;
                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                          active
                            ? "border-slate-300/60 bg-white/10 text-slate-900 dark:text-slate-100"
                            : "border-white/20 hover:border-white/40 bg-muted/30"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                            active ? "border-slate-300 bg-slate-200 text-slate-900" : "border-slate-400/60"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="ml-3">{option}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0} className={gradientOutline}>
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {selectedTest.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    index === currentQuestionIndex
                      ? "bg-slate-700 text-white"
                      : answers[selectedTest.questions[index].id] !== undefined
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestionIndex === selectedTest.questions.length - 1 ? (
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

        {/* Stats Overview (neutral icons) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Tests Available", value: "25+", icon: BookOpen },
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

        {/* Mock Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTests.map((test, index) => (
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
                      <span className="font-medium text-slate-900 dark:text-slate-100">{test.attempts.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className={`text-sm font-medium ${titleText} mb-2`}>Topics Covered</h4>
                    <div className="flex flex-wrap gap-1">
                      {test.topics.slice(0, 3).map((topic) => (
                        <span key={topic} className="px-2 py-1 bg-slate-500/10 text-slate-500 dark:text-slate-300 text-xs rounded-md">
                          {topic}
                        </span>
                      ))}
                      {test.topics.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-xs rounded-md">+{test.topics.length - 3} more</span>
                      )}
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

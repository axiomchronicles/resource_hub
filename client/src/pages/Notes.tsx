import React, { useEffect, useState, useRef, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Eye,
  Star,
  Heart,
  Grid3X3,
  List,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import  SearchBar from "@/components/SearchBar";
import { useToast } from "@/hooks/use-toast";
import { QuickPreviewDrawer } from "@/components/QuickPreviewDrawer";

/* ------------------------------ Design Tokens ------------------------------ */
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200 py-1";

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

/* ------------------------------ Original Notes Component (updated) ------------------------------ */

type NoteSummary = {
  id: number | string;
  title: string;
  subject?: string;
  semester?: string;
  author?: string;
  downloads?: number;
  avg_rating?: number;
  pages?: number;
  tags?: string[];
  uploadDate?: string;
  preview?: string;
  thumbnail?: string;
  file_url?: string | null;
  first_file_url?: string | null;
  first_mime_type?: string | null;
  description?: string;
  total_downloads?: number;
  files?: {
    file_id: Array<{ file_id: string }>;
  };
  owner_name?: string;
};

export default function Notes() {
  const PAGE_SIZE = 12;

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("downloads");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [page, setPage] = useState(0); // 0-based page
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [savedNotes, setSavedNotes] = useState<Array<number | string>>([]);
  const [previewResource, setPreviewResource] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();
  const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

  // helper: robust parse of paginated response
  const parseResults = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results?.results)) return data.results.results;
    return [];
  };

  // fetch a page of notes from server
  const fetchNotesPage = async (pageToFetch = 0) => {
    try {
      setLoading(true);
      const offset = pageToFetch * PAGE_SIZE;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resources/notes?limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: {
          Authorization: storedToken ? `Token ${storedToken}` : "",
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch notes (${res.status})`);
      }
      const data = await res.json();
      console.log("Fetched notes data:", data);
      const fetched: NoteSummary[] = parseResults(data);

      if (pageToFetch === 0) {
        setNotes(fetched);
      } else {
        setNotes((prev) => [...prev, ...fetched]);
      }
      setHasMore(fetched.length === PAGE_SIZE);
      setPage(pageToFetch);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Unable to load notes", description: err?.message || "Something went wrong while fetching notes" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    await fetchNotesPage(page + 1);
  };

  const toggleSaveNote = (noteId: number | string) => {
    setSavedNotes((prev) => (prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]));
  };

  // Preview: fetch full resource details if API endpoint exists
  const openPreview = async (note: NoteSummary) => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resources/notes/${note.id}`, {
        headers: {
          Authorization: storedToken ? `Token ${storedToken}` : "",
        },
      });
      if (res.ok) {
        const full = await res.json();
        setPreviewResource(full);
      } else {
        setPreviewResource(note);
      }
    } catch (err) {
      console.warn("Could not fetch full note details, using summary", err);
      setPreviewResource(note);
    } finally {
      setLoading(false);
    }
  };

  // client-side filters applied to currently loaded notes
  const filteredNotes = notes.filter((note) => {
    const q = query.trim().toLowerCase();
    const matchesSearch =
      !q ||
      note.title.toLowerCase().includes(q) ||
      (note.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
      (note.subject || "").toLowerCase().includes(q);
    const matchesSemester = selectedSemester === "all" || note.semester === selectedSemester;
    const matchesSubject = selectedSubject === "all" || note.subject === selectedSubject;
    return matchesSearch && matchesSemester && matchesSubject;
  });

  // helper to map mime -> ext
  const mimeToExt = (mime?: string, fallbackUrl?: string) => {
    if (!mime && fallbackUrl) {
      const m = fallbackUrl.split("?")[0].split(".");
      if (m.length > 1) return m[m.length - 1];
      return "bin";
    }
    if (!mime) return "bin";
    const map: Record<string, string> = {
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/msword": "doc",
      "image/png": "png",
      "image/jpeg": "jpg",
      "video/mp4": "mp4",
      "application/zip": "zip",
    };
    return map[mime] || mime.split("/").pop() || "bin";
  };

  const handleDownloadBlob = async (resourceId: string | number, title: string, file_id?: string, mime?: string) => {
    setDownloadingId(String(resourceId));
    try {
      toast({ title: "Download started", description: title });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resources/notes/${resourceId}/download?file_id=${file_id}`, {
        headers: { Authorization: storedToken ? `Token ${storedToken}` : "" },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const ext = mimeToExt(mime || blob.type);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title?.replace(/\s+/g, "_") || resourceId}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", description: "Could not download file.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  /* ------------------------------ Blended Backdrop ------------------------------ */
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CombinedBackdrop = ({ playing = true }:{ playing?: boolean }) => (
    <>
      <FXDefs />
      {/* Indigo goo + particle field */}
      <IndigoBackdrop reduceMotion={prefersReducedMotion} playing={playing} />

      {/* Aurora-style rotating blobs overlaid to blend colors */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl bg-gradient-to-tr from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/40 dark:from-indigo-600/40 dark:via-fuchsia-600/40 dark:to-cyan-500/40"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-20 right-[-60px] h-80 w-80 rounded-full blur-3xl bg-gradient-to-tr from-emerald-400/30 via-sky-400/30 to-purple-400/30 dark:from-emerald-500/30 dark:via-sky-500/30 dark:to-purple-500/30"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
        />
      </div>
    </>
  );

  /* ------------------------------ Visual Bits & Rendering ------------------------------ */
  return (
    <div className="min-h-screen py-8 relative bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)]">
      <CombinedBackdrop />

      {/* Main content */}
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${h1Grad}`}>Study Notes</h1>
          <p className={`text-xl ${subText} mb-6`}>Discover comprehensive study materials shared by students</p>
          <div className="max-w-2xl">
            <SearchBar placeholder="Search notes by title, subject, or tags..." value={query} onChange={(e:any) => setQuery(e.target.value)} />
          </div>
        </motion.div>

        {/* Filters & Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col md:flex-row gap-4 mb-8 p-6 glass rounded-2xl border border-white/20">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                <SelectItem value="1st">1st Semester</SelectItem>
                <SelectItem value="2nd">2nd Semester</SelectItem>
                <SelectItem value="3rd">3rd Semester</SelectItem>
                <SelectItem value="4th">4th Semester</SelectItem>
                <SelectItem value="5th">5th Semester</SelectItem>
                <SelectItem value="6th">6th Semester</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Most Downloaded</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="pages">Page Count</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? filledBtn : undefined}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? filledBtn : undefined}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
          <p className="text-muted-foreground">Showing {filteredNotes.length} of {notes.length} loaded notes</p>
        </motion.div>

        {/* Notes Grid/List */}
        <AnimatePresence mode="wait">
          <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredNotes.map((note, index) => (
              <motion.div key={note.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -5 }}>
                <Card className={`glass border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-medium overflow-hidden ${viewMode === "list" ? "flex" : ""}`}>
                  {viewMode === "grid" ? (
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${h1Grad}`}>{note.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            {note.subject && <Badge variant="secondary">{note.subject}</Badge>}
                            {note.semester && <Badge variant="outline">{note.semester} Sem</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => toggleSaveNote(note.id)} className="shrink-0">
                          <Heart className={`w-4 h-4 ${savedNotes.includes(note.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{note.description}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {(note.tags || []).slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">#{tag}</span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Download className="w-4 h-4" />{note.total_downloads ?? 0}</span>
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{note.avg_rating ?? "-"}</span>
                        <span>{note.pages ?? "-"} pages</span>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openPreview(note)}>
                          <Eye className="w-4 h-4" /> Preview
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className={`flex-1 ${filledBtn}`}
                          disabled={downloadingId === String(note.id)}
                          onClick={async () => {
                            await handleDownloadBlob(note.id, note.title, note.files?.[0]?.file_id, note.first_mime_type);
                          }}
                        >
                          <Download className="w-4 h-4" /> {downloadingId === String(note.id) ? "Downloading..." : "Download"}
                        </Button>

                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full p-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg">{note.title}</h3>
                          <Button variant="ghost" size="icon" onClick={() => toggleSaveNote(note.id)}>
                            <Heart className={`w-4 h-4 ${savedNotes.includes(note.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          {note.subject && <Badge variant="secondary">{note.subject}</Badge>}
                          {note.semester && <Badge variant="outline">{note.semester} Sem</Badge>}
                          {note.author && <span className="text-sm text-muted-foreground">by {note.author}</span>}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{note.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Download className="w-4 h-4" />{note.total_downloads ?? 0}</span>
                            <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{note.avg_rating ?? "-"}</span>
                            <span>{note.pages ?? "-"} pages</span>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openPreview(note)}><Eye className="w-4 h-4" /> Preview</Button>
                            <Button variant="default" size="sm" className={filledBtn} onClick={async () => {
                              await handleDownloadBlob(note.id, note.title, note.files?.[0]?.file_id, note.first_mime_type);
                            }}><Download className="w-4 h-4" /> Download</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* No results */}
        {filteredNotes.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No notes found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
          </motion.div>
        )}

        {/* Load more */}
        <div className="mt-8 text-center">
          {loading ? (
            <Button size="lg" disabled className={filledBtn}>Loading...</Button>
          ) : hasMore ? (
            <Button size="lg" className={filledBtn} onClick={loadMore}>Load more</Button>
          ) : (
            <p className="text-sm text-muted-foreground">No more notes</p>
          )}
        </div>

        {/* Preview Drawer */}
        <QuickPreviewDrawer resource={previewResource} isOpen={!!previewResource} onClose={() => setPreviewResource(null)} />
      </div>
    </div>
  );
}

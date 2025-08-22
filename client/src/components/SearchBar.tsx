import React, { useState, useEffect, useRef, useId, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Presentation, ScrollText, ExternalLink, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ----------------------------- Types from version #1 -----------------------------
export type ResourceFile = {
  fileId?: string;
  file_id?: string; // legacy support
  name?: string;
  size?: number;
  mime_type?: string;
  fileUrl?: string;
  url?: string;
};

export type Resource = {
  id?: string | number;
  owner_name?: string;
  owner_profile_pic?: string; // optional profile pic URL
  title?: string;
  description?: string;
  type?: string;
  subject?: string;
  semester?: string;
  author?: string;
  uploadDate?: string;
  downloadUrl?: string;
  file_url?: string;
  first_file_url?: string;
  first_mime_type?: string;
  files?: ResourceFile[];
  fileSize?: string;
  total_size_human?: number; // optional preformatted size from API
  downloads?: number;
  total_downloads?: number; // legacy support
  rating?: number; // 0..5 (can be fractional) -> avg
  rating_count?: number; // number of ratings (optional)
  pages?: number;
  tags?: string[];
  difficulty?: "Easy" | "Medium" | "Hard" | string;
};

const QuickPreviewDrawerLazy = lazy(() => import("@/components/QuickPreviewDrawer"));

// --- UI design tokens copied from version #2 ---
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";

// -------------------------------- helper types ---------------------------------
interface SearchBarProps {
  placeholder?: string;
  className?: string;
  size?: "default" | "lg";
  onSelect?: (resource: Resource) => void; // parent can open QuickPreviewDrawer with the same Resource shape
  value?: string; // controlled value (compatible with your Notes.tsx)
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  withAurora?: boolean; // UI-only flag from #2
}

export interface SearchResult {
  id: string | number;
  title: string;
  type: string;
  subject?: string | null;
  semester?: string | null;
  preview?: string;
  first_file_url?: string | null;
  first_mime_type?: string | null;
  file_url?: string | null;
  owner_name?: string | null;
  owner_profile_pic?: string | null;
  downloads?: number;
  total_downloads?: number;
  rating?: number;
  avg_rating?: number;
  rating_count?: number;
  pages?: number;
  tags?: string[];
  description?: string | null;
  author?: string | null;
  uploadDate?: string | null;
  downloadUrl?: string | null;
  // results may return `files` as array or as { file_id: [{ file_id }] }
  files?: unknown;
  total_size_human?: number; // optional preformatted size from API
}

const API_URL = import.meta.env.VITE_API_URL;

// --- helpers to normalize files and map result -> Resource (from #1) ---
const normalizeFiles = (files: any): Resource["files"] => {
  if (!files) return undefined;
  if (Array.isArray(files)) {
    return files.map((f: any) => ({
      file_id: f?.file_id ?? f?.id ?? f?.fileId,
      name: f?.name,
      size: typeof f?.size === "number" ? f.size : undefined,
      mime_type: f?.mime_type,
      url: f?.url,
      fileUrl: f?.fileUrl,
    }));
  }
  if ((files as any)?.file_id && Array.isArray((files as any).file_id)) {
    return (files as any).file_id.map((o: any) => ({ file_id: o?.file_id }));
  }
  return undefined;
};

const mapResultToResource = (r: SearchResult): Resource => ({
  id: r.id,
  title: r.title,
  type: r.type,
  subject: r.subject ?? undefined,
  semester: r.semester ?? undefined,
  author: r.author ?? undefined,
  uploadDate: r.uploadDate ?? undefined,
  description: r.description ?? r.preview ?? undefined,
  first_file_url: r.first_file_url ?? undefined,
  first_mime_type: r.first_mime_type ?? undefined,
  file_url: r.file_url ?? undefined,
  owner_name: r.owner_name ?? undefined,
  owner_profile_pic: r.owner_profile_pic ?? undefined,
  downloads: r.downloads,
  total_downloads: r.total_downloads,
  rating:
    (typeof r.rating === "number" ? r.rating : undefined) ??
    (typeof r.avg_rating === "number" ? r.avg_rating : undefined),
  rating_count: r.rating_count,
  pages: r.pages,
  tags: r.tags,
  files: normalizeFiles(r.files),
  downloadUrl: r.downloadUrl ?? undefined,
  fileSize: r.total_size_human !== undefined ? String(r.total_size_human) : undefined,
});

// ------------------------------------ Icons ------------------------------------
const getIcon = (type: string) => {
  switch (type) {
    case "notes":
      return FileText;
    case "ppt":
      return Presentation;
    case "paper":
      return ScrollText;
    default:
      return FileText;
  }
};

// ----------------------------- Indigo Spinner (#2) -----------------------------
function IndigoSpinner({ size = 28 }: { size?: number }) {
  const gid = useId().replace(/[:]/g, "");
  const gradId = `indigo-grad-${gid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="animate-spin"
      role="status"
      aria-label="Loading"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" stroke="currentColor" className="opacity-10" strokeWidth="6" fill="none" />
      <path d="M42 24a18 18 0 0 0-18-18" stroke={`url(#${gradId})`} strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// -------------------------- Aurora Underlay (UI from #2) -------------------------
function AuroraUnderlay({ playing = true }: { playing?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className={cn(
          "absolute -top-16 left-8 h-52 w-52 rounded-full blur-3xl",
          "bg-[radial-gradient(closest-side,rgba(99,102,241,0.35),transparent_70%)]",
          playing ? "animate-slow-float" : ""
        )}
      />
      <div
        className={cn(
          "absolute -bottom-20 right-6 h-64 w-64 rounded-full blur-3xl",
          "bg-[radial-gradient(closest-side,rgba(34,211,238,0.25),transparent_70%)]",
          playing ? "animate-slower-float" : ""
        )}
      />
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,white_1px,transparent_1.2px)] [background-size:18px_18px]" />
    </div>
  );
}

// --------------------------------- Component ---------------------------------
export const SearchBar = ({
  placeholder = "Search for notes, presentations, papers...",
  className,
  size = "default",
  onSelect,
  value,
  onChange,
  withAurora = true,
}: SearchBarProps) => {
  // controlled & uncontrolled input (logic from #1)
  const [internalQuery, setInternalQuery] = useState("");
  const query = typeof value === "string" ? value : internalQuery;

  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalResource, setInternalResource] = useState<Resource | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1); // keyboard nav

  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

  // close dropdown on outside click (logic from #1)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // perform search with debounce + abort (logic from #1)
  useEffect(() => {
    if (!query.trim()) {
      setIsOpen(false);
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();
        const res = await fetch(`${API_URL}/resources/search?q=${encodeURIComponent(query)}&limit=8`, {
          headers: storedToken ? { Authorization: `Token ${storedToken}` } : {},
          signal: controllerRef.current.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch search results");
        const data = await res.json();
        const arr: SearchResult[] = Array.isArray((data as any)?.results)
          ? (data as any).results
          : Array.isArray(data)
          ? data
          : [];
        setResults(arr);
        setIsOpen(true);
        setActiveIndex(arr.length ? 0 : -1);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [query, storedToken]);

  // keep active item visible (UI nicety from #2)
  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return;
    const container = listRef.current;
    const item = container.querySelector<HTMLElement>(`[data-idx='${activeIndex}']`);
    if (!item) return;
    const cTop = container.scrollTop;
    const cBottom = cTop + container.clientHeight;
    const iTop = item.offsetTop;
    const iBottom = iTop + item.offsetHeight;
    if (iTop < cTop) container.scrollTop = iTop - 8;
    else if (iBottom > cBottom) container.scrollTop = iBottom - container.clientHeight + 8;
  }, [activeIndex, isOpen]);

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange ? onChange(e) : setInternalQuery(e.target.value);
  };

  const clearInput = () => {
    if (typeof value === "string" && onChange) {
      // controlled: emit a minimal synthetic change
      onChange({ target: { value: "" } } as any);
    } else {
      setInternalQuery("");
    }
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const chooseByIndex = (idx: number) => {
    if (idx < 0 || idx >= results.length) return;
    const resource = mapResultToResource(results[idx]);
    if (onSelect) {
      onSelect(resource); // parent opens its own QuickPreviewDrawer
    } else {
      setInternalResource(resource); // fallback drawer inside SearchBar
    }
    setIsOpen(false);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) setIsOpen(true);
    if (!results.length) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseByIndex(activeIndex === -1 ? 0 : activeIndex);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      {/* Input + glow wrapper (UI from #2) */}
      <div className="relative">
        {withAurora && <div className="absolute inset-0 rounded-[1.35rem] -z-10"><AuroraUnderlay /></div>}

        <Search
          className={cn(
            "absolute left-4 text-indigo-500/80 dark:text-indigo-300",
            size === "lg" ? "top-6 w-6 h-6" : "top-4 w-5 h-5"
          )}
        />

        <div className={cn("relative overflow-hidden", gradientOutline, size === "lg" ? "rounded-3xl" : "rounded-2xl")}>
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            aria-expanded={isOpen}
            aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
            className={cn(
              "pl-12 pr-24 bg-white/60 dark:bg-black/30 backdrop-blur-xl border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0",
              size === "lg" ? "h-16 text-lg" : "h-14",
              size === "lg" ? "rounded-3xl" : "rounded-2xl"
            )}
          />

          {/* right controls: loading + clear (UI from #2) */}
          <div className="absolute inset-y-0 right-2 flex items-center gap-2">
            {loading && (
              <div className="flex items-center justify-center mr-1 text-indigo-600 dark:text-indigo-300">
                <IndigoSpinner size={22} />
              </div>
            )}
            {query && !loading && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearInput}
                aria-label="Clear search"
                className={cn("h-9 w-9", iconBtn, "!bg-gradient-to-r from-indigo-600 to-cyan-600")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "absolute top-full left-0 right-0 mt-2 z-50 shadow-2xl",
              gradientOutline,
              "backdrop-blur-xl bg-white/70 dark:bg-gray-900/50",
              "rounded-2xl"
            )}
          >
            <div ref={listRef} className="p-2 max-h-96 overflow-y-auto">
              {loading && (
                <div className="py-10 text-center text-indigo-600 dark:text-indigo-300">
                  <div className="mx-auto mb-3 w-7 h-7"><IndigoSpinner size={28} /></div>
                  <p className="text-sm">Searching…</p>
                </div>
              )}

              {!loading && error && (
                <div className="p-8 text-center text-red-500">
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <ul role="listbox" aria-label="Search results" className="space-y-1">
                  {results.map((result, index) => {
                    const Icon = getIcon(result.type);
                    const active = index === activeIndex;
                    return (
                      <li key={result.id} id={`result-${index}`} data-idx={index}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => chooseByIndex(index)}
                          className={cn(
                            "w-full p-3 rounded-xl text-left transition-all group",
                            "hover:bg-gradient-to-r hover:from-indigo-600/10 hover:via-fuchsia-600/10 hover:to-cyan-600/10",
                            active && "ring-2 ring-indigo-400/60 bg-indigo-500/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10">
                              <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-medium text-foreground truncate">{result.title}</h3>
                                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {(result.subject || result.semester) && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {result.subject || ""}
                                  {result.semester ? ` • ${result.semester} Semester` : ""}
                                </p>
                              )}
                              {result.preview && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.preview}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!loading && !error && results.length === 0 && query.length > 0 && (
                <div className="p-10 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for “{query}”.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback QuickPreviewDrawer if parent omitted onSelect (logic from #1) */}
      <Suspense fallback={null}>
        <QuickPreviewDrawerLazy
          resource={internalResource}
          isOpen={!!internalResource}
          onClose={() => setInternalResource(null)}
        />
      </Suspense>
    </div>
  );
};

export default SearchBar;

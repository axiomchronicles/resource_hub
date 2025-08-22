import React, { useEffect, useMemo, useState, useCallback, lazy } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Download,
  Heart,
  Share2,
  Eye,
  Star as StarIcon,
  Clock,
  FileText,
  FileIcon,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  StarHalf,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";

const Aurora = lazy(() => import("@/components/Aurora"));

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
  fileSize?: string;        // optional preformatted size from API
  downloads?: number;
  total_downloads?: number; // legacy support
  rating?: number;         // 0..5 (can be fractional) -> avg
  rating_count?: number;   // number of ratings (optional)
  pages?: number;
  tags?: string[];
  difficulty?: "Easy" | "Medium" | "Hard" | string;
};

interface QuickPreviewDrawerProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------- design tokens you provided ----------------
const filledBtn =
  "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.7)] ring-1 ring-black/5 dark:ring-white/10 border-0 hover:opacity-95 transition-all";
const iconBtn = `${filledBtn} !w-10 !h-10 p-0 rounded-xl`;
const gradientOutline =
  "relative bg-transparent text-slate-700 dark:text-indigo-200 border border-slate-300/40 dark:border-indigo-300/20 before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-indigo-500/40 before:via-fuchsia-500/40 before:to-cyan-500/40 before:-z-10";
const subText = "text-slate-700/80 dark:text-indigo-200/75";
const titleText = "text-slate-900 dark:text-indigo-100";
const h1Grad =
  "bg-clip-text text-transparent bg-[length:200%_100%] bg-gradient-to-r from-indigo-700 via-indigo-800 to-cyan-700 dark:from-indigo-200 dark:via-indigo-400 dark:to-cyan-200";


/* ----------------------------- utilities ----------------------------- */

const API_URL = import.meta.env.VITE_API_URL;

const formatFileSize = (size?: number): string => {
  if (!size || size < 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = size;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case "Easy":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "Hard":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

const extFromMime = (mime?: string) => {
  if (!mime) return "bin";
  const part = mime.split("/").pop();
  if (!part) return "bin";
  // common remaps
  if (part.includes("vnd.ms-powerpoint") || part.includes("presentation")) return "pptx";
  if (part.includes("officedocument.wordprocessingml")) return "docx";
  if (part.includes("officedocument.spreadsheetml")) return "xlsx";
  return part;
};

const useAuthToken = () =>
  useMemo(() => localStorage.getItem("token") || sessionStorage.getItem("token") || "", []);

/* ----------------------------- component ----------------------------- */

export const QuickPreviewDrawer: React.FC<QuickPreviewDrawerProps> = ({
  resource,
  isOpen,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { toggleFavorite, favoriteResources, addNotification } = useAppStore();
  const { toast } = useToast();
  const token = useAuthToken();
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Rating states
  const [userRating, setUserRating] = useState<number | null>(null); // current user's rating (1..5) or null
  const [avgRating, setAvgRating] = useState<number>(resource?.rating ?? 0);
  const [ratingCount, setRatingCount] = useState<number>(resource?.rating_count ?? 0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingBreakdown, setRatingBreakdown] = useState<number[] | null>(null); // counts for [1..5] or [5..1], normalized below

  // small UX: preview on hover / keyboard
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const isFavorite = resource ? favoriteResources.includes(String(resource.id)) : false;

  /* ---------------- fetch /auth/me profile ---------------- */
  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) setProfilePic(data.user.profile_pic?.file_url || null);
      } catch (e) {
        console.error("Failed to fetch profile:", e);
      }
    };
    fetchProfile();
  }, [token]);

  // Normalize breakdown from various server shapes
  const normalizeBreakdown = (raw: unknown): number[] | null => {
    if (!raw) return null;
    if (Array.isArray(raw)) {
      if (raw.length === 5 && raw.every((n) => typeof n === "number")) return raw as number[];
      return null;
    }
    if (typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const arr = [1, 2, 3, 4, 5].map((k) => Number(obj[String(k)] ?? 0));
      return arr;
    }
    return null;
  };

  // shared function to fetch rating summary
  const fetchRatingSummary = useCallback(async () => {
    if (!resource) return;
    try {
      const res = await fetch(`${API_URL}/resources/notes/${resource.id}/rating/`, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setAvgRating(typeof data.avg_rating === "number" ? data.avg_rating : (resource?.rating ?? 0));
      setRatingCount(typeof data.rating_count === "number" ? data.rating_count : (resource?.rating_count ?? 0));
      setUserRating(data.user_rating ?? null);
      const bd = normalizeBreakdown(data.breakdown ?? data.histogram ?? data.counts);
      setRatingBreakdown(bd);
    } catch (err) {
      console.error("Failed to fetch rating summary:", err);
    }
  }, [resource, token]);

  // fetch rating summary & user's rating when resource opens / changes
  useEffect(() => {
    if (!resource || !isOpen) {
      setUserRating(null);
      setAvgRating(resource?.rating ?? 0);
      setRatingCount(resource?.rating_count ?? 0);
      setRatingBreakdown(null);
      return;
    }
    let cancelled = false;
    const wrapped = async () => {
      if (cancelled) return;
      await fetchRatingSummary();
    };
    wrapped();
    return () => {
      cancelled = true;
    };
  }, [resource, isOpen, fetchRatingSummary]);

  useEffect(() => {
    setCurrentPage(1);
    setZoom(100);
    if (resource) {
      setIsLoadingPreview(true);
      const t = setTimeout(() => setIsLoadingPreview(false), 350);
      return () => clearTimeout(t);
    } else {
      setIsLoadingPreview(false);
    }
  }, [resource]);

  // derive best file URL & mime
  const fileUrl = useMemo(() => {
    if (!resource) return null;
    return (
      resource.first_file_url ||
      resource.file_url ||
      resource.files?.[0]?.fileUrl ||
      resource.files?.[0]?.url ||
      null
    );
  }, [resource]);

  const fileMime = useMemo(() => {
    if (!resource) return null;
    return resource.first_mime_type || resource.files?.[0]?.mime_type || null;
  }, [resource]);

  // ---------- Stars component (safe Tailwind sizes) ----------
  const Stars = ({
    value = 0,
    size = 4,
    interactive = false,
    onRate,
    loading,
  }: {
    value?: number;
    size?: 3 | 4 | 5 | 6; // supported sizes
    interactive?: boolean;
    onRate?: (v: number) => void;
    loading?: boolean;
  }) => {
    const v = Math.max(0, Math.min(5, value));
    const full = Math.floor(v);
    const half = v - full >= 0.5;

    const sizeClass =
      size === 3 ? "w-3 h-3" :
      size === 5 ? "w-5 h-5" :
      size === 6 ? "w-6 h-6" : "w-4 h-4";

    const starButton = (i: number) => {
      const idx = i + 1;
      const fill = idx <= full ? true : idx === full + 1 && half;
      const clickable = interactive && !loading;
      return (
        <button
          key={`star-${i}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (!clickable) return;
            onRate?.(idx);
          }}
          aria-label={`Rate ${idx} star`}
          className={`p-0 m-0 leading-none ${clickable ? "cursor-pointer" : "cursor-default"}`}
        >
          <StarIcon
            className={`${sizeClass} ${fill ? "text-yellow-500 fill-current" : "text-muted-foreground"}`}
            aria-hidden
          />
        </button>
      );
    };

    return (
      <div className="flex items-center justify-center gap-0.5" aria-live="polite">
        {Array.from({ length: 5 }).map((_, i) => starButton(i))}
      </div>
    );
  };

  // ---------- Rating meter (compact visualization) ----------
  const RatingMeter: React.FC<{ value: number }> = ({ value }) => {
    const pct = Math.max(0, Math.min(100, Math.round((value / 5) * 100)));
    return (
      <div className="relative w-full min-w-0">
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {/* ticks at 1..4 */}
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-2 w-px bg-muted-foreground/30" />
          ))}
        </div>
      </div>
    );
  };

  const handleFavorite = () => {
    if (!resource) return;
    toggleFavorite(String(resource.id));
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: resource?.title,
    });
  };

  // handle user rating click (POST/DELETE)
  const handleRate = async (value: number) => {
    if (!resource) return;
    if (!token) {
      toast({ title: "Sign in required", description: "Please sign in to rate this note." });
      return;
    }
    const doDelete = userRating === value;
    setRatingLoading(true);

    try {
      let res;
      if (doDelete) {
        res = await fetch(`${API_URL}/resources/notes/${resource.id}/rate/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` },
        });
      } else {
        res = await fetch(`${API_URL}/resources/notes/${resource.id}/rate/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ value }),
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server responded ${res.status} ${text}`);
      }

      const data = await res.json();
      // expected shape: { ok, user_rating, avg_rating, rating_count }
      setUserRating(data.user_rating ?? null);
      setAvgRating(typeof data.avg_rating === "number" ? data.avg_rating : avgRating);
      setRatingCount(typeof data.rating_count === "number" ? data.rating_count : ratingCount);
      const bd = normalizeBreakdown(data.breakdown ?? data.histogram ?? data.counts);
      if (bd) setRatingBreakdown(bd);

      // refresh authoritative summary
      await fetchRatingSummary();

      toast({
        title: doDelete ? "Rating removed" : "Thanks for your rating",
        description: doDelete ? "Your rating was removed." : `You rated ${value} star(s).`,
      });
    } catch (err) {
      console.error("Rating error:", err);
      toast({
        title: "Could not submit rating",
        description: "Try again later.",
        variant: "destructive",
      });
    } finally {
      setRatingLoading(false);
      setHoverRating(null);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;

    addNotification({
      type: "download",
      title: "Download Started",
      message: `Downloading ${resource.title}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      resourceId: String(resource.id),
    });
    toast({ title: "Download started", description: resource.title });

    try {
      const url =
        resource.downloadUrl ||
        `${API_URL}/resources/notes/${resource.id}/download?file_id=${resource.files?.[0]?.file_id}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);

      // optimistic downloads increment
      if (typeof resource.downloads === "number") resource.downloads += 1;

      try {
        if (resource.id) {
          fetch(`${API_URL}/resources/${resource.id}/track_download`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Token ${token}` } : {}),
            },
            body: JSON.stringify({ ts: new Date().toISOString() }),
          }).catch(() => {});
        }
      } catch {
        // ignore tracking errors
      }

      const blob = await res.blob();
      const ext = extFromMime(resource.first_mime_type || blob.type || "application/octet-stream");
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${resource.title?.replace(/\s+/g, "_") || resource.id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      toast({
        title: "Download failed",
        description: "Could not download file.",
        variant: "destructive",
      });
    }
  };

  // keyboard shortcuts while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!resource) return;
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName || "")) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPage((p) => Math.min(resource.pages || 1, p + 1));
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(200, z + 10));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(50, z - 10));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, resource]);

  const renderPreviewContent = useCallback(() => {
    if (!resource) return null;
    if (isLoadingPreview) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[420px] w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      );
    }

    // pdf
    if (fileUrl && ((fileMime && fileMime.includes("pdf")) || fileUrl.toLowerCase().endsWith(".pdf"))) {
      return (
        <div className="space-y-4">
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <div
              className="w-full h-[650px] origin-top"
              style={{
                transform: `scale(${zoom / 100})`,
              }}
            >
              {/* sandbox avoids same-origin embed issues; still allows viewing */}
              <iframe
                src={`${fileUrl}#view=FitH`}
                title={resource.title}
                className="w-full h-[650px]"
                style={{ border: "none" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title="Previous page (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm px-2">
                {currentPage} / {resource.pages || 1}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setCurrentPage((p) => Math.min(resource.pages || 1, p + 1))}
                disabled={currentPage >= (resource.pages || 1)}
                title="Next page (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                title="Zoom out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm px-1">{zoom}%</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                title="Zoom in (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            If the PDF doesn’t render,{" "}
            <a className="underline" href={fileUrl} target="_blank" rel="noreferrer">
              open it in a new tab
            </a>{" "}
            or try downloading.
          </p>
        </div>
      );
    }

    // image
    if (fileUrl && fileMime?.startsWith("image")) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden bg-black">
            <img
              src={fileUrl}
              alt={resource.title}
              className="w-full h-[520px] object-contain bg-black"
            />
          </div>
        </div>
      );
    }

    // video
    if (fileUrl && fileMime?.startsWith("video")) {
      return (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video src={fileUrl} controls className="w-full h-[520px] bg-black" />
          </div>
        </div>
      );
    }

    // other docs (ppt, docx, etc.)
    return (
      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-8 text-center">
          <FileIcon className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">{resource.title}</p>
          <p className="text-sm text-muted-foreground">
            {resource.first_mime_type || fileMime || "Document"}
          </p>
          {fileUrl && (
            <p className="mt-4">
              <a className="underline" href={fileUrl} target="_blank" rel="noreferrer">
                Open file
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }, [resource, isLoadingPreview, fileUrl, fileMime, zoom, currentPage]);

  const firstFileSize = useMemo(() => {
    if (!resource) return undefined;
    const s = resource.files?.[0]?.size;
    return typeof s === "number" ? formatFileSize(s) : resource.fileSize;
  }, [resource]);

  const initials =
    (resource?.owner_name || "A")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // helper: compute percent for histogram bars (returns 0..100)
  const percentFor = (count: number, total: number) =>
    total <= 0 ? 0 : Math.round((count / total) * 100);

  return (
    // NOTE: main fix is here — make DrawerContent a column flex container and ensure the inner
    // content area can grow and scroll. This prevents long descriptions from overflowing and
    // keeps all controls reachable.
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] bg-[radial-gradient(40rem_20rem_at_top,theme(colors.indigo.500/8),transparent),radial-gradient(30rem_20rem_at_bottom_right,theme(colors.fuchsia.500/8),transparent)] flex flex-col">
        <Aurora />

        {/* Make this wrapper flex-1 + overflow-y-auto so content can scroll when tall */}
        <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto scrollbar">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DrawerTitle className={`${h1Grad}text-left text-xl font-bold`}>
                  {resource?.title}
                </DrawerTitle>
                <DrawerDescription className="text-left mt-2 break-words whitespace-pre-wrap">
                  {resource?.description}
                </DrawerDescription>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFavorite}
                  className={isFavorite ? "text-red-500" : ""}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link copied", description: "Share URL copied to clipboard." });
                  }}
                  title="Copy share link"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button onClick={handleDownload} size="sm" title="Download file" className={`flex-1 ${filledBtn}`}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>

                <DrawerClose asChild>
                  <Button variant="outline" size="sm" title="Close">
                    <X className="w-4 h-4" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Preview Area */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderPreviewContent()}
                </motion.div>
              </div>

              {/* Details Sidebar */}
              <div className="space-y-6">
                {/* Author */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
                >
                {!resource ? (
                  <Avatar>
                    <AvatarFallback>…</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar>
                    {resource.owner_profile_pic ? (
                      <AvatarImage src={resource.owner_profile_pic} alt="Profile picture" />
                    ) : (
                      <>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${resource.owner_name || "anon"}`}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                )}

                  <div>
                    <p className="font-medium">{resource?.owner_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">Author</p>
                  </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                    <div className="flex items-center justify-center gap-2">
                      <div className="p-2 rounded-full bg-muted flex items-center justify-center">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-xl font-semibold tabular-nums">
                        {resource?.total_downloads ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2 tracking-wide uppercase">
                      Downloads
                    </p>
                  </div>
                  {/* --- Responsive Rating Card (meter + interactive stars) --- */}
                  <div className="p-3 bg-muted/50 rounded-lg w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Left: average + meter */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                          {Number.isFinite(avgRating) ? avgRating.toFixed(1) : "0.0"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <RatingMeter value={avgRating || 0} />
                          <div className="text-[11px] text-muted-foreground mt-1 truncate">
                            {ratingCount} {ratingCount === 1 ? "vote" : "votes"}
                          </div>
                        </div>
                      </div>

                      {/* Right: interactive stars */}
                      <div className="sm:ml-auto w-full sm:w-auto">
                        <div className="text-[11px] text-muted-foreground mb-1 text-center sm:text-right">
                          Your rating
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                          <div
                            onMouseLeave={() => setHoverRating(null)}
                            className="flex items-center"
                          >
                            <Stars
                              value={hoverRating ?? (userRating ?? 0)}
                              interactive={true}
                              onRate={(v) => handleRate(v)}
                              loading={ratingLoading}
                            />
                          </div>
                          {ratingLoading && <span className="text-xs">Saving…</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 text-center sm:text-right">
                          {ratingLoading
                            ? "Saving..."
                            : hoverRating
                            ? `Rate ${hoverRating} / 5`
                            : userRating
                            ? `You rated ${userRating} / 5`
                            : "You haven't rated this yet"}
                        </div>
                      </div>
                    </div>

                    {/* Optional: breakdown (collapsible) */}
                    {ratingBreakdown && (
                      <details className="mt-3 group">
                        <summary className="text-[11px] leading-5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                          Rating details
                        </summary>
                        <div className="mt-2 space-y-1">
                          {/* Show 5 → 1 rows */}
                          {([5, 4, 3, 2, 1] as const).map((star) => {
                            // ratingBreakdown assumed [1..5]
                            const idx = star - 1;
                            const count = ratingBreakdown[idx] ?? 0;
                            const pct = percentFor(count, ratingCount);
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <div className="w-10 shrink-0 text-xs text-muted-foreground flex items-center justify-end gap-1">
                                  <span className="font-medium">{star}</span>
                                  <StarIcon className="w-3 h-3 text-yellow-500 fill-current" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="h-2 w-full bg-muted/30 rounded-sm overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                                <div className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                                  {count}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                  {/* --- End rating card --- */}
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Subject:</span>
                    <Badge variant="secondary">{resource?.subject || "-"}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Semester:</span>
                    <Badge variant="outline">{resource?.semester || "-"}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Type:</span>
                    <Badge variant="outline" className="uppercase">
                      {resource?.first_mime_type?.split?.("/").pop?.() || "Document"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Size:</span>
                    <span>{firstFileSize ?? "-"}</span>
                  </div>

                  {resource?.pages && (
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Pages:</span>
                      <span>{resource.pages}</span>
                    </div>
                  )}

                  {resource?.difficulty && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Difficulty:</span>
                      <Badge className={getDifficultyColor(resource.difficulty)}>
                        {resource.difficulty}
                      </Badge>
                    </div>
                  )}

                  {resource?.uploadDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Uploaded: {new Date(resource.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {resource?.tags?.length ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={() => {
                            toast({ title: "Filter by tag", description: `Tag: ${tag}` });
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="space-y-2">
                  <Button className={`w-full ${filledBtn}`} onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Download
                    {firstFileSize ? ` (${firstFileSize})` : ""}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleFavorite}>
                    <Heart
                      className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current text-red-500" : ""}`}
                    />
                    {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default QuickPreviewDrawer;

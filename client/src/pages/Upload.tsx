import React, { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios, { AxiosError } from "axios";
import {
  Upload as UploadIcon,
  FileText,
  Presentation,
  ScrollText,
  X,
  Check,
  AlertCircle,
  Tag,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast"; // add this at the top

import {
  uploadSimpleApi,
  initiateChunkedApi,
  uploadChunkApi,
  completeChunkApi,
  createResourceApi,
} from "@/api/upload";

/* ---------- Types ---------- */
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number; // 0-100
  status: "queued" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  // fileRef is kept in-memory only (not serialized anywhere)
  fileRef?: File;
  uploadedUrl?: string; // populated after successful upload (or an id returned by server)
  uploadedId?: string; // backend resource file id
}

/* ---------- Config ---------- */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_FILES = 12;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunk size for resumable uploads
const CONCURRENCY = 3;
const MAX_RETRIES = 3;

/* ---------- Helpers ---------- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const generateId = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2, 9);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* map mime to icon */
const fileTypeIcons: Record<string, any> = {
  "application/pdf": FileText,
  "application/vnd.ms-powerpoint": Presentation,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    Presentation,
  "application/msword": ScrollText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ScrollText,
};

/* suggested tags */
const suggestedTags = [
  "algorithms",
  "data-structures",
  "programming",
  "java",
  "python",
  "cpp",
  "oop",
  "database",
  "sql",
  "machine-learning",
  "ai",
  "web-development",
  "mathematics",
  "calculus",
  "linear-algebra",
  "physics",
  "chemistry",
  "engineering",
  "computer-networks",
  "operating-systems",
  "software-engineering",
];

/* ---------- Simple Toasts (local) ---------- */
type ToastItem = { id: string; message: string; type: "info" | "success" | "error" };

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (message: string, type: ToastItem["type"] = "info", ttl = 3500) => {
    const id = generateId();
    setToasts((t) => [...t, { id, message, type }] );
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  };
  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, push, remove };
}

/* ---------- Component ---------- */

export default function Upload() {
  /* form state */
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  /* local UI states */
  const [isPublishing, setIsPublishing] = useState(false);

  /* toasts */
  const { toasts, push: pushToast } = useToasts();

  /* upload queue & control */
  const uploadQueueRef = useRef<string[]>([]); // file ids to upload
  const runningUploadsRef = useRef(0);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  /* refs */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Drag & file selection ---------- */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Max ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFiles = (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;

    // prevent too many files
    const allowedRemaining = MAX_FILES - files.length;
    const incoming = fileList.slice(0, allowedRemaining);

    const newFiles: UploadedFile[] = incoming.map((file) => {
      const id = generateId();
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "queued",
        fileRef: file,
      };
    });

    // validate and set errors inline
    const validated = newFiles.map((f) => {
      const err = validateFile(f.fileRef!);
      if (err) {
        return { ...f, status: "error" as UploadedFile["status"], error: err };
      }
      return f;
    });

    setFiles((prev) => [...prev, ...validated]);

    // auto-suggest title from first valid file
    if (!title && incoming[0]) {
      const fileName = incoming[0].name.replace(/\.[^/.]+$/, "");
      setTitle(fileName.replace(/[-_]/g, " "));
    }

    // enqueue valid files
    validated.forEach((f) => {
      if (f.status === "queued") {
        uploadQueueRef.current.push(f.id);
      }
    });

    // kick off processing
    startUploadQueue();
  };

  /* ---------- Upload queue / concurrency ---------- */
  const startUploadQueue = async () => {
    // if already running up to concurrency, do nothing
    while (
      runningUploadsRef.current < CONCURRENCY &&
      uploadQueueRef.current.length > 0
    ) {
      const fileId = uploadQueueRef.current.shift()!;
      runningUploadsRef.current += 1;
      // don't await here — fire and forget, we'll manage concurrency via runningUploadsRef
      uploadFileById(fileId)
        .catch((err) => {
          console.error("upload error:", err);
        })
        .finally(() => {
          runningUploadsRef.current -= 1;
          // continue processing queue
          if (uploadQueueRef.current.length > 0) {
            startUploadQueue();
          }
        });
    }
  };

  /* helper to re-read latest files state (since closures might capture stale `files`) */
  const findFileFromState = (id: string) =>
    new Promise<UploadedFile | undefined>((resolve) => {
      setFiles((prev) => {
        resolve(prev.find((p) => p.id === id));
        return prev;
      });
    });

  /* ---------- Parse error message (keeps using axios shape) ---------- */
  const parseErrorMessage = (err: any) => {
    if ((err as any)?.isAxiosError || (err as AxiosError)?.response) {
      const ae = err as AxiosError;
      return (ae.response as any)?.data?.message || ae.message || "Network error";
    }
    if (err instanceof Error) return err.message;
    return String(err);
  };

  /* ---------- Normalize backend upload responses ---------- */
  const normalizeUploadResponse = (resp: any) => {
    // resp might be axios resp or raw data
    const data = resp?.data ?? resp ?? {};
    // possible fields: fileUrl, file_url, url, id, fileId, file_id
    const fileUrl = data.fileUrl || data.file_url || data.url || data.fileUrl || data.file_url;
    const fileId = data.fileId || data.file_id || data.id || data.uuid || data.fileId;
    return { ...data, fileUrl, fileId };
  };

  /* ---------- Upload logic (with chunked support) ---------- */
  const uploadFileById = async (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f))
    );

    const f = files.find((x) => x.id === fileId) || (await findFileFromState(fileId));
    if (!f || !f.fileRef) {
      setFiles((prev) =>
        prev.map((p) => (p.id === fileId ? { ...p, status: "error", error: "File missing" } : p))
      );
      return;
    }

    const file = f.fileRef;

    try {
      let uploadedMeta: { fileUrl?: string; fileId?: string } | null = null;

      if (file.size <= CHUNK_SIZE) {
        // simple upload
        uploadedMeta = await uploadSimple(fileId, file);
      } else {
        // chunked/resumable
        uploadedMeta = await uploadChunked(fileId, file);
      }

      // mark completed and store returned ids/urls
      setFiles((prev) =>
        prev.map((p) =>
          p.id === fileId
            ? {
                ...p,
                status: "completed",
                progress: 100,
                uploadedUrl: uploadedMeta?.fileUrl,
                uploadedId: uploadedMeta?.fileId,
              }
            : p
        )
      );

      pushToast(`${f.name} uploaded successfully`, "success");
    } catch (err: any) {
      const message = parseErrorMessage(err);
      setFiles((prev) =>
        prev.map((p) =>
          p.id === fileId ? { ...p, status: "error", error: message } : p
        )
      );
      pushToast(`Failed to upload ${f?.name || fileId}: ${message}`, "error");
    }
  };

  /* ---------- Simple upload (single request) ---------- */
  const uploadSimple = async (fileId: string, file: File) => {
    const controller = new AbortController();
    abortControllersRef.current[fileId] = controller;

    const tryUpload = async (attempt = 0): Promise<any> => {
      try {
        const resp = await uploadSimpleApi(file, {
          onUploadProgress: (progressEvent: import("axios").AxiosProgressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded! * 100) / ((progressEvent.total ?? file.size) || file.size)
            );
            setFiles((prev) => prev.map((p) => (p.id === fileId ? { ...p, progress: percent } : p)));
          },
          signal: controller.signal,
        });

        const norm = normalizeUploadResponse(resp);
        return { fileUrl: norm.fileUrl, fileId: norm.fileId };
      } catch (err) {
        // axios cancel detection
        if ((axios as any).isCancel && (axios as any).isCancel(err)) throw new Error("Upload cancelled by user");
        // fallback for axios 1.x CanceledError
        if ((err as any)?.code === "ERR_CANCELED") throw new Error("Upload cancelled by user");

        if (attempt < MAX_RETRIES) {
          const wait = 2 ** attempt * 500;
          await sleep(wait);
          return tryUpload(attempt + 1);
        }
        throw err;
      }
    };

    return tryUpload();
  };

  /* ---------- Chunked upload (large files) ---------- */
  const uploadChunked = async (fileId: string, file: File) => {
    // 1) initiate
    const initResp = await initiateChunkedApi(file.name, file.type, file.size);
    const uploadId = initResp?.uploadId || initResp?.data?.uploadId;
    if (!uploadId) throw new Error("Failed to initiate chunk upload");

    const controller = new AbortController();
    abortControllersRef.current[fileId] = controller;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // upload each chunk sequentially to keep ordering predictable (could be parallelized)
    for (let idx = 0; idx < totalChunks; idx++) {
      const start = idx * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      let attempt = 0;
      let uploaded = false;
      while (attempt <= MAX_RETRIES && !uploaded) {
        try {
          await uploadChunkApi(uploadId, chunk, idx, totalChunks, {
            signal: controller.signal,
            onUploadProgress: (e: import("axios").AxiosProgressEvent) => {
              const chunkProgress = (e.loaded ?? 0) / ((e.total ?? chunk.size) || chunk.size);
              const overall = Math.round(((idx + chunkProgress) / totalChunks) * 100);
              setFiles((prev) => prev.map((p) => (p.id === fileId ? { ...p, progress: overall } : p)));
            },
          });

          uploaded = true;
        } catch (err) {
          if ((axios as any).isCancel && (axios as any).isCancel(err)) throw new Error("Upload cancelled by user");
          if ((err as any)?.code === "ERR_CANCELED") throw new Error("Upload cancelled by user");

          attempt++;
          if (attempt > MAX_RETRIES) throw err;
          const wait = 2 ** attempt * 500;
          await sleep(wait);
        }
      }
    }

    // complete
    const completeResp = await completeChunkApi(uploadId);
    const norm = normalizeUploadResponse(completeResp);
    return { fileUrl: norm.fileUrl, fileId: norm.fileId };
  };

  /* ---------- Cancel / Retry ---------- */
  const cancelUpload = (fileId: string) => {
    const controller = abortControllersRef.current[fileId];
    if (controller) {
      controller.abort();
    }
    // mark cancelled
    setFiles((prev) => prev.map((p) => (p.id === fileId ? { ...p, status: "cancelled", error: "Cancelled" } : p)));
    // remove from queue if present
    uploadQueueRef.current = uploadQueueRef.current.filter((id) => id !== fileId);
  };

  const retryFile = (fileId: string) => {
    setFiles((prev) =>
      prev.map((p) => (p.id === fileId ? { ...p, status: "queued", progress: 0, error: undefined } : p))
    );
    uploadQueueRef.current.push(fileId);
    startUploadQueue();
  };

  const removeFile = (fileId: string) => {
    cancelUpload(fileId);
    setFiles((prev) => prev.filter((p) => p.id !== fileId));
  };

  /* ---------- Form submit: send metadata + uploaded file references to backend ---------- */
  const allFilesUploaded = files.length > 0 && files.every((f) => f.status === "completed");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    if (!title || !subject || !semester) {
      pushToast("Title, Subject and Semester are required.", "error");
      return;
    }
    if (files.length === 0) {
      pushToast("Please upload at least one file.", "error");
      return;
    }
    if (!allFilesUploaded) {
      pushToast("Please wait for all files to finish uploading (or resolve errors).", "info");
      return;
    }

    // collect uploaded file metadata (prefer fileId if available, else fileUrl)
    const payloadFiles = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      fileId: f.uploadedId || undefined,
      fileUrl: f.uploadedUrl || undefined,
    }));

    try {
      setIsPublishing(true);
      pushToast("Publishing resource...", "info");

      const resp = await createResourceApi({
        title,
        description,
        subject,
        semester,
        courseCode,
        tags,
        files: payloadFiles,
      });

      // success
      if (resp && (resp.success || resp.status === 201)) {
        toast({
          title: "Success",
          description: "Resource published successfully!",
          variant: "default", // or just leave it off if you don’t have variants styled
        });
        
        setTitle("");
        setDescription("");
        setSubject("");
        setSemester("");
        setCourseCode("");
        setTags([]);
        setFiles([]);
      } else {
        throw new Error((resp && resp.message) || "Failed to create resource");
      }
    } catch (err) {
      const msg = parseErrorMessage(err);
      pushToast("Failed to publish: " + msg, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  /* ---------- Tag helpers ---------- */
  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (!tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  /* ---------- Keyboard handling for tag input ---------- */
  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(newTag);
    } else if (e.key === "Backspace" && newTag === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  /* ---------- JSX (unchanged except wiring) ---------- */
  return (
    <div className="min-h-screen py-8">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-xs px-4 py-2 rounded-lg shadow-md text-sm ${t.type === 'success' ? 'bg-green-50 text-green-800' : t.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800'}`}>
            {t.message}
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Upload Resources</h1>
          <p className="text-lg text-muted-foreground">
            Share study materials with the community — uploads are resumable, secure, and reliable.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6" aria-live="polite">
          {/* Upload area */}
          <Card className="border-white/10">
            <div
              className={`p-8 border-2 border-dashed rounded-2xl transition-all duration-150 ${
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <UploadIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-1">Drop files here</h3>
                <p className="text-muted-foreground mb-4">or click to browse your computer</p>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Choose files"
                  >
                    Choose Files
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Supports: PDF, PPT, PPTX, DOC, DOCX — Max {formatFileSize(MAX_FILE_SIZE)} each
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(Array.from(e.target.files));
                    e.currentTarget.value = ""; // allow re-selecting same files
                  }}
                  accept={ALLOWED_TYPES.join(",")}
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Max {MAX_FILES} files per upload. Large files are uploaded in chunks automatically.
                </p>
              </div>
            </div>
          </Card>

          {/* Uploaded files list */}
          {files.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Files ({files.length})
              </h3>

              <div className="space-y-3">
                {files.map((file) => {
                  const IconComponent = fileTypeIcons[file.type] || FileText;
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/5 rounded-xl">
                      <IconComponent className="w-8 h-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-4">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {file.status === "completed" && <Check className="w-4 h-4 text-green-500" />}
                            {file.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                            {file.status === "cancelled" && <AlertCircle className="w-4 h-4 text-yellow-500" />}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={() => removeFile(file.id)}
                              title="Remove file"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Progress value={file.progress} className="flex-1 h-2" />
                          <div className="text-xs text-muted-foreground w-32 text-right">
                            {file.status === "uploading" && `${file.progress}%`}
                            {file.status === "queued" && "Queued"}
                            {file.status === "completed" && "Uploaded"}
                            {file.status === "error" && `Error: ${file.error}`}
                            {file.status === "cancelled" && "Cancelled"}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          {file.status === "uploading" && (
                            <Button type="button" variant="outline" size="sm" onClick={() => cancelUpload(file.id)}>
                              Cancel
                            </Button>
                          )}

                          {file.status === "error" && (
                            <>
                              <Button type="button" variant="secondary" size="sm" onClick={() => retryFile(file.id)}>
                                Retry
                              </Button>
                              <span className="text-xs text-destructive ml-2">{file.error}</span>
                            </>
                          )}

                          {file.status === "completed" && file.uploadedUrl && (
                            <a
                              href={file.uploadedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Resource Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Resource Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={subject} onValueChange={setSubject} required>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Economics">Economics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="semester">Semester *</Label>
                <Select value={semester} onValueChange={setSemester} required>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="3rd">3rd Semester</SelectItem>
                    <SelectItem value="4th">4th Semester</SelectItem>
                    <SelectItem value="5th">5th Semester</SelectItem>
                    <SelectItem value="6th">6th Semester</SelectItem>
                    <SelectItem value="7th">7th Semester</SelectItem>
                    <SelectItem value="8th">8th Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="course-code">Course Code</Label>
                <Input
                  id="course-code"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g., CS301, MATH201"
                  className="mt-2"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a detailed description of your resource"
                  className="mt-2 min-h-32"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tags (press Enter to add)"
                      onKeyDown={onTagKeyDown}
                    />
                    <Button type="button" variant="outline" onClick={() => addTag(newTag)}>
                      <Tag className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          #{tag}
                          <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Suggested tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.slice(0, 10).map((tag) => (
                        <Button
                          key={tag}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => addTag(tag)}
                          disabled={tags.includes(tag)}
                        >
                          #{tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="flex-1 md:flex-none"
              disabled={!title || !subject || !semester || !allFilesUploaded || isPublishing}
              aria-disabled={!title || !subject || !semester || !allFilesUploaded || isPublishing}
              title={!allFilesUploaded ? "Wait for uploads to complete" : "Publish resource"}
            >
              {isPublishing ? (
                <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="4" stroke="currentColor" strokeLinecap="round" />
                </svg>
              ) : (
                <UploadIcon className="w-5 h-5 mr-2" />
              )}
              {isPublishing ? "Publishing..." : "Publish Resource"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                // cancel all uploads and clear
                Object.keys(abortControllersRef.current).forEach((k) => {
                  try {
                    abortControllersRef.current[k].abort();
                  } catch {}
                });
                uploadQueueRef.current = [];
                setTitle("");
                setDescription("");
                setSubject("");
                setSemester("");
                setCourseCode("");
                setTags([]);
                setFiles([]);
              }}
            >
              Clear All
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

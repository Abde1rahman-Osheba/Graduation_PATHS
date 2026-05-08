"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCandidateProfile, useCVUpload } from "@/lib/hooks";
import { createEmptyCandidateProfile } from "@/lib/candidate/portal-profile";
import type { UploadedDocument } from "@/types/candidate-profile.types";
import { cn } from "@/lib/utils/cn";

const statusIcons = {
  processing: Clock,
  processed:  CheckCircle2,
  failed:     AlertCircle,
};

const statusColors = {
  processing: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  processed:  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  failed:     "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { data: profile = createEmptyCandidateProfile() } = useCandidateProfile();
  const uploadCV = useCVUpload();
  const [localUploads, setLocalUploads] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const documents = useMemo(() => {
    const fromProfile = [...(profile.documents ?? [])];
    if (profile.cvDocument) fromProfile.unshift(profile.cvDocument);
    const serverIds = new Set(fromProfile.map((d) => d.id));
    const pendingLocal = localUploads.filter((d) => !serverIds.has(d.id));
    return [...pendingLocal, ...fromProfile];
  }, [profile.documents, profile.cvDocument, localUploads]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10 MB.");
      return;
    }
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a PDF or Word document.");
      return;
    }

    const newDoc: UploadedDocument = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      status: "processing",
    };
    setUploading(true);
    setLocalUploads((prev) => [newDoc, ...prev]);

    try {
      await uploadCV.mutateAsync({ file });
      setLocalUploads((prev) => prev.map((d) => (d.id === newDoc.id ? { ...d, status: "processed" } : d)));
    } catch (e) {
      setLocalUploads((prev) => prev.map((d) => (d.id === newDoc.id ? { ...d, status: "failed" } : d)));
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }, [uploadCV]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeDocument = (id: string) =>
    setLocalUploads((prev) => prev.filter((d) => d.id !== id));

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload and manage your CV and supporting documents.</p>
        </motion.div>

        {/* Upload zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all mb-6",
              uploading ? "cursor-not-allowed opacity-60" : "",
              isDragging ? "border-primary/60 bg-primary/5" : "border-border/50 hover:border-primary/40 hover:bg-muted/10"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-semibold text-foreground">Uploading…</p>
              </>
            ) : (
              <>
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", isDragging ? "bg-primary/15" : "bg-muted/30")}>
                  <Upload className={cn("h-6 w-6", isDragging ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{isDragging ? "Drop it here" : "Drag & drop your CV"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">or click to browse · PDF, DOC, DOCX · Max 10 MB</p>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              <X className="h-3.5 w-3.5 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          )}
        </motion.div>

        {/* Documents list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Uploaded Files ({documents.length})</p>

          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/40 py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, i) => {
                const StatusIcon = statusIcons[doc.status];
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/30">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 flex items-center gap-1", statusColors[doc.status])}>
                      <StatusIcon className="h-3 w-3" />
                      {doc.status === "processing" ? "Processing…" : doc.status === "processed" ? "Processed" : "Failed"}
                    </Badge>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <p className="mt-6 text-[11px] text-muted-foreground/60">
          Uploaded documents are stored securely. Your CV is only shared with recruiters when you consent to de-anonymization. AI processing extracts skills and experience to strengthen your profile.
        </p>
      </div>
    </div>
  );
}

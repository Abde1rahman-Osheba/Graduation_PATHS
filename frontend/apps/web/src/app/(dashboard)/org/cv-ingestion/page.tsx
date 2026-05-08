"use client";

import { motion } from "framer-motion";
import {
  FileText, Loader2, Upload, CheckCircle2, XCircle,
  Clock, AlertCircle, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCVUpload } from "@/lib/hooks";

export default function CVIngestionPage() {
  const upload = useCVUpload();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ file });
    } catch {
      // error handled by mutation
    }
    e.target.value = "";
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            CV Ingestion
          </h1>
          <p className="text-sm text-muted-foreground">
            Document parsing and data extraction pipeline for candidate CVs and resumes.
          </p>
        </div>
      </motion.div>

      {/* Upload card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass gradient-border rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider text-foreground">
            Upload a CV
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a candidate CV (PDF, DOCX, or TXT) to extract skills, experience, education, and other structured data.
        </p>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleUpload}
              className="hidden"
              disabled={upload.isPending}
            />
            <Button
              size="sm"
              disabled={upload.isPending}
              className="text-xs pointer-events-none"
              asChild
            >
              <span>
                {upload.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FileUp className="h-3.5 w-3.5 mr-1" />
                )}
                {upload.isPending ? "Uploading..." : "Select File"}
              </span>
            </Button>
          </label>
        </div>
        {upload.isError && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <XCircle className="h-3 w-3" />
            Upload failed. The file may be too large or in an unsupported format.
          </div>
        )}
        {upload.isSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            CV uploaded and queued for processing.
          </div>
        )}
      </motion.div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <FileText className="h-4 w-4 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Parsing</p>
          <p className="text-xs text-muted-foreground">
            Extracts structured fields from raw document text using AI models.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mb-2" />
          <p className="text-sm font-medium text-foreground">Skill Extraction</p>
          <p className="text-xs text-muted-foreground">
            Identifies and normalizes skills against the platform skill dictionary.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <Clock className="h-4 w-4 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Vector Embedding</p>
          <p className="text-xs text-muted-foreground">
            Generates vector embeddings for semantic search and matching.
          </p>
        </motion.div>
      </div>

      {/* Usage info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
        className="glass rounded-xl p-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-foreground">How it works</h2>
        <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
          <li>Upload a CV file (PDF, DOCX, or TXT) using the upload button above.</li>
          <li>The ingestion service parses the document and extracts structured data.</li>
          <li>Extracted data populates the candidate profile: skills, experience, education, certifications.</li>
          <li>The profile becomes available for screening, matching, and scoring workflows.</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3">
          For bulk ingestion or programmatic access, use the <code className="text-[11px] font-mono bg-muted/50 px-1 rounded">POST /api/v1/cv-ingestion/upload</code> API endpoint directly.
          CV ingestion for candidates is also available via the candidate portal.
        </p>
      </motion.div>
    </div>
  );
}

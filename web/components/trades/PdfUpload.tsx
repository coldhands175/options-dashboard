"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";

export default function PdfUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { line: number; input: string; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Account and notes removed per request

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const extractTrades = useAction(api.pdf.extractTradesFromPdfParsed);
  const enqueueImports = useMutation(api.imports.enqueuePdfImports);
  const [currentBatchIds, setCurrentBatchIds] = useState<string[] | null>(null);
  const listImports = useQuery(api.imports.listMyImports, { limit: Math.max(25, currentBatchIds?.length || 0) }) as Array<{ _id: string; _creationTime: number; status: 'queued' | 'running' | 'succeeded' | 'failed'; createdCount?: number; errorMessage?: string; fileName?: string }> | undefined;

  async function onSubmit() {
    setError(null);
    setResult(null);
    const files = queuedFiles.length > 0 ? queuedFiles : (selectedFile ? [selectedFile] : []);
    if (files.length === 0) {
      setError("Choose one or more PDF files first");
      return;
    }
    for (const f of files) {
      if (f.type !== "application/pdf") {
        setError("All files must be PDFs");
        return;
      }
    }
    setSubmitting(true);
    try {
      // Upload files to storage first
      const uploaded: Array<{ fileId: string; fileName: string }> = [];
      for (const f of files) {
        const uploadUrl = await generateUploadUrl({});
        const resp = await fetch(uploadUrl as string, {
          method: "POST",
          headers: { "Content-Type": f.type },
          body: f,
        });
        const { storageId } = await resp.json();
        if (!storageId) throw new Error("Upload failed: no storageId returned");
        uploaded.push({ fileId: storageId as string, fileName: f.name });
      }

      // Enqueue all uploaded files for background processing
      const res = await enqueueImports({ files: uploaded as any });
      setCurrentBatchIds((res as any).importIds as string[]);
      setResult({ created: 0, errors: [] });

      // Reset file inputs
      setQueuedFiles([]);
      setSelectedFile(null);
      const el = document.getElementById("pdf-file-input") as HTMLInputElement | null;
      if (el) el.value = "";
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-foreground/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-sm">Upload broker PDF(s)</h3>
        <div className="flex gap-2 items-center text-xs">
          <Button onClick={onSubmit} disabled={(!selectedFile && queuedFiles.length === 0) || submitting} className="text-xs">
            {submitting ? "Uploading…" : "Upload & Parse"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="pdf-file-input"
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setQueuedFiles(files);
            setSelectedFile(files[0] || null);
          }}
        />
        <Button variant="outline" size="lg" onClick={() => (document.getElementById("pdf-file-input") as HTMLInputElement)?.click()}>
          Choose PDF files
        </Button>
        <span className="text-xs text-foreground/60">
          {queuedFiles.length > 0 ? `${queuedFiles.length} file${queuedFiles.length>1? 's':''} selected` : "No files selected"}
        </span>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      {/* Import job status */}
      <div className="text-xs space-y-1">
        <div className="text-foreground/80">Recent imports</div>
        <div className="border divide-y divide-foreground/10">
          {!listImports && <div className="p-2 text-foreground/60">Loading…</div>}
          {listImports && (currentBatchIds ? listImports.filter(j => currentBatchIds.includes(j._id)).length === 0 : listImports.length === 0) && (
            <div className="p-2 text-foreground/60">No imports yet.</div>
          )}
          {listImports && (currentBatchIds ? listImports.filter(j => currentBatchIds.includes(j._id)) : listImports).map((j) => (
            <div key={j._id} className="p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px]">{new Date(j._creationTime).toLocaleString()}</span>
                {j.fileName && <span className="text-foreground/80">{j.fileName}</span>}
                <span className="px-2 py-0.5 rounded bg-foreground/10">{j.status}</span>
                {j.status === 'succeeded' && (
                  <span className="text-foreground/70">created {j.createdCount ?? 0}</span>
                )}
                {j.status === 'failed' && (
                  <span className="text-red-600">{j.errorMessage}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

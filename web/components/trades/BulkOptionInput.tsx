"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export default function BulkOptionInput() {
  const [text, setText] = useState("");
  const [accountTag, setAccountTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { line: number; input: string; message: string }[] } | null>(null);

  const createBulk = useMutation(api.trades.createOptionTradesFromText);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await createBulk({
        text,
        accountTag: accountTag || undefined,
      });
      setResult(res as { created: number; errors: { line: number; input: string; message: string }[] });
      if (res && res.created > 0) {
        setText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-foreground/20 p-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-sm">Paste option trades</h3>
        <div className="flex gap-2 items-center text-xs">
          <label className="flex items-center gap-1">
            Account
            <input className="w-28 border px-2 py-1 text-xs" value={accountTag} onChange={(e) => setAccountTag(e.target.value)} />
          </label>
          <button
            onClick={submit}
            disabled={!text.trim() || submitting}
            className={cn("px-3 py-1 text-xs", !text.trim() || submitting ? "bg-foreground/40 text-background" : "bg-foreground text-background")}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
      <textarea
        rows={5}
        placeholder={`One trade per line, e.g.\nSold 10 VLO December 150 Puts at $5.15\nSold to Close 5 UNH Oct 6 2025 310 Puts at 8.62\nBought 3 UNH Dec 6 300 Calls at 8.30`}
        className="w-full bg-transparent outline-none resize-y text-sm border p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {result && (
        <div className="text-xs space-y-1">
          <div className="text-foreground/80">Created {result.created} trades</div>
          {result.errors.length > 0 && (
            <div className="text-red-600">
              <div className="mb-1 font-semibold">Errors:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>Line {e.line}: {e.message} — “{e.input}”</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


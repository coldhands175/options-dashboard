"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Loader2, FileText, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function StockNotes({ symbol }: { symbol: string }) {
  const notes = useQuery(api.stockNotes.getNotes, { symbol });
  const saveNotes = useMutation(api.stockNotes.saveNotes);
  const deleteNotes = useMutation(api.stockNotes.deleteNotes);

  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize content when notes load
  useEffect(() => {
    if (notes) {
      setContent(notes.content);
      setLastSaved(notes.updatedAt);
    }
  }, [notes]);

  // Auto-save function with debounce
  const handleSave = useCallback(
    async (newContent: string) => {
      if (newContent.trim() === "" && !notes) {
        // Don't save empty new notes
        return;
      }

      setIsSaving(true);
      try {
        await saveNotes({ symbol, content: newContent });
        setLastSaved(Date.now());
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error saving notes:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [symbol, saveNotes, notes]
  );

  // Debounced auto-save on typing
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after typing stops)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 2000);
  };

  // Save on blur
  const handleBlur = () => {
    if (hasUnsavedChanges) {
      // Clear the debounce timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleSave(content);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete these notes?")) {
      return;
    }

    try {
      await deleteNotes({ symbol });
      setContent("");
      setLastSaved(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting notes:", error);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const characterCount = content.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-foreground/60" />
          <h2 className="text-xl font-bold font-mono">Personal Notes</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <span className="text-yellow-500">Unsaved changes</span>
            ) : lastSaved ? (
              <>
                <Save className="w-4 h-4 text-green-500" />
                <span>
                  Saved {formatDistanceToNow(new Date(lastSaved), { addSuffix: true })}
                </span>
              </>
            ) : null}
          </div>

          {/* Delete Button */}
          {notes && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-500/40 text-red-500 rounded hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="border border-foreground/20 rounded-lg overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={`Write your research notes for ${symbol}...\n\nYou can use markdown formatting:\n- **bold** or *italic*\n- Lists and bullet points\n- Links and references\n\nNotes auto-save as you type.`}
          className="w-full min-h-[500px] p-4 bg-background text-foreground font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      {/* Footer with character count */}
      <div className="flex items-center justify-between text-xs text-foreground/60">
        <div>
          {characterCount === 0 ? (
            <span className="italic">No notes yet. Start typing to create notes for {symbol}.</span>
          ) : (
            <span>
              {characterCount.toLocaleString()} character{characterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="italic">Auto-saves 2 seconds after you stop typing</div>
      </div>

      {/* Markdown Tips */}
      {characterCount === 0 && (
        <div className="border border-foreground/20 rounded-lg p-4 bg-foreground/5">
          <h3 className="text-sm font-bold font-mono mb-2">💡 Tips for effective notes:</h3>
          <ul className="text-sm text-foreground/80 space-y-1 list-disc list-inside">
            <li>Track your investment thesis and key assumptions</li>
            <li>Note important catalysts and upcoming events</li>
            <li>Record your price targets and risk levels</li>
            <li>Document your reasoning for entering/exiting positions</li>
            <li>Link to relevant articles, earnings reports, or research</li>
          </ul>
        </div>
      )}
    </div>
  );
}

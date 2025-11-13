"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PendingTrade {
  _id: Id<"pending_trades">;
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiration: number;
  action: "BTO" | "BTC" | "STO" | "STC";
  quantity_contracts: number;
  premium_per_contract: number;
  tradeTime: number;
  status: "pending" | "approved" | "rejected" | "inserted";
  confidence: "high" | "medium" | "low";
  warnings: string[];
  rawPageText?: string;
  brokerTradeNumber?: string;
}

export default function TradeReview() {
  const [selectedImportId, setSelectedImportId] = useState<Id<"imports"> | null>(null);
  const [showRawText, setShowRawText] = useState<Record<string, boolean>>({});
  const [editingTrade, setEditingTrade] = useState<PendingTrade | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [rejectingTrade, setRejectingTrade] = useState<PendingTrade | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmAutoApproveOpen, setConfirmAutoApproveOpen] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch pending trades
  const pendingTrades = useQuery(
    api.pendingTrades.listPendingTrades,
    selectedImportId ? { importId: selectedImportId, status: "pending" } : { status: "pending" }
  ) as PendingTrade[] | undefined;

  const counts = useQuery(api.pendingTrades.getPendingTradesCounts) as
    | { pending: number; approved: number; rejected: number; inserted: number }
    | undefined;

  // Mutations
  const approveTrade = useMutation(api.pendingTrades.approvePendingTrade);
  const rejectTrade = useMutation(api.pendingTrades.rejectPendingTrade);
  const autoApproveHigh = useMutation(api.pendingTrades.autoApproveHighConfidence);
  const editTrade = useMutation(api.pendingTrades.editPendingTrade);

  const handleApprove = async (id: Id<"pending_trades">) => {
    setFeedback(null);
    try {
      await approveTrade({ id });
    } catch (e: any) {
      setFeedback({ type: "error", message: `Error approving trade: ${e.message}` });
    }
  };

  const handleReject = (trade: PendingTrade) => {
    setRejectingTrade(trade);
    setRejectReason("");
    setRejectError(null);
  };

  const submitReject = async () => {
    if (!rejectingTrade) return;

    setRejectError(null);
    setFeedback(null);
    setIsRejecting(true);
    try {
      await rejectTrade({ id: rejectingTrade._id, reason: rejectReason.trim() || undefined });
      setRejectingTrade(null);
      setRejectReason("");
      setFeedback({ type: "success", message: "Trade rejected." });
    } catch (e: any) {
      setRejectError(`Error rejecting trade: ${e.message}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAutoApprove = () => {
    setFeedback(null);
    setConfirmAutoApproveOpen(true);
  };

  const submitAutoApprove = async () => {
    setFeedback(null);
    setIsAutoApproving(true);
    try {
      const result = await autoApproveHigh({});
      setFeedback({ type: "success", message: `Approved ${result.approved} trades, ${result.failed} failed.` });
      setConfirmAutoApproveOpen(false);
    } catch (e: any) {
      setFeedback({ type: "error", message: `Error auto-approving trades: ${e.message}` });
    } finally {
      setIsAutoApproving(false);
    }
  };

  const handleEdit = (trade: PendingTrade) => {
    setEditingTrade(trade);
    setEditError(null);
  };

  const handleSaveEdit = async (updates: PendingTrade) => {
    if (!editingTrade) return;

    setEditError(null);
    setFeedback(null);
    setIsSavingEdit(true);
    try {
      await editTrade({
        id: editingTrade._id,
        updates: {
          underlying: updates.underlying,
          optionType: updates.optionType,
          strike: updates.strike,
          expiration: updates.expiration,
          action: updates.action,
          quantity_contracts: updates.quantity_contracts,
          premium_per_contract: updates.premium_per_contract,
          tradeTime: updates.tradeTime,
          brokerTradeNumber: updates.brokerTradeNumber,
        },
      });
      setEditingTrade(null);
      setFeedback({ type: "success", message: "Trade updated." });
    } catch (e: any) {
      setEditError(`Error saving trade: ${e.message}`);
    }
    setIsSavingEdit(false);
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString();
  };

  const formatExpiration = (ms: number) => {
    return new Date(ms).toLocaleDateString();
  };

  const toggleRawText = (id: string) => {
    setShowRawText((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getConfidenceBadgeClass = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return "bg-green-600 text-white";
      case "medium":
        return "bg-yellow-600 text-white";
      case "low":
        return "bg-red-600 text-white";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "BTO":
        return "Buy to Open";
      case "BTC":
        return "Buy to Close";
      case "STO":
        return "Sell to Open";
      case "STC":
        return "Sell to Close";
      default:
        return action;
    }
  };

  if (!pendingTrades || !counts) {
    return <div className="p-4">Loading...</div>;
  }

  // Group by confidence
  const high = pendingTrades.filter((t) => t.confidence === "high");
  const medium = pendingTrades.filter((t) => t.confidence === "medium");
  const low = pendingTrades.filter((t) => t.confidence === "low");

  return (
    <div className="border border-foreground/20 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Trade Review</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-600 text-white rounded">
            {counts.pending} Pending
          </span>
          <span className="px-2 py-1 bg-green-600 text-white rounded">
            {counts.inserted} Inserted
          </span>
          <span className="px-2 py-1 bg-red-600 text-white rounded">
            {counts.rejected} Rejected
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`text-sm rounded border px-3 py-2 ${
            feedback.type === "error"
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-green-300 bg-green-50 text-green-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Auto-approve button */}
      {high.length > 0 && (
        <div className="bg-green-50 border border-green-300 p-3 rounded flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">
              {high.length} high-confidence trades ready
            </p>
            <p className="text-xs text-foreground/70">
              No warnings detected, safe to auto-approve
            </p>
          </div>
          <Button onClick={handleAutoApprove} className="text-xs">
            Auto-Approve All ({high.length})
          </Button>
        </div>
      )}

      {pendingTrades.length === 0 && (
        <div className="text-center p-8 text-foreground/60">
          No pending trades to review
        </div>
      )}

      {/* High confidence trades */}
      {high.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">
              High Confidence
            </span>
            {high.length} trades
          </h3>
          <div className="space-y-2">
            {high.map((trade) => (
              <TradeCard
                key={trade._id}
                trade={trade}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                showRawText={showRawText[trade._id]}
                onToggleRawText={() => toggleRawText(trade._id)}
                formatDate={formatDate}
                formatExpiration={formatExpiration}
                getActionLabel={getActionLabel}
                getConfidenceBadgeClass={getConfidenceBadgeClass}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium confidence trades */}
      {medium.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs">
              Medium Confidence
            </span>
            {medium.length} trades
          </h3>
          <div className="space-y-2">
            {medium.map((trade) => (
              <TradeCard
                key={trade._id}
                trade={trade}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                showRawText={showRawText[trade._id]}
                onToggleRawText={() => toggleRawText(trade._id)}
                formatDate={formatDate}
                formatExpiration={formatExpiration}
                getActionLabel={getActionLabel}
                getConfidenceBadgeClass={getConfidenceBadgeClass}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low confidence trades */}
      {low.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">
              Low Confidence
            </span>
            {low.length} trades - Review carefully
          </h3>
          <div className="space-y-2">
            {low.map((trade) => (
              <TradeCard
                key={trade._id}
                trade={trade}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                showRawText={showRawText[trade._id]}
                onToggleRawText={() => toggleRawText(trade._id)}
                formatDate={formatDate}
                formatExpiration={formatExpiration}
                getActionLabel={getActionLabel}
                getConfidenceBadgeClass={getConfidenceBadgeClass}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingTrade && (
        <EditTradeDialog
          trade={editingTrade}
          onSave={handleSaveEdit}
          onCancel={() => {
            if (isSavingEdit) return;
            setEditingTrade(null);
            setEditError(null);
          }}
          error={editError}
          isSubmitting={isSavingEdit}
        />
      )}

      <RejectTradeDialog
        trade={rejectingTrade}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onConfirm={submitReject}
        onCancel={() => {
          if (isRejecting) return;
          setRejectingTrade(null);
          setRejectReason("");
          setRejectError(null);
        }}
        error={rejectError}
        isSubmitting={isRejecting}
      />

      <ConfirmAutoApproveDialog
        open={confirmAutoApproveOpen}
        pendingCount={high.length}
        onConfirm={submitAutoApprove}
        onCancel={() => {
          if (isAutoApproving) return;
          setConfirmAutoApproveOpen(false);
        }}
        isSubmitting={isAutoApproving}
      />
    </div>
  );
}

// Sub-component for individual trade card
function TradeCard({
  trade,
  onApprove,
  onReject,
  onEdit,
  showRawText,
  onToggleRawText,
  formatDate,
  formatExpiration,
  getActionLabel,
  getConfidenceBadgeClass,
}: {
  trade: PendingTrade;
  onApprove: (id: Id<"pending_trades">) => void;
  onReject: (trade: PendingTrade) => void;
  onEdit: (trade: PendingTrade) => void;
  showRawText: boolean;
  onToggleRawText: () => void;
  formatDate: (ms: number) => string;
  formatExpiration: (ms: number) => string;
  getActionLabel: (action: string) => string;
  getConfidenceBadgeClass: (confidence: "high" | "medium" | "low") => string;
}) {
  return (
    <div className="border border-foreground/20 rounded p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs ${getConfidenceBadgeClass(trade.confidence)}`}>
              {trade.confidence.toUpperCase()}
            </span>
            <span className="text-xs text-foreground/60">
              {formatDate(trade.tradeTime)}
            </span>
          </div>
          <div className="font-mono text-sm">
            {getActionLabel(trade.action)} {trade.quantity_contracts}{" "}
            {trade.underlying} {formatExpiration(trade.expiration)}{" "}
            ${trade.strike} {trade.optionType}s @ ${trade.premium_per_contract.toFixed(2)}
          </div>
          {trade.brokerTradeNumber && (
            <div className="text-xs text-foreground/60 mt-1">
              Trade #{trade.brokerTradeNumber}
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {trade.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-2">
          <p className="text-xs font-semibold mb-1">Warnings:</p>
          <ul className="text-xs space-y-1">
            {trade.warnings.map((warning, idx) => (
              <li key={idx} className="text-foreground/80">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw text toggle */}
      {trade.rawPageText && (
        <div>
          <button
            onClick={onToggleRawText}
            className="text-xs text-blue-600 hover:underline"
          >
            {showRawText ? "Hide" : "Show"} Raw PDF Text
          </button>
          {showRawText && (
            <pre className="text-xs bg-foreground/5 p-2 rounded mt-2 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
              {trade.rawPageText}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onApprove(trade._id)}
          className="text-xs bg-green-600 hover:bg-green-700"
          size="sm"
        >
          ✓ Approve
        </Button>
        <Button
          onClick={() => onEdit(trade)}
          variant="outline"
          className="text-xs"
          size="sm"
        >
          ✎ Edit
        </Button>
        <Button
          onClick={() => onReject(trade)}
          variant="outline"
          className="text-xs"
          size="sm"
        >
          ✗ Reject
        </Button>
      </div>
    </div>
  );
}

// Edit Trade Dialog Component
function EditTradeDialog({
  trade,
  onSave,
  onCancel,
  error,
  isSubmitting,
}: {
  trade: PendingTrade;
  onSave: (updates: PendingTrade) => Promise<void>;
  onCancel: () => void;
  error: string | null;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<PendingTrade>(trade);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const formatDateForInput = (ms: number) => {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatExpirationForInput = (ms: number) => {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>
            Modify the trade details below. All fields are required except the broker trade number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Underlying */}
            <div className="space-y-2">
              <Label htmlFor="underlying">Underlying</Label>
              <Input
                id="underlying"
                value={formData.underlying}
                onChange={(e) => setFormData({ ...formData, underlying: e.target.value.toUpperCase() })}
                placeholder="AAPL"
              />
            </div>

            {/* Option Type */}
            <div className="space-y-2">
              <Label htmlFor="optionType">Option Type</Label>
              <Select
                value={formData.optionType}
                onValueChange={(value: "CALL" | "PUT") => setFormData({ ...formData, optionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">CALL</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strike */}
            <div className="space-y-2">
              <Label htmlFor="strike">Strike Price</Label>
              <Input
                id="strike"
                type="number"
                step="0.01"
                value={formData.strike}
                onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) })}
              />
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration Date</Label>
              <Input
                id="expiration"
                type="date"
                value={formatExpirationForInput(formData.expiration)}
                onChange={(e) => setFormData({ ...formData, expiration: new Date(e.target.value).getTime() })}
              />
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={formData.action}
                onValueChange={(value: "BTO" | "BTC" | "STO" | "STC") => setFormData({ ...formData, action: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTO">Buy to Open (BTO)</SelectItem>
                  <SelectItem value="BTC">Buy to Close (BTC)</SelectItem>
                  <SelectItem value="STO">Sell to Open (STO)</SelectItem>
                  <SelectItem value="STC">Sell to Close (STC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Contracts)</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                value={formData.quantity_contracts}
                onChange={(e) => setFormData({ ...formData, quantity_contracts: parseInt(e.target.value) })}
              />
            </div>

            {/* Premium */}
            <div className="space-y-2">
              <Label htmlFor="premium">Premium per Contract</Label>
              <Input
                id="premium"
                type="number"
                step="0.01"
                value={formData.premium_per_contract}
                onChange={(e) => setFormData({ ...formData, premium_per_contract: parseFloat(e.target.value) })}
              />
            </div>

            {/* Trade Time */}
            <div className="space-y-2">
              <Label htmlFor="tradeTime">Trade Time</Label>
              <Input
                id="tradeTime"
                type="datetime-local"
                value={formatDateForInput(formData.tradeTime)}
                onChange={(e) => setFormData({ ...formData, tradeTime: new Date(e.target.value).getTime() })}
              />
            </div>

            {/* Broker Trade Number */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="brokerTradeNumber">Broker Trade Number (Optional)</Label>
              <Input
                id="brokerTradeNumber"
                value={formData.brokerTradeNumber || ""}
                onChange={(e) => setFormData({ ...formData, brokerTradeNumber: e.target.value })}
                placeholder="Trade #123456"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectTradeDialog({
  trade,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  error,
  isSubmitting,
}: {
  trade: PendingTrade | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  error: string | null;
  isSubmitting: boolean;
}) {
  if (!trade) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Trade</DialogTitle>
          <DialogDescription>
            Optionally provide a reason for rejecting this trade so it can be reviewed later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded border border-foreground/20 bg-foreground/5 px-3 py-2 text-sm">
            <div className="font-medium">
              {trade.action} {trade.quantity_contracts} {trade.underlying} {new Date(trade.expiration).toLocaleDateString()} {trade.optionType}s @ $
              {trade.premium_per_contract.toFixed(2)}
            </div>
            <div className="text-xs text-foreground/60">Trade time: {new Date(trade.tradeTime).toLocaleString()}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Add context for why this trade was rejected"
              rows={4}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
              {isSubmitting ? "Rejecting..." : "Reject Trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAutoApproveDialog({
  open,
  pendingCount,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  open: boolean;
  pendingCount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Auto-Approve High Confidence Trades</DialogTitle>
          <DialogDescription>
            {pendingCount === 1
              ? "This will approve the single high-confidence trade."
              : `This will approve ${pendingCount} high-confidence trades.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-foreground/70">
            Approved trades are immediately inserted into your book. You can review the audit trail at any time from the history
            tab.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
              {isSubmitting ? "Auto-approving..." : `Approve ${pendingCount}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

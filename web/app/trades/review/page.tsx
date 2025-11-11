"use client";

import TradeReview from "@/components/trades/TradeReview";
import DashboardLayout from "@/components/shared/DashboardLayout";

export default function TradeReviewPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Trade Review</h1>
          <p className="text-foreground/70 text-sm">
            Review and approve trades parsed from your PDF imports. High-confidence trades can be auto-approved.
          </p>
        </div>
        <TradeReview />
      </div>
    </DashboardLayout>
  );
}

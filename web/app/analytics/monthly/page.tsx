"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/shared/DashboardLayout";
import MonthlyOverview from "@/components/analytics/MonthlyOverview";
import MonthlyChart from "@/components/analytics/MonthlyChart";
import MonthlyTable from "@/components/analytics/MonthlyTable";

export default function MonthlyAnalyticsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch analytics data
  const monthlyData = useQuery(api.analytics.getMonthlyAnalytics);
  const summary = useQuery(api.analytics.getAnalyticsSummary);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isDataLoading = !monthlyData || !summary;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Monthly Analytics</h1>
          <p className="text-muted-foreground">
            Track your trading performance and trends over time
          </p>
        </div>

        {isDataLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <p className="text-muted-foreground animate-pulse">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <MonthlyOverview summary={summary} />

            {/* Monthly Trend Chart */}
            <MonthlyChart data={monthlyData} />

            {/* Detailed Monthly Breakdown Table */}
            <MonthlyTable data={monthlyData} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

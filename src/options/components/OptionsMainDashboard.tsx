import * as React from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Copyright from "../../dashboard/internals/components/Copyright";
import OptionsStatCard from "./OptionsStatCard";
import OptionsRecentTradesTable from "./OptionsRecentTradesTable";
import OptionsWatchlistTable from "./OptionsWatchlistTable";
import OptionsPerformanceChart from "./OptionsPerformanceChart";
import OptionsAllocationChart from "./OptionsAllocationChart";
import TradingViewWidget from "../../components/TradingViewWidget";
import { useTheme } from "@mui/material";
import { getTickerSymbolsFromConfig } from "../../config/symbols";
import { Trade } from "../models/types";
import { PositionManager } from "../models/positionManager";
import { useQuery } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { getCurrentUserId } from '../../lib/convexUtils';

// Utility function to get the most recent quarter with actual position data
const getMostRecentQuarterWithData = (trades: Trade[]) => {
  if (trades.length === 0) return { start: new Date(), end: new Date() };

  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();
  const closedPositions = allPositions.filter(p => 
    (p.status === 'CLOSED' || p.status === 'EXPIRED') && p.closeDate
  );

  if (closedPositions.length === 0) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (month <= 2) return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
    if (month <= 5) return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
    if (month <= 8) return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
    return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
  }

  const latestCloseDate = new Date(Math.max(...closedPositions.map(p => new Date(p.closeDate!).getTime())));
  const year = latestCloseDate.getFullYear();
  const month = latestCloseDate.getMonth();

  if (month <= 2) return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
  if (month <= 5) return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
  if (month <= 8) return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
  return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
};

// Calculate quarterly P/L from closed positions
const calculateQuarterlyPL = (trades: Trade[]) => {
  const quarter = getMostRecentQuarterWithData(trades);
  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();

  const closedPositionsInQuarter = allPositions.filter(position => {
    if (position.status !== 'CLOSED' && position.status !== 'EXPIRED') return false;
    if (!position.closeDate) return false;
    const closeDate = new Date(position.closeDate);
    return closeDate >= quarter.start && closeDate <= quarter.end;
  });

  const totalPL = closedPositionsInQuarter.reduce((sum, position) => sum + (position.realizedPL ?? 0), 0);

  return {
    value: totalPL,
    count: closedPositionsInQuarter.length,
    quarter: {
      name: `Q${Math.floor(quarter.start.getMonth() / 3) + 1} ${quarter.start.getFullYear()}`,
      start: quarter.start,
      end: quarter.end
    },
    positions: closedPositionsInQuarter
  };
};

// Generate stats data based on actual trade data
const getStatCardsData = (trades: Trade[]) => {
  const quarterlyPL = calculateQuarterlyPL(trades);
  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();
  const openPositions = allPositions.filter(p => p.status === 'OPEN');
  const closedPositions = allPositions.filter(p => p.status === 'CLOSED' || p.status === 'EXPIRED');

  const winningPositions = closedPositions.filter(p => (p.realizedPL ?? 0) > 0);
  const winRate = closedPositions.length > 0 ? (winningPositions.length / closedPositions.length) * 100 : 0;

  const currentDate = new Date();
  const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const thisMonthClosedPositions = closedPositions.filter(p => {
    if (!p.closeDate) return false;
    return new Date(p.closeDate) >= thisMonthStart;
  });
  const monthlyPL = thisMonthClosedPositions.reduce((sum, p) => sum + (p.realizedPL ?? 0), 0);

  return [
    {
      title: "Quarterly P/L",
      value: quarterlyPL.value >= 0 ? `$${quarterlyPL.value.toLocaleString()}` : `-$${Math.abs(quarterlyPL.value).toLocaleString()}`,
      interval: quarterlyPL.quarter.name,
      trend: quarterlyPL.value >= 0 ? "up" : "down" as "up" | "down",
      trendValue: quarterlyPL.count > 0 ? `${quarterlyPL.count} positions` : "No positions",
      data: Array(30).fill(0).map(() => quarterlyPL.value * (0.7 + 0.3 * Math.random())), // Dummy trend data
    },
    {
      title: "Active Positions",
      value: openPositions.length.toString(),
      interval: "Current",
      trend: "up" as "up" | "down",
      trendValue: `${allPositions.length} total`,
      data: Array(30).fill(0).map(() => openPositions.length + Math.floor(Math.random() * 5 - 2)),
    },
    {
      title: "Monthly P/L",
      value: monthlyPL >= 0 ? `$${monthlyPL.toLocaleString()}` : `-$${Math.abs(monthlyPL).toLocaleString()}`,
      interval: "This Month",
      trend: monthlyPL >= 0 ? "up" : "down" as "up" | "down",
      trendValue: `${thisMonthClosedPositions.length} positions`,
      data: Array(30).fill(0).map((_, i) => monthlyPL * (0.3 + 0.7 * (i / 29))),
    },
    {
      title: "Win Rate",
      value: `${Math.round(winRate)}%`,
      interval: `${closedPositions.length} closed positions`,
      trend: winRate >= 60 ? "up" : "down" as "up" | "down",
      trendValue: `${winningPositions.length}/${closedPositions.length}`,
      data: Array(30).fill(0).map(() => winRate + Math.random() * 10 - 5),
    },
  ];
};

export default function OptionsMainDashboard() {
  const theme = useTheme();
  const userId = getCurrentUserId();
  const convexTrades = useQuery(api.functions.getTrades, { userId });
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (convexTrades !== undefined) {
      setTrades(convexTrades);
      setLoading(false);
      setError(null);
    }
  }, [convexTrades]);

  const statCardsData = React.useMemo(() => {
    if (!trades || trades.length === 0) {
      // Return a default state for cards while loading or if there's no data
      const defaultCard = {
        title: "", value: "-", interval: "", trend: "up" as "up" | "down", trendValue: "", data: []
      };
      return [
        { ...defaultCard, title: "Quarterly P/L" },
        { ...defaultCard, title: "Active Positions" },
        { ...defaultCard, title: "Monthly P/L" },
        { ...defaultCard, title: "Win Rate" },
      ];
    }
    return getStatCardsData(trades);
  }, [trades]);

  if (loading) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography>Loading dashboard data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography color="error">Error loading dashboard data: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Box sx={{ mb: 3 }}>
        <TradingViewWidget 
          key={`tradingview-${theme.palette.mode}`}
          symbols={getTickerSymbolsFromConfig()} 
          colorTheme={theme.palette.mode}
        />
      </Box>

      {/* Header with action buttons */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3, display: { xs: "none", sm: "flex" } }}
      >
        <Typography variant="h5" component="h2">
          Options Portfolio Overview
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            sx={{ mr: 1 }}
          >
            New Position
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<TrendingUpIcon />}
          >
            Market Analysis
          </Button>
        </Box>
      </Stack>

      {/* Stats Cards row */}
      <Box display="flex" flexWrap="wrap" sx={{ mb: 3, mx: -1 }}>
        {statCardsData.map((card, index) => (
          <Box key={index} sx={{ width: { xs: '100%', sm: '50%', lg: '25%' }, p: 1 }}>
            <OptionsStatCard
              title={card.title}
              value={card.value}
              interval={card.interval}
              trend={card.trend as "up" | "down"}
              trendValue={card.trendValue}
              data={card.data}
            />
          </Box>
        ))}
      </Box>

      {/* Charts row */}
      <Box display="flex" flexWrap="wrap" sx={{ mb: 3, mx: -1 }}>
        <Box sx={{ width: { xs: '100%', md: '66.66%' }, p: 1 }}>
          <OptionsPerformanceChart />
        </Box>
        <Box sx={{ width: { xs: '100%', md: '33.33%' }, p: 1 }}>
          <OptionsAllocationChart />
        </Box>
      </Box>

      {/* Tables & Other content */}
      <Box display="flex" flexWrap="wrap" sx={{ mb: 3, mx: -1 }}>
        <Box sx={{ width: { xs: '100%', lg: '66.66%' }, p: 1 }}>
          <OptionsRecentTradesTable trades={trades} loading={loading} error={error} />
        </Box>
        <Box sx={{ width: { xs: '100%', lg: '33.33%' }, p: 1 }}>
          <Stack spacing={2}>
            <OptionsWatchlistTable />
          </Stack>
        </Box>
      </Box>

      <Copyright sx={{ mt: 3, mb: 4 }} />
    </Box>
  );
}

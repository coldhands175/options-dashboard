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
import { Trade, Position } from "../models/types";
import { PositionManager } from "../models/positionManager";

// Utility function to get the most recent quarter with actual position data
const getMostRecentQuarterWithData = (trades: Trade[]) => {
  if (trades.length === 0) return { start: new Date(), end: new Date() };
  
  // Create position manager to find closed positions
  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();
  const closedPositions = allPositions.filter(p => 
    (p.status === 'Closed' || p.status === 'Expired') && p.closeDate
  );
  
  if (closedPositions.length === 0) {
    // If no closed positions, use current quarter
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (month >= 0 && month <= 2) {
      return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
    } else if (month >= 3 && month <= 5) {
      return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
    } else if (month >= 6 && month <= 8) {
      return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
    } else {
      return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
    }
  }
  
  // Find the most recent close date
  const latestCloseDate = new Date(Math.max(...closedPositions.map(p => new Date(p.closeDate!).getTime())));
  
  // Determine which quarter this date falls into
  const year = latestCloseDate.getFullYear();
  const month = latestCloseDate.getMonth(); // 0-11
  
  let quarterStart: Date;
  let quarterEnd: Date;
  
  if (month >= 0 && month <= 2) { // Q1: Jan-Mar
    quarterStart = new Date(year, 0, 1);
    quarterEnd = new Date(year, 2, 31);
  } else if (month >= 3 && month <= 5) { // Q2: Apr-Jun
    quarterStart = new Date(year, 3, 1);
    quarterEnd = new Date(year, 5, 30);
  } else if (month >= 6 && month <= 8) { // Q3: Jul-Sep
    quarterStart = new Date(year, 6, 1);
    quarterEnd = new Date(year, 8, 30);
  } else { // Q4: Oct-Dec
    quarterStart = new Date(year, 9, 1);
    quarterEnd = new Date(year, 11, 31);
  }
  
  return { start: quarterStart, end: quarterEnd };
};

// Calculate quarterly P/L from closed positions
const calculateQuarterlyPL = (trades: Trade[]) => {
  const quarter = getMostRecentQuarterWithData(trades);
  
  // Create position manager and get all positions
  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();
  
  // Find positions that closed in the quarter
  const closedPositionsInQuarter = allPositions.filter(position => {
    if (position.status !== 'Closed' && position.status !== 'Expired') return false;
    if (!position.closeDate) return false;
    
    const closeDate = new Date(position.closeDate);
    return closeDate >= quarter.start && closeDate <= quarter.end;
  });
  
  // Calculate total P/L from these positions
  const totalPL = closedPositionsInQuarter.reduce((sum, position) => {
    // P/L = Total Sales - Total Purchases (what we received minus what we paid)
    const positionPL = position.totalSalesBookCost - position.totalPurchasesBookCost;
    return sum + positionPL;
  }, 0);
  
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
  
  // Use position manager for more accurate calculations
  const positionManager = new PositionManager(trades);
  const allPositions = positionManager.getPositions();
  const openPositions = allPositions.filter(p => p.status === 'Open');
  const closedPositions = allPositions.filter(p => p.status === 'Closed' || p.status === 'Expired');
  
  // Calculate win rate based on positions
  const winningPositions = closedPositions.filter(p => (p.totalSalesBookCost - p.totalPurchasesBookCost) > 0);
  const winRate = closedPositions.length > 0 ? (winningPositions.length / closedPositions.length) * 100 : 0;
  
  // Calculate this month's P/L from closed positions
  const currentDate = new Date();
  const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const thisMonthClosedPositions = closedPositions.filter(p => {
    if (!p.closeDate) return false;
    return new Date(p.closeDate) >= thisMonthStart;
  });
  const monthlyPL = thisMonthClosedPositions.reduce((sum, p) => sum + (p.totalSalesBookCost - p.totalPurchasesBookCost), 0);
  
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
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch(
          "https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO/transactions",
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_XANO_AUTH_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const fetchedTrades: Trade[] = data.map((item: any) => {
          // Normalize trade type: "Sold" -> "sell", "Bought" -> "buy"
          let normalizedTradeType = 'other';
          if (item.tradeType) {
            const tradeTypeLower = item.tradeType.toLowerCase();
            if (tradeTypeLower.includes('sold') || tradeTypeLower.includes('sell')) {
              normalizedTradeType = 'sell';
            } else if (tradeTypeLower.includes('bought') || tradeTypeLower.includes('buy')) {
              normalizedTradeType = 'buy';
            }
          }
          
          // Normalize status: "Open" -> "open", "Closed" -> "close"
          let normalizedStatus = 'open';
          if (item.status) {
            const statusLower = item.status.toLowerCase();
            if (statusLower.includes('close')) {
              normalizedStatus = 'close';
            } else if (statusLower.includes('open')) {
              normalizedStatus = 'open';
            }
          }

          const mappedItem: Trade = {
            id: item.id,
            Transaction_Date: item.Transaction_Date,
            tradeType: normalizedTradeType,
            Symbol: item.Symbol,
            contractType: item.contractType,
            Quantity: item.Quantity ?? 0,
            StrikeDate: item.StrikeDate ?? '',
            StrikePrice: item.StrikePrice ?? 0,
            PremiumValue: item.PremiumValue ?? 0,
            Book_Cost: item.Book_Cost ?? 0,
            Security_Number: item.Security_Number,
            status: normalizedStatus,
            profitLoss: item.profitLoss ?? 0, // Default to 0 if not provided by Xano
          };

          return mappedItem;
        });
        setTrades(fetchedTrades);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

const statCardsData = getStatCardsData(trades);

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

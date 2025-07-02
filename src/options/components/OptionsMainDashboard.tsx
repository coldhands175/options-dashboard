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

// Sample data for stat cards
const statCardsData = [
  {
    title: "Portfolio Value",
    value: "$158,432",
    interval: "Last 30 days",
    trend: "up",
    trendValue: "+8.3%",
    data: [
      120000, 122000, 125000, 127000, 128000, 130000, 132000, 135000, 138000, 
      140000, 141000, 143000, 145000, 146000, 148000, 149000, 150000, 151000, 
      152000, 153000, 154000, 155000, 156000, 156500, 157000, 157500, 158000, 
      158200, 158300, 158432,
    ],
  },
  {
    title: "Active Positions",
    value: "23",
    interval: "Current",
    trend: "up",
    trendValue: "+5",
    data: [
      15, 16, 17, 18, 18, 18, 19, 19, 19, 20, 20, 21, 21, 21, 22, 22, 22, 
      22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    ],
  },
  {
    title: "Monthly P/L",
    value: "$12,450",
    interval: "This Month",
    trend: "up",
    trendValue: "+21.7%",
    data: [
      0, 1200, 2400, 2800, 3200, 4000, 4500, 5000, 5400, 6000, 6500, 7000, 
      7500, 8000, 8200, 8500, 9000, 9500, 10000, 10400, 10800, 11000, 11200, 
      11500, 11700, 11900, 12100, 12250, 12350, 12450,
    ],
  },
  {
    title: "Win Rate",
    value: "68%",
    interval: "Last 30 trades",
    trend: "down",
    trendValue: "-3%",
    data: [
      75, 74, 73, 72, 72, 71, 71, 70, 70, 70, 69, 69, 69, 68, 68, 68, 68, 68, 
      68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68,
    ],
  },
];

import { Trade } from "../models/types";

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


          const mappedItem: Trade = {
            id: item.id,
            Transaction_Date: item.Transaction_Date,
            tradeType: item.tradeType ?? 'Other',
            Symbol: item.Symbol,
            contractType: item.contractType,
            Quantity: item.Quantity ?? 0,
            StrikeDate: item.StrikeDate ?? '',
            StrikePrice: item.StrikePrice ?? 0,
            PremiumValue: item.PremiumValue ?? 0,
            Book_Cost: item.Book_Cost ?? 0,
            Security_Number: item.Security_Number,
            status: item.status ?? 'Open', // Default to 'Open' if not provided by Xano
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

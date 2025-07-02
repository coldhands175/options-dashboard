import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

// Sample analytics data
const monthlyProfitData = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  profit: [1200, 1850, 2100, 1750, 2400, 2850],
};

const strategyData = [
  { label: "Covered Calls", value: 42, color: "#2196f3" },
  { label: "Cash-Secured Puts", value: 28, color: "#4caf50" },
  { label: "Iron Condors", value: 15, color: "#ff9800" },
  { label: "Long Calls", value: 10, color: "#f44336" },
  { label: "Credit Spreads", value: 5, color: "#9c27b0" },
];

const winRateByStrategy = {
  strategies: ["Covered Call", "CSP", "Iron Condor", "Long Call", "Credit Spread"],
  winRate: [78, 82, 65, 45, 72],
};

export default function Analytics() {
  const [timeRange, setTimeRange] = React.useState("6m");

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value as string);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" component="h2">
          Portfolio Analytics
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            value={timeRange}
            onChange={handleTimeRangeChange}
            label="Time Range"
          >
            <MenuItem value="1m">1 Month</MenuItem>
            <MenuItem value="3m">3 Months</MenuItem>
            <MenuItem value="6m">6 Months</MenuItem>
            <MenuItem value="1y">1 Year</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={3}>
        {/* Profit/Loss Over Time */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Profit/Loss
              </Typography>
              <Box sx={{ height: 350 }}>
                <LineChart
                  xAxis={[{ 
                    id: 'months',
                    data: monthlyProfitData.months,
                    scaleType: "band"
                  }]}
                  series={[
                    {
                      id: 'profit',
                      data: monthlyProfitData.profit,
                      area: true,
                      showMark: false,
                      color: "#2196f3",
                    },
                  ]}
                  height={350}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Strategy Allocation */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Strategy Allocation
              </Typography>
              <Box sx={{ height: 350, display: "flex", justifyContent: "center" }}>
                <PieChart
                  series={[
                    {
                      data: strategyData,
                      highlightScope: { fade: "global", highlight: "item" },
                      faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
                    },
                  ]}
                  height={350}
                  width={350}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Win Rate By Strategy */}
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Win Rate by Strategy
              </Typography>
              <Box sx={{ height: 350 }}>
                <BarChart
                  xAxis={[{ 
                    id: 'strategies',
                    data: winRateByStrategy.strategies,
                    scaleType: "band"
                  }]}
                  series={[
                    {
                      id: 'winRate',
                      data: winRateByStrategy.winRate,
                      color: "#4caf50",
                      label: "Win Rate (%)",
                    },
                  ]}
                  height={350}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Performance Metrics */}
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Typography variant="body1">
                This section will contain additional performance metrics and analytics 
                such as Sharpe ratio, max drawdown, average holding period, and more 
                detailed statistics about your options trading performance.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

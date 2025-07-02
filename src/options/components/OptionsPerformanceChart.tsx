import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { LineChart } from "@mui/x-charts/LineChart";


// Sample performance data (portfolio value over time)
const monthlyData = [
  { date: new Date(2025, 0, 1), value: 120000 },
  { date: new Date(2025, 0, 15), value: 125000 },
  { date: new Date(2025, 1, 1), value: 123000 },
  { date: new Date(2025, 1, 15), value: 128000 },
  { date: new Date(2025, 2, 1), value: 132000 },
  { date: new Date(2025, 2, 15), value: 135000 },
  { date: new Date(2025, 3, 1), value: 130000 },
  { date: new Date(2025, 3, 15), value: 135000 },
  { date: new Date(2025, 4, 1), value: 138000 },
  { date: new Date(2025, 4, 15), value: 142000 },
  { date: new Date(2025, 5, 1), value: 145000 },
  { date: new Date(2025, 5, 15), value: 148000 },
  { date: new Date(2025, 5, 20), value: 152000 },
  { date: new Date(2025, 5, 25), value: 155000 },
  { date: new Date(2025, 5, 29), value: 158432 },
];

const threeMonthData = monthlyData.filter(
  (item) => item.date >= new Date(2025, 3, 1)
);

const oneMonthData = monthlyData.filter(
  (item) => item.date >= new Date(2025, 5, 1)
);

const weekData = monthlyData.filter(
  (item) => item.date >= new Date(2025, 5, 20)
);

export default function OptionsPerformanceChart() {
  const [timeRange, setTimeRange] = React.useState<string>("6m");
  const [chartData, setChartData] = React.useState(monthlyData);

  // Handle time range change
  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: string | null
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
      
      // Update chart data based on selected time range
      switch (newTimeRange) {
        case "1w":
          setChartData(weekData);
          break;
        case "1m":
          setChartData(oneMonthData);
          break;
        case "3m":
          setChartData(threeMonthData);
          break;
        case "6m":
        default:
          setChartData(monthlyData);
          break;
      }
    }
  };

  // Format data for MUI X Charts
  const xValues = chartData.map((item) => item.date);
  const yValues = chartData.map((item) => item.value);



  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader
        title="Portfolio Performance"
        titleTypographyProps={{
          fontSize: "1.125rem",
          fontWeight: "500",
        }}
        action={
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            aria-label="time range"
            size="small"
            sx={{
              "& .MuiToggleButtonGroup-grouped": {
                border: 1,
                borderColor: "divider",
                "&:not(:first-of-type)": {
                  borderLeftColor: "divider",
                },
              },
            }}
          >
            <ToggleButton value="1w" aria-label="1 week">
              1W
            </ToggleButton>
            <ToggleButton value="1m" aria-label="1 month">
              1M
            </ToggleButton>
            <ToggleButton value="3m" aria-label="3 months">
              3M
            </ToggleButton>
            <ToggleButton value="6m" aria-label="6 months">
              6M
            </ToggleButton>
          </ToggleButtonGroup>
        }
      />
      <CardContent sx={{ flexGrow: 1, pb: 0 }}>
        <Box sx={{ width: "100%", height: 300 }}>
          <LineChart
            series={[
              {
                data: yValues,
                label: "Portfolio Value",
                area: true,
                showMark: false,
                color: "#2196f3",
                valueFormatter: (value) => value ? `$${value.toLocaleString()}` : '$0'
              },
            ]}
            xAxis={[
              {
                data: xValues,
                scaleType: "time",
                valueFormatter: (date) =>
                  date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
              },
            ]}
            yAxis={[
              {
                tickNumber: 5,
                valueFormatter: (value: number) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value),
              },
            ]}
            grid={{ vertical: true, horizontal: true }}
            sx={{
              ".MuiLineElement-root": {
                strokeWidth: 2,
              },
              ".MuiAreaElement-root": {
                fillOpacity: 0.3,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

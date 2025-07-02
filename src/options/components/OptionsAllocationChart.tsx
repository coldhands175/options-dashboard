import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PieChart } from "@mui/x-charts/PieChart";

// Sample allocation data
const allocationData = [
  { id: 0, value: 35, label: "Covered Calls", color: "#2196f3" },
  { id: 1, value: 20, label: "Cash Secured Puts", color: "#4caf50" },
  { id: 2, value: 15, label: "Credit Spreads", color: "#ff9800" },
  { id: 3, value: 10, label: "Iron Condors", color: "#9c27b0" },
  { id: 4, value: 10, label: "Long Calls", color: "#f44336" },
  { id: 5, value: 5, label: "LEAPS", color: "#607d8b" },
  { id: 6, value: 5, label: "Cash", color: "#795548" },
];

// Custom legend for allocation chart
function CustomLegend() {
  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {allocationData.map((item) => (
        <Stack
          key={item.id}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: item.color,
              }}
            />
            <Typography variant="body2">{item.label}</Typography>
          </Stack>
          <Typography variant="body2" fontWeight="medium">
            {item.value}%
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export default function OptionsAllocationChart() {
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
        title="Portfolio Allocation"
        titleTypographyProps={{
          fontSize: "1.125rem",
          fontWeight: "500",
        }}
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Box sx={{ height: 200, width: "100%" }}>
          <PieChart
            series={[
              {
                data: allocationData,
                highlightScope: { fade: "global", highlight: "item" },
                innerRadius: 30,
                paddingAngle: 2,
                cornerRadius: 4,
              },
            ]}
            height={200}
            margin={{ right: 5 }}
          />
        </Box>
        <CustomLegend />
      </CardContent>
    </Card>
  );
}

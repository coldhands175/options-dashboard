import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import { alpha } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";

interface OptionsStatCardProps {
  title: string;
  value: string;
  interval: string;
  trend: "up" | "down";
  trendValue: string;
  data: number[];
}

export default function OptionsStatCard({
  title,
  value,
  interval,
  trend,
  trendValue,
  data,
}: OptionsStatCardProps) {
  const chartColor = trend === "up" ? "#4caf50" : "#f44336";

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.3s, box-shadow 0.3s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) =>
            `0 6px 20px -2px ${alpha(
              theme.palette.mode === "light"
                ? "rgba(0, 0, 0, 0.2)"
                : "rgba(255, 255, 255, 0.1)",
              0.25
            )}`,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="subtitle2"
          component="div"
          color="text.secondary"
          fontWeight={500}
          gutterBottom
        >
          {title}
        </Typography>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 0.5, mt: 1 }}
        >
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
              bgcolor: (theme) =>
                trend === "up"
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
              color: trend === "up" ? "success.main" : "error.main",
              py: 0.5,
              px: 0.8,
              borderRadius: 2,
            }}
          >
            {trend === "up" ? (
              <TrendingUpRoundedIcon fontSize="small" />
            ) : (
              <TrendingDownRoundedIcon fontSize="small" />
            )}
            <Typography variant="caption" fontWeight="bold">
              {trendValue}
            </Typography>
          </Stack>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ mb: 2 }}
        >
          {interval}
        </Typography>
        <Box sx={{ width: "100%", height: 50 }}>
          <BarChart
            series={[
              {
                data,
                color: chartColor,
                highlightScope: { faded: "global", highlighted: "item" },
              },
            ]}
            height={50}
            margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            xAxis={[{ scaleType: "band", data: data.map((_, index) => index), hideTooltip: true }]}
            yAxis={[{ max: Math.max(...data) * 1.2, hideTooltip: true }]}
            disableAxisListener
            skipAnimation
            sx={{
              "& .MuiChartsAxis-line": {
                display: "none",
              },
              "& .MuiChartsAxis-tick": {
                display: "none",
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

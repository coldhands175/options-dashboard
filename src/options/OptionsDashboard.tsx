
import { Outlet, Routes, Route } from "react-router-dom";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-data-grid-pro/themeAugmentation";
import type {} from "@mui/x-tree-view/themeAugmentation";
import { alpha } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import OptionsAppNavbar from "./components/OptionsAppNavbar";
import OptionsHeader from "./components/OptionsHeader";
import OptionsSideMenu from "./components/OptionsSideMenu";
import OptionsMainDashboard from "./components/OptionsMainDashboard";
import Portfolio from "./pages/Portfolio";
import Positions from "./pages/Positions";
import Watchlist from "./pages/Watchlist";
import Trades from "./pages/Trades";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import UploadTrades from "./pages/UploadTrades";
import Notes from "./pages/Notes";
import AppTheme from "../shared-theme/AppTheme";
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from "../dashboard/theme/customizations";

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

export default function OptionsDashboard() {
  return (
    <AppTheme themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: "flex", height: "100vh" }}>
        <OptionsSideMenu />
        <OptionsAppNavbar />
        {/* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: "auto",
            // Add top padding for the top navbar
            pt: { xs: 0, md: 0 },
            // Add left margin/padding to avoid content going under the sidebar
            // This is responsive - on mobile no sidebar, on desktop add margin for sidebar width
            ml: { xs: 0, md: "240px" }, // Match the sidebar width (240px on desktop)
            width: { xs: "100%", md: "calc(100% - 240px)" }, // Adjust width to account for sidebar
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 15 }, // Increased top margin to account for TradingView widget (64px toolbar + 60px widget)
            }}
          >
            <OptionsHeader />
            <Routes>
              <Route index element={<OptionsMainDashboard />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="positions" element={<Positions />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="trades" element={<Trades />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="notes" element={<Notes />} />
              <Route path="settings" element={<Settings />} />
              <Route path="upload-trades" element={<UploadTrades />} />
            </Routes>
            <Outlet />
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}

import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import { useLocation, Link as RouterLink } from "react-router-dom";

export default function OptionsHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  // Function to get page title based on pathname
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/portfolio") return "Portfolio Summary";
    if (pathname === "/positions") return "Active Positions";
    if (pathname === "/watchlist") return "Market Watchlist";
    if (pathname === "/trades") return "Trade History";
    if (pathname === "/analytics") return "Performance Analytics";
    if (pathname === "/settings") return "Account Settings";
    
    // Default fallback
    return "Options Portfolio";
  };

  // Function to generate breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter((p) => p);
    
    if (paths.length === 0) {
      return (
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.primary",
              fontWeight: 500,
            }}
          >
            <HomeRoundedIcon sx={{ mr: 0.5 }} fontSize="small" />
            Dashboard
          </Link>
        </Breadcrumbs>
      );
    }
    
    return (
      <Breadcrumbs aria-label="breadcrumb">
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <HomeRoundedIcon sx={{ mr: 0.5 }} fontSize="small" />
          Dashboard
        </Link>
        
        {paths.map((path, index) => {
          // For the last item (current page), don't make it a link
          const isLast = index === paths.length - 1;
          const to = `/${paths.slice(0, index + 1).join("/")}`;
          
          // Capitalize first letter of path for display
          const displayPath = path.charAt(0).toUpperCase() + path.slice(1);
          
          return isLast ? (
            <Typography
              key={path}
              color="text.primary"
              sx={{ fontWeight: 500 }}
            >
              {displayPath}
            </Typography>
          ) : (
            <Link
              key={path}
              component={RouterLink}
              to={to}
              underline="hover"
            >
              {displayPath}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  // Current date display
  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        pt: { xs: 2, sm: 3 },
        pb: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Stack spacing={1}>
        {getBreadcrumbs()}
        <Typography variant="h4" component="h1" fontWeight="bold">
          {getPageTitle()}
        </Typography>
      </Stack>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: { xs: 1, sm: 0 } }}
      >
        {formatDate()}
      </Typography>
    </Box>
  );
}

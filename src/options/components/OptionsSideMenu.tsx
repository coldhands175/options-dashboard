
import { useLocation, Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
const drawerWidth = 240;

const menuItems = [
  { text: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
  { text: "Portfolio", icon: <AccountBalanceWalletRoundedIcon />, path: "/portfolio" },
  { text: "Positions", icon: <ShowChartRoundedIcon />, path: "/positions" },
  { text: "Watchlist", icon: <StarRoundedIcon />, path: "/watchlist" },
  { text: "Trades", icon: <CompareArrowsRoundedIcon />, path: "/trades" },
  { text: "Analytics", icon: <InsightsRoundedIcon />, path: "/analytics" },
  { text: "Upload Trades", icon: <CloudUploadRoundedIcon />, path: "/upload-trades" },
  { text: "Settings", icon: <SettingsRoundedIcon />, path: "/settings" },
];

export default function OptionsSideMenu() {
  const location = useLocation();
  
  // Helper function to determine if a path is active
  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") {
      return true;
    }
    return path !== "/" && location.pathname.startsWith(path);
  };

  // Content for the drawer
  const drawerContent = (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 3,
          py: 3,
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "primary.main",
          }}
        >
          OptionsTracker
        </Typography>
      </Box>

      <List sx={{ px: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={isActive(item.path)}
              sx={(theme) => ({
                borderRadius: theme.shape.borderRadius,
                marginBottom: 4,
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                  },
                },
              })}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <>
      {/* Desktop drawer - persistent */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            borderRight: "1px dashed rgba(145, 158, 171, 0.2)",
            bgcolor: "background.default",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Mobile drawer - always hidden, controlled by Navbar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            borderRight: "1px dashed rgba(145, 158, 171, 0.2)",
            bgcolor: "background.default",
            translate: "-100%",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

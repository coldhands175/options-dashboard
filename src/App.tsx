
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CrmDashboard from "./crm/CrmDashboard";
import OptionsDashboard from "./options/OptionsDashboard";
import AuthenticatedSignIn from "./components/AuthenticatedSignIn";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./components/ResetPassword";
import { AuthProvider } from "./context/AuthContext";
import { ConvexProvider } from "./lib/convex";
// Note: convex.tsx renamed from convex.ts to support JSX
import './tradingview-overrides.css';


function NotFound() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        404: Page Not Found
      </Typography>
      <Typography variant="body1">
        The page you're looking for doesn't exist or has been moved.
      </Typography>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ConvexProvider>
        <AuthProvider>
          <CssBaseline enableColorScheme />
          <Routes>
            <Route path="/login" element={<AuthenticatedSignIn />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*" 
              element={
                <ProtectedRoute>
                  <OptionsDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/crm/*" 
              element={
                <ProtectedRoute>
                  <CrmDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ConvexProvider>
    </BrowserRouter>
  );
}

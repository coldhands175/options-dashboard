import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert, AlertTitle, Box, Typography, Button } from '@mui/material';
import { AdminPanelSettings, Lock } from '@mui/icons-material';

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that protects admin-only routes and pages
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children, fallback }) => {
  const { user, isAuthenticated, checkAdminStatus, isLoading, isConvexSynced } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
      >
        <Typography variant="h6" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Not authenticated at all
  if (!isAuthenticated || !user) {
    return fallback || (
      <Box p={3}>
        <Alert severity="warning" icon={<Lock />}>
          <AlertTitle>Authentication Required</AlertTitle>
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Authenticated but not an admin
  if (!checkAdminStatus()) {
    return fallback || (
      <Box p={3}>
        <Alert severity="error" icon={<AdminPanelSettings />}>
          <AlertTitle>Admin Access Required</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You don't have administrator privileges to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact your system administrator if you believe you should have access.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Show warning if Convex sync is not complete (but still allow access)
  const convexSyncWarning = !isConvexSynced && (
    <Box mb={2}>
      <Alert severity="info">
        <AlertTitle>Syncing User Data</AlertTitle>
        Your user data is being synchronized. Some features may be limited until sync completes.
      </Alert>
    </Box>
  );

  // User is authenticated and is an admin
  return (
    <>
      {convexSyncWarning}
      {children}
    </>
  );
};

export default AdminRoute;

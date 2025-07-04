import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  Typography,
  Divider,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AppTheme from '../shared-theme/AppTheme';
import { xanoApi, XanoApiError } from '../services/xanoApi';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  // Form validation
  const [newPasswordError, setNewPasswordError] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('');

  // Check if token and email are present
  React.useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset link. Please request a new password reset.');
    }
  }, [token, email]);

  const validateForm = (): boolean => {
    let isValid = true;
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!newPassword) {
      setNewPasswordError('New password is required');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm() || !token || !email) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await xanoApi.resetPassword(token, email, newPassword);
      setSuccess(true);
    } catch (error: any) {
      if (error instanceof XanoApiError) {
        if (error.status === 400) {
          setError('Invalid or expired reset token. Please request a new password reset.');
        } else if (error.status === 404) {
          setError('User not found. Please request a new password reset.');
        } else {
          setError(error.message || 'Failed to reset password. Please try again.');
        }
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (!token || !email) {
    return (
      <AppTheme>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          p: 2 
        }}>
          <Card sx={{ maxWidth: 500, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <LockResetIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="error">
                Invalid Reset Link
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                This password reset link is invalid or has expired. Please request a new password reset.
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </Box>
      </AppTheme>
    );
  }

  if (success) {
    return (
      <AppTheme>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          p: 2 
        }}>
          <Card sx={{ maxWidth: 500, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                Password Reset Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your password has been successfully updated. You can now log in with your new password.
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </Box>
      </AppTheme>
    );
  }

  return (
    <AppTheme>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 2 
      }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardHeader
            title="Reset Your Password"
            subheader={`Create a new password for ${email}`}
            avatar={<LockResetIcon color="primary" />}
          />
          <Divider />
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <FormControl fullWidth margin="normal">
                <FormLabel htmlFor="new-password">New Password</FormLabel>
                <TextField
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={!!newPasswordError}
                  helperText={newPasswordError || 'Password must be at least 6 characters long'}
                  disabled={isLoading}
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                  autoFocus
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <FormLabel htmlFor="confirm-password">Confirm New Password</FormLabel>
                <TextField
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={!!confirmPasswordError}
                  helperText={confirmPasswordError}
                  disabled={isLoading}
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                />
              </FormControl>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <LockResetIcon />}
                  fullWidth
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </Box>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  variant="text" 
                  onClick={handleGoToLogin}
                  disabled={isLoading}
                >
                  Back to Login
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </AppTheme>
  );
}

import * as React from 'react';
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
  Divider,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../hooks/useAuth';
import { xanoApi, XanoApiError } from '../services/xanoApi';

interface ChangePasswordProps {
  onPasswordChanged?: () => void;
}

export default function ChangePassword({ onPasswordChanged }: ChangePasswordProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  // Form validation
  const [currentPasswordError, setCurrentPasswordError] = React.useState('');
  const [newPasswordError, setNewPasswordError] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState('');

  const validateForm = (): boolean => {
    let isValid = true;
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!currentPassword) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    }

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

    if (currentPassword === newPassword) {
      setNewPasswordError('New password must be different from current password');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Call the password change API
      await xanoApi.changePassword(currentPassword, newPassword);
      
      setSuccess('Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      if (onPasswordChanged) {
        onPasswordChanged();
      }
      
    } catch (error: any) {
      if (error instanceof XanoApiError) {
        if (error.code === 'UNAUTHORIZED') {
          setError('Current password is incorrect.');
        } else if (error.code === 'NO_AUTH_TOKEN') {
          setError('You must be logged in to change your password.');
        } else {
          setError(error.message || 'Failed to change password. Please try again.');
        }
      } else {
        setError(error.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardHeader
        title="Change Password"
        subheader={`Update password for ${user?.email}`}
        avatar={<LockIcon color="primary" />}
      />
      <Divider />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearMessages}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={clearMessages}>
              {success}
            </Alert>
          )}

          <FormControl fullWidth margin="normal">
            <FormLabel htmlFor="current-password">Current Password</FormLabel>
            <TextField
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={!!currentPasswordError}
              helperText={currentPasswordError}
              disabled={isLoading}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </FormControl>

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
              startIcon={isLoading ? <CircularProgress size={20} /> : <LockIcon />}
              sx={{ minWidth: 160 }}
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              disabled={isLoading}
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                clearMessages();
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

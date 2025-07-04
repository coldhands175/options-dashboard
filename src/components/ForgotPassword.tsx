import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import CloseIcon from '@mui/icons-material/Close';
import { xanoApi, XanoApiError } from '../services/xanoApi';

interface ForgotPasswordProps {
  open: boolean;
  onClose: () => void;
}

export default function ForgotPassword({ open, onClose }: ForgotPasswordProps) {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await xanoApi.requestPasswordReset(email);
      setSuccess(true);
      setEmail('');
    } catch (error: any) {
      if (error instanceof XanoApiError) {
        if (error.status === 404) {
          setError('No account found with this email address.');
        } else {
          setError(error.message || 'Failed to send password reset email. Please try again.');
        }
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    setEmailError('');
    onClose();
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
          Reset Password
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <EmailIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="success.main">
              Password Reset Email Sent!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              We've sent a password reset link to <strong>{email}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please check your email and follow the instructions to reset your password. 
              The link will expire in 1 hour for security purposes.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Enter your email address below and we'll send you a link to reset your password.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                error={!!emailError}
                helperText={emailError}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
                placeholder="Enter your email address"
                sx={{ mb: 3 }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {success ? (
          <Button 
            onClick={handleClose} 
            variant="contained" 
            fullWidth
          >
            Close
          </Button>
        ) : (
          <>
            <Button 
              onClick={handleClose} 
              disabled={isLoading}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || !email}
              startIcon={isLoading ? <CircularProgress size={20} /> : <EmailIcon />}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

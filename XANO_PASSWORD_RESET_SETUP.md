# Setting up Password Reset with Email in Xano

## Overview
This document explains how to create a complete "Forgot Password" system with email-based password reset for the Options Dashboard application.

## Prerequisites
- Xano workspace with "Dashboard Users" table
- Email integration configured in Xano (SMTP settings)

## Database Setup

### 1. Create Password Reset Tokens Table

Create a new table called `password_reset_tokens`:

**Table Fields:**
- `id` (int, primary key, auto-increment)
- `user_id` (int, foreign key to Dashboard Users table)
- `token` (text, unique)
- `email` (email)
- `expires_at` (timestamp)
- `used` (boolean, default: false)
- `created_at` (timestamp, default: now)

## API Endpoints

### 1. Request Password Reset Endpoint

**Endpoint:** `POST /auth/request-password-reset`
**Authentication:** None required
**Input Parameters:**
- `email` (email, required)

**Function Stack:**
1. **Validate Email** - Check if user exists with this email
2. **Generate Token** - Create a unique token (UUID or random string)
3. **Calculate Expiry** - Set expiration time (1 hour from now)
4. **Store Token** - Save token, user_id, email, and expiry in password_reset_tokens table
5. **Send Email** - Use Xano's email function to send reset link
6. **Return Response** - Success message (don't reveal if email exists)

**Email Template:**
```html
Subject: Reset Your Password - Options Dashboard

Hello,

You requested a password reset for your Options Dashboard account.

Click the link below to reset your password:
{{reset_link}}

This link will expire in 1 hour for security purposes.

If you didn't request this, please ignore this email.

Best regards,
Options Dashboard Team
```

**Reset Link Format:**
```
https://your-domain.com/reset-password?token={{token}}&email={{email}}
```

### 2. Reset Password Endpoint

**Endpoint:** `POST /auth/reset-password`
**Authentication:** None required
**Input Parameters:**
- `token` (text, required)
- `email` (email, required) 
- `newPassword` (password, required)

**Function Stack:**
1. **Validate Token** - Check if token exists, not used, and not expired
2. **Verify Email** - Ensure email matches the token record
3. **Get User** - Find user by email
4. **Update Password** - Hash new password and update Dashboard Users table
5. **Mark Token Used** - Set `used = true` for the token
6. **Return Response** - Success message

## Frontend Integration

Update the `xanoApi.ts` file with actual API calls:

```typescript
// Password reset functionality
async requestPasswordReset(email: string) {
  return xanoRequest('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({
      email,
    }),
  }, false); // false = no auth required
},

async resetPassword(token: string, email: string, newPassword: string) {
  return xanoRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      email,
      newPassword,
    }),
  }, false); // false = no auth required
}
```

## Email Configuration in Xano

### 1. SMTP Settings
Configure your SMTP settings in Xano:
- **Provider:** Gmail, SendGrid, AWS SES, etc.
- **Host:** Your SMTP server
- **Port:** Usually 587 for TLS
- **Username:** Your email/API key
- **Password:** Your password/secret

### 2. Email Function
In your Xano function stack, use the "Send Email" function with:
- **To:** `{{email}}`
- **Subject:** "Reset Your Password - Options Dashboard"
- **HTML Body:** Your email template with reset link

## Security Considerations

### 1. Token Security
- **Unique Tokens:** Use UUID or cryptographically secure random strings
- **Short Expiry:** 1 hour maximum
- **Single Use:** Mark tokens as used after successful reset
- **Cleanup:** Regularly delete expired tokens

### 2. Rate Limiting
- Limit reset requests per email (e.g., 3 per hour)
- Implement IP-based rate limiting
- Add CAPTCHA for suspicious activity

### 3. Email Validation
- Verify email format before processing
- Don't reveal whether email exists in system
- Log all reset attempts for monitoring

### 4. Password Requirements
- Minimum length (6+ characters)
- Complexity requirements if needed
- Different from current password

## Error Handling

### Common Error Scenarios:
1. **Invalid Email:** Return generic "if account exists, email sent" message
2. **Expired Token:** Clear error message with option to request new reset
3. **Invalid Token:** Clear error message with option to request new reset
4. **Rate Limited:** "Too many requests, try again later"
5. **Email Delivery Failed:** Log error, show generic success to user

## Testing Checklist

### Password Reset Request:
- [ ] Valid email sends reset email
- [ ] Invalid email returns success (but no email sent)
- [ ] Rate limiting works correctly
- [ ] Email contains correct reset link
- [ ] Token expires after 1 hour

### Password Reset:
- [ ] Valid token allows password reset
- [ ] Expired token shows appropriate error
- [ ] Used token shows appropriate error
- [ ] Invalid token shows appropriate error
- [ ] Email mismatch shows appropriate error
- [ ] Successful reset updates password in database
- [ ] Can login with new password
- [ ] Old password no longer works

## Monitoring & Analytics

### Track These Metrics:
- Password reset requests per day
- Successful vs failed reset attempts
- Token expiry rates
- Email delivery success rates
- Time between request and reset completion

## Sample Xano Function Code

### Generate Reset Token Function:
```javascript
// Generate a secure random token
const token = require('crypto').randomBytes(32).toString('hex');

// Calculate expiry (1 hour from now)
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

return {
  token: token,
  expires_at: expiresAt
};
```

### Email Template Variables:
```javascript
const resetLink = `https://your-domain.com/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

return {
  reset_link: resetLink,
  user_email: email,
  expiry_hours: 1
};
```

This setup provides a secure, user-friendly password reset system that follows security best practices.

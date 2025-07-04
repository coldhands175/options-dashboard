# Setting up Password Change API in Xano

## Overview
This document explains how to create a custom API endpoint in Xano to handle password changes for the Options Dashboard application.

## Steps to Create the Password Change Endpoint

### 1. Create a New API Endpoint in Xano

1. Go to your Xano workspace
2. Navigate to the "Options Database" API Group
3. Click "Add Endpoint"
4. Configure the endpoint:
   - **Name**: `auth/change-password`
   - **Method**: `PATCH`
   - **Authentication**: Enable (use Dashboard Users table)
   - **Description**: "Change user password"

### 2. Configure Input Parameters

Add the following input parameters:
- `currentPassword` (text, required)
- `newPassword` (password, required)

### 3. Add Function Stack Logic

In the function stack, add the following steps:

#### Step 1: Get Authenticated User
- Add "Get Authenticated User" function
- This will get the current user from the auth token

#### Step 2: Verify Current Password
- Add "Custom Code" function
- Use Xano's password verification to check if `currentPassword` matches the user's stored password hash

#### Step 3: Validate New Password
- Add validation for new password strength (minimum length, etc.)
- Ensure new password is different from current password

#### Step 4: Update User Password
- Add "Database Query" to update the Dashboard Users table
- Use Xano's password hashing to hash the new password
- Update the user record with the new password hash

#### Step 5: Return Response
- Return success message or error response

### 4. Example Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

## Frontend Integration

Once the Xano endpoint is created, update the `xanoApi.ts` file:

```typescript
async changePassword(currentPassword: string, newPassword: string) {
  return xanoRequest('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}
```

## Security Considerations

1. **Always hash passwords** - Never store plain text passwords
2. **Validate current password** - Always verify the current password before allowing changes
3. **Password strength** - Implement password complexity requirements
4. **Rate limiting** - Consider adding rate limiting to prevent brute force attacks
5. **Audit logging** - Log password change attempts for security monitoring

## Testing

1. Test with correct current password
2. Test with incorrect current password
3. Test with weak new passwords
4. Test with the same password as current
5. Test without authentication

## Notes

- The current implementation in the React app uses a mock API call
- Replace the mock implementation once the Xano endpoint is ready
- Consider adding email notifications for password changes
- Consider forcing re-authentication after password change

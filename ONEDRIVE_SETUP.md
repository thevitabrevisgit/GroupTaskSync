# OneDrive Storage Setup Guide

This guide will walk you through setting up your 6 family OneDrive accounts as backend storage for TaskShare images.

## Overview

Your TaskShare app can use your Microsoft Family OneDrive accounts (6TB total) to store task images permanently. This eliminates the image persistence issues in development and provides reliable cloud storage for production.

## Prerequisites

- Microsoft Family subscription with 6 OneDrive accounts
- Admin access to Azure AD/Microsoft Entra ID (can be created with any Microsoft account)

## Step 1: Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Set up your app:
   - Name: `TaskShare Image Storage`
   - Account types: `Accounts in any organizational directory and personal Microsoft accounts`
   - Redirect URI: `http://localhost` (for getting refresh tokens)
5. Click **Register**

## Step 2: Configure App Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `Files.ReadWrite.All` - Access to all user files
   - `offline_access` - Refresh token access
4. Click **Grant admin consent** (if available)

## Step 3: Get Client Credentials

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `TaskShare Storage Secret`
4. Set expiration: `24 months` (maximum)
5. Click **Add** and **copy the Value immediately** (you won't see it again)

Note the following from your app:
- **Application (client) ID** (from Overview page)
- **Client secret** (from step above)
- **Directory (tenant) ID** (from Overview page, can use 'common' for personal accounts)

## Step 4: Get Refresh Tokens for Each Account

For each of your 6 OneDrive accounts, you need to get a refresh token:

### Method 1: Using PowerShell Script (Recommended)

```powershell
# Replace with your values
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_CLIENT_SECRET"
$redirectUri = "http://localhost"
$scope = "https://graph.microsoft.com/Files.ReadWrite.All offline_access"

# Generate authorization URL
$authUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=$clientId&response_type=code&redirect_uri=$redirectUri&response_mode=query&scope=$scope"

Write-Host "1. Open this URL in your browser:"
Write-Host $authUrl
Write-Host ""
Write-Host "2. Sign in with each OneDrive account"
Write-Host "3. Copy the 'code' parameter from the redirect URL"
Write-Host "4. Paste it below and press Enter"

$code = Read-Host "Enter authorization code"

# Exchange code for refresh token
$tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
$body = @{
    client_id = $clientId
    client_secret = $clientSecret
    code = $code
    redirect_uri = $redirectUri
    grant_type = "authorization_code"
}

$response = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
Write-Host "Refresh Token: $($response.refresh_token)"
```

### Method 2: Manual Browser Method

1. Replace `YOUR_CLIENT_ID` in this URL with your actual client ID:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&response_mode=query&scope=https://graph.microsoft.com/Files.ReadWrite.All%20offline_access
```

2. Open the URL in your browser
3. Sign in with the first OneDrive account
4. You'll be redirected to `http://localhost/?code=XXXXXX`
5. Copy the `code` parameter value
6. Use this curl command to get the refresh token:

```bash
curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=YOUR_CODE&redirect_uri=http://localhost&grant_type=authorization_code"
```

7. From the response, save the `refresh_token` value
8. Repeat for all 6 accounts (use private/incognito windows to avoid conflicts)

## Step 5: Configure Environment Variables

Add these environment variables to your Replit project:

```bash
# Azure App Registration
ONEDRIVE_CLIENT_ID=your_client_id_here
ONEDRIVE_CLIENT_SECRET=your_client_secret_here
ONEDRIVE_TENANT_ID=common  # or your specific tenant ID

# Refresh tokens for each OneDrive account
ONEDRIVE_REFRESH_TOKEN_1=refresh_token_for_account_1
ONEDRIVE_REFRESH_TOKEN_2=refresh_token_for_account_2
ONEDRIVE_REFRESH_TOKEN_3=refresh_token_for_account_3
ONEDRIVE_REFRESH_TOKEN_4=refresh_token_for_account_4
ONEDRIVE_REFRESH_TOKEN_5=refresh_token_for_account_5
ONEDRIVE_REFRESH_TOKEN_6=refresh_token_for_account_6
```

## Step 6: Verify Setup

1. Add the environment variables to your Replit project
2. Restart your application
3. Check the console logs for: `📸 OneDrive storage initialized with X accounts`
4. Test by uploading an image to a task
5. Visit `/api/onedrive/status` to see storage info for all accounts

## Storage Distribution

The system automatically distributes images across your 6 OneDrive accounts using round-robin distribution:
- Account 1: Images 1, 7, 13, 19...
- Account 2: Images 2, 8, 14, 20...
- Account 3: Images 3, 9, 15, 21...
- And so on...

This ensures even distribution across your 6TB total storage.

## Troubleshooting

### "Authentication failed" errors
- Check your client ID and secret are correct
- Ensure refresh tokens haven't expired (they last ~90 days of inactivity)
- Verify the accounts have OneDrive access

### "Files.ReadWrite.All permission required" errors
- Ensure you granted the correct permissions in Azure
- Try re-generating refresh tokens

### Images not loading
- Check that the OneDrive accounts haven't hit storage limits
- Verify the sharing links are working
- Look for error logs in the console

## Security Notes

- Client secrets should be kept secure and rotated regularly
- Refresh tokens provide long-term access - store them securely
- The app only accesses a dedicated `TaskShare/images/` folder in each OneDrive
- Images are shared with anonymous view access for web display

## Refresh Token Renewal

Refresh tokens automatically renew when used, but if they expire:
1. Repeat Step 4 for the affected account
2. Update the corresponding `ONEDRIVE_REFRESH_TOKEN_X` environment variable
3. Restart the application

Your OneDrive storage is now ready to provide reliable, persistent image storage for your TaskShare application!
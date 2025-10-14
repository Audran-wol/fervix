# FERVIX React Native Integration Guide

## Overview

This guide explains how to integrate the FERVIX Device Activation API into your React Native application. The system uses QR codes to control access to your app.

## How It Works

1. **User opens your React Native app**
2. **App shows QR code scanner**
3. **User scans their FERVIX QR code** (contains serial number like FV88375464)
4. **App sends activation request to our API**
5. **API validates the QR code and activates the device**
6. **App unlocks and becomes usable**

## API Endpoints

### 1. Activate Device

**URL:** `POST https://your-domain.com/api/activate-device`

**What it does:** Activates a device using a scanned QR code

**Request:**

- Send the serial code from the QR code
- Send a unique device ID
- Send device information (optional)

**Response:**

- Success: Device is activated, app can be used
- Error: Device cannot be activated (expired code, already used, etc.)

### 2. Validate Device

**URL:** `POST https://your-domain.com/api/validate-device`

**What it does:** Checks if a device is already activated

**Request:**

- Send device ID
- Optionally send the serial code

**Response:**

- Success: Device is activated and can use the app
- Error: Device is not activated

## What You Need to Do in Your App

### 1. QR Code Scanning

- Add a QR code scanner to your app
- When user scans a code, extract the serial number (format: FV + 8 digits)
- Validate the format before sending to API

### 2. Device ID Generation

- Generate a unique ID for each device
- Store this ID securely on the device
- Use the same ID for all API calls

### 3. API Calls

- Make HTTP POST requests to our API endpoints
- Handle success and error responses
- Show appropriate messages to users

### 4. Local Storage

- Store activation status locally on the device
- Check this status when app starts
- Only allow app usage if device is activated

## User Experience Flow

1. **First Time User:**

   - Opens app → sees "Scan QR Code" screen
   - Scans QR code → app activates → can use app
2. **Returning User:**

   - Opens app → checks if already activated → if yes, can use app immediately
   - If not activated → shows "Scan QR Code" screen
3. **Error Cases:**

   - Invalid QR code → show error message
   - Expired QR code → show "contact support" message
   - Network error → show "check internet" message

## Required Permissions

**iOS:** Camera permission for QR scanning
**Android:** Camera and internet permissions

## Error Handling

Your app should handle these common errors:

- **Invalid QR Code:** "Please scan a valid FERVIX QR code"
- **Already Activated:** "This device is already activated"
- **Expired Code:** "QR code has expired, contact support"
- **Max Scans Reached:** "QR code limit reached, contact support"
- **Network Error:** "Check your internet connection"
- **Code Not Found:** "QR code not found, check the code"

## Security Notes

- Always use HTTPS for API calls
- Store device ID securely (use device keychain)
- Don't expose sensitive information in error messages
- Validate all inputs before sending to API

## Testing

Test with these scenarios:

- Valid QR code activation
- Invalid QR code
- Expired QR code
- Network offline
- App restart (should remember activation)
- Multiple devices with same QR code

## Support

For questions about integration:

- **Email:** tech-support@fervix.com
- **API Documentation:** See API_DOCUMENTATION.md

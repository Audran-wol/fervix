# FERVIX Device Activation API Documentation

## Overview

The FERVIX Device Activation API provides secure activation and validation services for the FERVIX React Native application. This API ensures that only devices with valid, unexpired QR codes can activate and use the application.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Currently, the API does not require authentication tokens. However, we recommend implementing API key authentication for production use.

## API Endpoints

### 1. Device Activation

**Endpoint:** `POST /api/activate-device`

**Purpose:** Activates a device using a scanned QR code serial number.

#### Request

**Headers:**

```json
{
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "serialCode": "FV88375464",
  "deviceId": "unique-device-identifier",
  "deviceInfo": {
    "platform": "ios",
    "version": "1.0.0",
    "model": "iPhone 14",
    "osVersion": "16.0"
  }
}
```

**Required Fields:**

- `serialCode` (string): The serial number extracted from the QR code (format: FV + 8 digits)
- `deviceId` (string): Unique identifier for the device

**Optional Fields:**

- `deviceInfo` (object): Additional device information for tracking

#### Response

**Success Response (200):**

```json
{
  "success": true,
  "message": "Device activated successfully",
  "data": {
    "serialCode": "FV88375464",
    "batchName": "Production Batch #1",
    "scanCount": 1,
    "maxScans": 5,
    "remainingScans": 4,
    "activatedAt": "2025-01-13T10:30:00.000Z",
    "deviceId": "unique-device-identifier",
    "expiresAt": null
  }
}
```

**Error Responses:**

| Status | Error Code            | Description                             |
| ------ | --------------------- | --------------------------------------- |
| 400    | `MISSING_FIELDS`    | Required fields are missing             |
| 400    | `INVALID_FORMAT`    | Serial code format is invalid           |
| 404    | `CODE_NOT_FOUND`    | QR code not found in database           |
| 403    | `CODE_INACTIVE`     | QR code is inactive                     |
| 409    | `ALREADY_ACTIVATED` | Device already activated with this code |
| 410    | `CODE_EXPIRED`      | QR code has expired                     |
| 410    | `CODE_EXHAUSTED`    | QR code has reached maximum scan limit  |
| 500    | `INTERNAL_ERROR`    | Internal server error                   |

### 2. Device Validation

**Endpoint:** `POST /api/validate-device`

**Purpose:** Validates if a device is activated and checks activation status.

#### Request

**Body:**

```json
{
  "deviceId": "unique-device-identifier",
  "serialCode": "FV88375464" // Optional
}
```

#### Response

**Success Response (200) - Specific Code:**

```json
{
  "success": true,
  "message": "Device validation successful",
  "data": {
    "isActivated": true,
    "serialCode": "FV88375464",
    "batchName": "Production Batch #1",
    "scanCount": 1,
    "maxScans": 5,
    "remainingScans": 4,
    "activatedAt": "2025-01-13T10:30:00.000Z",
    "lastScannedAt": "2025-01-13T10:30:00.000Z",
    "expiresAt": null,
    "isExpired": false,
    "isExhausted": false,
    "status": "active"
  }
}
```

**Success Response (200) - All Activations:**

```json
{
  "success": true,
  "message": "Device validation successful",
  "data": {
    "isActivated": true,
    "deviceId": "unique-device-identifier",
    "totalActivations": 2,
    "activations": [
      {
        "serialCode": "FV88375464",
        "batchName": "Production Batch #1",
        "scanCount": 1,
        "maxScans": 5,
        "remainingScans": 4,
        "activatedAt": "2025-01-13T10:30:00.000Z",
        "lastScannedAt": "2025-01-13T10:30:00.000Z",
        "expiresAt": null,
        "isExpired": false,
        "isExhausted": false,
        "status": "active"
      }
    ]
  }
}
```

### 3. API Health Check

**Endpoint:** `GET /api/activate-device`

**Purpose:** Check if the API is running and accessible.

#### Response

```json
{
  "success": true,
  "message": "FERVIX Device Activation API is running",
  "version": "1.0.0",
  "timestamp": "2025-01-13T10:30:00.000Z"
}
```

## Error Handling

### Common Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "data": {
    // Additional error context (optional)
  }
}
```

### Error Codes Reference

| Code                     | HTTP Status | Description                | Action Required                         |
| ------------------------ | ----------- | -------------------------- | --------------------------------------- |
| `MISSING_FIELDS`       | 400         | Required fields missing    | Include all required fields             |
| `INVALID_FORMAT`       | 400         | Serial code format invalid | Use correct FV + 8 digits format        |
| `CODE_NOT_FOUND`       | 404         | QR code not found          | Verify serial code is correct           |
| `CODE_INACTIVE`        | 403         | QR code is inactive        | Contact support                         |
| `ALREADY_ACTIVATED`    | 409         | Device already activated   | Use different device or contact support |
| `CODE_EXPIRED`         | 410         | QR code has expired        | Get new QR code                         |
| `CODE_EXHAUSTED`       | 410         | Maximum scans reached      | Get new QR code                         |
| `DEVICE_NOT_ACTIVATED` | 404         | Device not activated       | Activate device first                   |
| `NO_ACTIVATIONS`       | 404         | No activations found       | Activate device first                   |
| `QUERY_FAILED`         | 500         | Database query failed      | Retry request                           |
| `UPDATE_FAILED`        | 500         | Database update failed     | Retry request                           |
| `INTERNAL_ERROR`       | 500         | Server error               | Contact support                         |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Activation requests:** 5 requests per minute per device
- **Validation requests:** 30 requests per minute per device

## Security Considerations

1. **Device ID Generation:** Use a cryptographically secure method to generate unique device IDs
2. **Local Storage:** Store activation status securely using device keychain/keystore
3. **Network Security:** Always use HTTPS in production
4. **Input Validation:** Validate all inputs on both client and server side

## Testing

### Test QR Codes

For development and testing, use these sample serial codes:

- `FV12345678` - Valid, unlimited scans
- `FV87654321` - Valid, 3 max scans
- `FV11111111` - Expired code
- `FV22222222` - Inactive code
- `FV33333333` - Exhausted code (5/5 scans)

### Testing Scenarios

1. **Valid Activation:** Use a valid serial code with a new device ID
2. **Duplicate Activation:** Try activating the same device with the same code
3. **Invalid Code:** Use a non-existent serial code
4. **Expired Code:** Use an expired serial code
5. **Exhausted Code:** Use a code that has reached max scans
6. **Network Error:** Test with no internet connection
7. **Invalid Format:** Test with malformed serial codes

## Integration Checklist

- [ ] Implement QR code scanning functionality
- [ ] Generate unique device ID
- [ ] Implement API calls with proper error handling
- [ ] Store activation status locally
- [ ] Implement offline activation checking
- [ ] Add user-friendly error messages
- [ ] Test all error scenarios
- [ ] Implement proper loading states
- [ ] Add network connectivity checks
- [ ] Implement retry logic for failed requests

## Support

For technical support or questions about the API:

- **Email:** tech-support@fervix.com
- **Documentation:** This file
- **Status Page:** https://status.fervix.com

## Version History

- **v1.0.0** (2025-01-13): Initial API release with activation and validation endpoints

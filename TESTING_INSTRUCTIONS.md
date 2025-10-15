# USB Device Detection - Testing Instructions

## Current Status
**Testing Mode Enabled** - The app will now detect USB devices even while connected to PC for debugging.

## What Was Changed

### 1. ✅ Removed Charging Gate (Temporarily)
- **Before**: App blocked all detection when `is_charging: true`
- **After**: Detection works even while phone is charging from PC
- **Location**: `FervixNativePowerModule.kt` line 271-282

### 2. ✅ USB Attach Window Always Opens
- **Before**: Only opened when `!isCharging && plugType == 0`
- **After**: Opens on ANY USB device attach
- **Location**: `FervixNativePowerModule.kt` line 75-81

### 3. ✅ Simplified Detection Logic
- **Attach Window**: 3 seconds after USB plug
- **During Attach Window**: Only needs 30mA drain increase
- **Outside Attach Window**: Needs full 260mA threshold
- **Debounce**: 0.8 seconds (faster than before)

## How to Test

### Step 1: Build & Install
```bash
cd android
./gradlew app:assembleDebug
cd ..
npx expo run:android --device
```

### Step 2: Monitor Logs
Open a NEW terminal window and run:
```bash
adb logcat | findstr FervixNativePower
```
This will show you native Android logs even when USB is unplugged!

### Step 3: Test Sequence

#### A. While Connected to PC (for initial calibration):
1. Open app on HomeScreen
2. Wait 8 seconds for calibration
3. You should see logs like:
   ```
   ✅ Calibration complete
   🔍 Detection: current=..., baseline=..., deltaMag=...
   ```

#### B. Plug Your USB Speaker/Device:
1. **Plug the device into phone's USB-C port**
2. Watch logcat terminal - you should see:
   ```
   ⚡ USB device attached - ALWAYS scheduling attach window
   🚦 Attach window opened for 3 seconds
   🔍 Detection: ..., inAttachWindow=true, isDraining=true, startAllowed=true
   🔥 Start candidate: deltaMag=XXXmA
   🔥 START_HEAT confirmed!
   ```
3. App should show "Device Connected" image
4. After 5 seconds, should navigate to Heating screen

## What the Logs Mean

### Key Log Messages:
- `⚡ USB device attached` = USB hardware event detected
- `🚦 Attach window opened` = 3-second permissive detection window started
- `🔍 Detection: inAttachWindow=true` = Inside attach window (lower threshold)
- `isDraining=true` = Current is going down (device drawing power)
- `startAllowed=true` = Detection criteria met
- `🔥 START_HEAT confirmed!` = Device detected, heating workflow starting

### Sample Values:
```
🔍 Detection: 
  current=-523.45mA       <- Phone's current draw
  baseline=-120.33mA      <- Idle baseline  
  deltaMag=403.12mA       <- Difference (device draw)
  isDraining=true         <- More negative = more drain
  threshold=260.0mA       <- Detection threshold
  inAttachWindow=true     <- Inside 3s window
  startAllowed=true       <- Will trigger!
```

## Troubleshooting

### If USB events don't fire:
- Some phones don't send USB_DEVICE_ATTACHED for power-only devices
- The `USB_STATE` broadcast should still work
- Check logs for: `⚡ USB_STATE: connected=true`

### If detection doesn't trigger:
1. **Check deltaMag value** in logs
   - Should be > 30mA during attach window
   - Should be > 260mA outside attach window

2. **Check isDraining value**
   - Must be `true` (current more negative than baseline)

3. **Check attach window**
   - Opens for 3 seconds after USB event
   - Check timestamp values: `attachWindowUntil` vs `now`

### If app doesn't navigate to Heating:
1. Check if device image appears (indicates detection worked)
2. Check HomeScreen logs for navigation
3. Verify debounce completed (0.8s sustained detection)

## Production Changes Needed

Before deploying to production, re-enable the charging gate:

1. **Uncomment lines 273-282** in `FervixNativePowerModule.kt`
2. **Change USB attach conditions** back to check `!isCharging`
3. This will prevent false detection when user plugs in a charger

## Expected Timeline

- **Attach**: 0ms - USB plugged
- **Window Opens**: 0ms - 3000ms attach window
- **Detection**: ~100ms - Current spike detected
- **Debounce**: 800ms - Sustained detection required
- **UI Update**: ~900ms - "Device Connected" shows
- **Navigation**: ~5900ms - Navigate to Heating screen

Total time from plug to workflow start: **~6 seconds**


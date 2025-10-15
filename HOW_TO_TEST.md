# How to Test USB Device Detection

## ✅ Simple Logic Now Implemented
1. **If phone is charging** → Block all detection (USB port is in use)
2. **If USB device plugged + current drains** → Detect device

## Testing Steps

### Step 1: Install the New Build
```bash
cd ..
npx expo run:android --device
```

### Step 2: Disconnect Phone from PC
**IMPORTANT**: Unplug the phone from your laptop/PC completely!
- The USB port must be free
- Phone should NOT be charging

### Step 3: Open App & Wait for Calibration
1. Open app to HomeScreen
2. Wait 8 seconds (calibration period)
3. You'll see the baseline is established

### Step 4: Plug Your USB Device
Plug your USB speaker/device into the phone's USB-C port

**Expected Result:**
- App should detect USB device attached
- Current should show drain increase (30mA+)
- After 0.8s: "Device Connected" image appears
- After 5s: Navigate to Heating screen

## Monitoring (Optional)

If you want to see what's happening, use wireless debugging:

### Setup Wireless ADB (One-time):
```bash
# While phone is connected via USB
adb tcpip 5555
adb shell ip addr show wlan0 | findstr inet
# Note the IP address (e.g., 192.168.1.100)
```

### Connect Wirelessly:
```bash
# After unplugging USB
adb connect <YOUR_PHONE_IP>:5555
# Example: adb connect 192.168.1.100:5555

# Now you can see logs even with USB unplugged!
adb logcat | findstr FervixNativePower
```

## What You'll See in Logs

### When USB Device is Plugged:
```
⚡ USB device attached
✅ USB attached while NOT charging - opening attach window
🚦 Attach window opened for 3 seconds
🔍 Detection: deltaMag=XXXmA, isDraining=true, startAllowed=true
🔥 START_HEAT confirmed!
```

### If You Try While Charging:
```
⚡ USB device attached
❌ USB attached but phone is charging - ignoring
```

## Troubleshooting

### "Nothing happens when I plug the device"
**Check these in order:**

1. **Is phone charging?**
   - Look at battery icon - should NOT show charging
   - If charging, the detection is correctly blocked

2. **Is calibration complete?**
   - Wait full 8 seconds after opening HomeScreen
   - Look for baseline to stabilize on DevPowerScreen

3. **Does USB device draw enough current?**
   - Should draw at least 30mA during 3-second attach window
   - Or 260mA outside attach window

### "App crashes or freezes"
- Check if device is activated (serial code entered)
- Make sure profile is selected (Child/Adult)
- Check logs for error messages

## Expected Timeline

| Event | Time | What Happens |
|-------|------|--------------|
| USB Plugged | 0ms | USB_DEVICE_ATTACHED broadcast |
| Attach Window Opens | 0-3000ms | Permissive detection (30mA threshold) |
| Current Spike Detected | ~100ms | Device draw registered |
| Debounce Period | 800ms | Sustained detection required |
| "Device Connected" Shows | ~900ms | UI updates |
| Navigate to Heating | ~5900ms | Workflow starts |

**Total: ~6 seconds from plug to heating**

## Production Notes

This detection system:
- ✅ **Blocks charging**: Can't detect while USB port is charging phone
- ✅ **USB-based trigger**: Opens 3-second window on USB attach
- ✅ **Current confirmation**: Verifies device actually draws power
- ✅ **Fast detection**: Only 0.8s debounce (was 1.5s)
- ✅ **Efficient**: 30mA threshold during attach window, 260mA outside

The system is ready for production testing!


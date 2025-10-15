@echo off
echo ========================================
echo USB Device Detection Test
echo ========================================
echo.
echo This will:
echo 1. Start logging to a file
echo 2. Wait for you to unplug phone from PC
echo 3. Wait for you to plug your USB device
echo 4. Show you the results
echo.
echo Press any key when ready...
pause > nul

echo.
echo Starting log capture...
echo You can now:
echo   1. UNPLUG phone from PC
echo   2. Open app to HomeScreen  
echo   3. Wait 8 seconds
echo   4. PLUG your USB device into phone
echo   5. Press Ctrl+C here when done
echo.

adb logcat -c
adb logcat FervixNativePower:D *:S > device_test_log.txt

echo.
echo Log saved to: device_test_log.txt
echo Opening log file...
notepad device_test_log.txt


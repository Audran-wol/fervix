package com.fervix.app

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log
import android.os.BatteryManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.hardware.usb.UsbManager
import android.os.Build
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

class FervixNativePowerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        const val MODULE_NAME = "FervixNativePower"
        private const val TAG = "FervixNativePower"
    }

    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isSessionActive = false
    private var sessionParams: WritableMap? = null
    private val batteryManager = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    
    // USB monitoring variables
    private var usbManager: UsbManager? = null
    private var usbPortCallback: Any? = null // Use Any to avoid compilation issues
    private var usbReceiverRegistered = false
    private var batteryReceiverRegistered = false
    
    // —— Attach-window helpers ——
    @Volatile private var attachWindowUntil: Long = 0L
    @Volatile private var attachBaseline: Double? = null
    @Volatile private var attachArmed: Boolean = false
    
    // —— Sudden-step detector (on filtered current) ——
    private var lastEma: Double? = null
    
    // Tunables (UI units = your mA scale)
    private val ATTACH_WINDOW_MS = 3000L     // 3s permissive window after plug
    private val ATTACH_DELTA_MIN_MA = 60.0   // small delta vs frozen baseline to accept during window
    private val STEP_THRESHOLD_MA = 50.0     // single-tick "step" to accept during window
    private val OUTSIDE_WINDOW_MIN_MA = 200.0// strict fallback when no attach signal (lowered to match real deltas)
    
    // USB polling fallback
    private var lastDeviceListCount = -1
    
    // Battery/charging state for USB gate
    private var lastIsCharging: Boolean = false
    private var lastPlugType: Int = 0 // 0 none, 1 AC, 2 USB, 4 WIRELESS
    
    // Device detection variables (PM specification: baseline-relative thresholds)
    // Threshold (ON) = Baseline - 350mA (device must drain 350mA more than baseline)
    // Threshold (OFF) = Baseline + 350mA (device returns within 350mA of baseline)
    private val THRESHOLD_ON_MA = 0.35  // PM specification: 350mA = 0.35A threshold
    private val THRESHOLD_OFF_MA = 0.35  // PM specification: 350mA = 0.35A threshold
    private var deviceDetectionThreshold = 0.35 // Will be calculated as baseline - 0.35A (350mA)
    private var deviceDetectionEndThreshold = 0.35 // Will be calculated as baseline + 0.35A (350mA)
    private var baselineCurrent = 0.0
    private var lastDeviceConnected = false
    private var samplesForBaseline = mutableListOf<Double>()
    private val maxBaselineSamples = 100 // 1 second window at 10ms sampling (100Hz) - PM specification
    
    // Direction detection (auto-detected during calibration)
    private var dischargeNegative = true // true = discharging current is negative

    // EMA filter for noise reduction
    private var ema: Double? = null
    private val SAMPLE_MS = 10L // 10ms sampling (100Hz) - PM specification
    private val ALPHA = 0.1 // ~3-5s time constant

    // Debouncing state
    private var startCandidateTime: Long? = null
    private var endCandidateTime: Long? = null
    private var isHeating = false
    private val START_DEBOUNCE_MS = 500L  // 0.5s debounce - PM specification
    private val END_DEBOUNCE_MS = 500L    // 0.5s debounce - PM specification (standardized for both ON/OFF)

    // Calibration
    private var calibrationComplete = false
    private val CALIBRATION_DURATION_MS = 3000L  // Reduced to 3s for faster UX

    // Periodic recalibration (PM specification: every 1 second)
    private var lastRecalibrationTime: Long = 0L
    private val RECALIBRATION_INTERVAL_MS = 1000L  // 1 second - PM specification
    private var recalibrationEnabled = false
    private var recentBaselineSamples = mutableListOf<Double>()
    private val RECENT_BASELINE_SAMPLES = 100  // 1 second at 10ms sampling (100Hz) - PM specification

    // Phase management
    private var currentPhase = "IDLE"

    // USB event receivers
    private val usbAttachReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    Log.d(TAG, "⚡ USB device attached")
                    emitUsbEvent("USB_DEVICE_ATTACHED", null)
                    // Open attach window only if not charging (USB port available for device)
                    if (!lastIsCharging && lastPlugType == 0) {
                        Log.d(TAG, "✅ USB attached while NOT charging - opening attach window")
                        scheduleAttachWindow()
                    } else {
                        Log.d(TAG, "❌ USB attached but phone is charging (isCharging=${lastIsCharging}, plugType=${lastPlugType}) - ignoring")
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    Log.d(TAG, "USB device detached")
                    emitUsbEvent("USB_DEVICE_DETACHED", null)
                    closeAttachWindow()
                }
                // Some OEMs still deliver this sticky broadcast
                "android.hardware.usb.action.USB_STATE" -> {
                    val connected = intent.getBooleanExtra("connected", false)
                    val host = intent.getBooleanExtra("host_connected", false)
                    val configured = intent.getBooleanExtra("configured", false)
                    val fn = intent.getStringExtra("configured_functions") ?: ""
                    
                    Log.d(TAG, "⚡ USB_STATE: connected=$connected, host=$host, configured=$configured, functions=$fn")
                    
                    val map = Arguments.createMap().apply {
                        putBoolean("connected", connected)
                        putBoolean("host_connected", host)
                        putBoolean("configured", configured)
                        putString("functions", fn)
                    }
                    emitUsbEvent("USB_STATE", map)
                    
                    // Open attach window only if USB connected AND not charging
                    if ((host || connected) && !lastIsCharging && lastPlugType == 0) {
                        Log.d(TAG, "✅ USB connected while NOT charging - opening attach window")
                        scheduleAttachWindow()
                    } else if ((host || connected)) {
                        Log.d(TAG, "❌ USB connected but phone is charging (isCharging=${lastIsCharging}, plugType=${lastPlugType}) - ignoring")
                    }
                }
            }
        }
    }

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_BATTERY_CHANGED) {
                val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
                val wasCharging = lastIsCharging
                lastIsCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
                lastPlugType = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
                
                // Log charging state changes
                if (wasCharging != lastIsCharging) {
                    Log.d(TAG, "🔋 Charging state changed: isCharging=${lastIsCharging}, plugType=${lastPlugType} (0=none, 1=AC, 2=USB, 4=wireless)")
                }
            }
        }
    }
    private var sessionStartTime = 0L
    private var lastPhaseChangeTime = 0L
    private var heatupStartTime: Long? = null
    private var treatmentStartTime: Long? = null
    private var cooldownStartTime: Long? = null

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun startSession(params: ReadableMap, promise: Promise) {
        Log.d(TAG, "Starting power monitoring session with params: $params")
        
        try {
            sessionParams = Arguments.createMap().apply {
                params.entryIterator.forEach { (key, value) ->
                    when (value) {
                        is String -> putString(key, value)
                        is Double -> putDouble(key, value)
                        is Boolean -> putBoolean(key, value)
                        is Int -> putInt(key, value)
                        else -> putString(key, value.toString())
                    }
                }
            }
            isSessionActive = true
            sessionStartTime = System.currentTimeMillis()
            currentPhase = "PREHEAT_DETECT"
            lastPhaseChangeTime = sessionStartTime
            
            // Reset calibration and detection state
            calibrationComplete = false
            isHeating = false
            startCandidateTime = null
            endCandidateTime = null
            
            // Reset periodic recalibration
            recalibrationEnabled = false
            lastRecalibrationTime = 0L
            recentBaselineSamples.clear()
            
            // Start USB monitoring and polling
            startUsbMonitoring()
            startUsbPoller()
            heatupStartTime = null
            treatmentStartTime = null
            cooldownStartTime = null
            samplesForBaseline.clear()
            baselineCurrent = 0.0

            // Send initial phase change
            sendEvent("PhaseChanged", Arguments.createMap().apply {
                putString("phase", currentPhase)
                putLong("remainingMs", CALIBRATION_DURATION_MS)
                putString("timestamp", System.currentTimeMillis().toString())
            })

            // Start power monitoring in background
            startPowerMonitoring()

            promise.resolve("Session started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting session", e)
            promise.reject("SESSION_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun triggerHeatupPhase() {
        Log.d(TAG, "🔥 Triggering HEATUP phase from TypeScript detector")
        val now = System.currentTimeMillis()
        
        if (currentPhase == "PREHEAT_DETECT" || currentPhase == "IDLE") {
            currentPhase = "HEATUP"
            heatupStartTime = now
            lastPhaseChangeTime = now
            isHeating = true
            
            Log.d(TAG, "📡📡📡 Sending PhaseChanged: HEATUP")
            sendEvent("PhaseChanged", Arguments.createMap().apply {
                putString("phase", "HEATUP")
                putLong("remainingMs", 15000)
                putString("timestamp", now.toString())
            })
            Log.d(TAG, "✅✅✅ PhaseChanged: HEATUP sent successfully")
        } else {
            Log.w(TAG, "⚠️ Cannot trigger HEATUP - currentPhase is: $currentPhase")
        }
    }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting session", e)
            promise.reject("START_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopSession(promise: Promise) {
        Log.d(TAG, "Stopping power monitoring session")
        
        try {
            isSessionActive = false
            currentPhase = "IDLE"
            sessionParams = null
            promise.resolve("Session stopped successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping session", e)
            promise.reject("STOP_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSnapshot(promise: Promise) {
        Log.d(TAG, "Getting power snapshot")
        
        try {
            val current = getCurrentReading()
            val voltage = getVoltageReading()
            val batteryInfo = getBatteryInfo()
            val delta_mA = current - baselineCurrent
            val deviceDetected = isHeating
            
            val snapshot = Arguments.createMap().apply {
                putDouble("current_mA", current)
                putDouble("voltage_V", voltage)
                putDouble("power_W", current * voltage / 1000.0) // Convert to watts
                putInt("battery_level", batteryInfo["level"] as Int)
                putString("charging_status", batteryInfo["status"] as String)
                putBoolean("is_charging", batteryInfo["is_charging"] as Boolean)
                putBoolean("device_detected", deviceDetected)
                putDouble("baseline_current", baselineCurrent)
                putDouble("baseline_mA", baselineCurrent)
                putDouble("lastDelta_mA", delta_mA)
                putDouble("delta_mA", delta_mA)
                putDouble("detection_threshold", deviceDetectionThreshold)
                putBoolean("calibration_complete", calibrationComplete)
                putString("timestamp", System.currentTimeMillis().toString())
            }
            promise.resolve(snapshot)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting snapshot", e)
            promise.reject("GET_SNAPSHOT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setDeviceDetectionThreshold(threshold: Double, promise: Promise) {
        Log.d(TAG, "🎯 [THRESHOLD UPDATE] Setting device detection threshold from ${deviceDetectionThreshold}mA to ${threshold}mA")
        try {
            deviceDetectionThreshold = threshold
            Log.d(TAG, "🎯 [THRESHOLD UPDATE] ✅ Successfully set threshold to ${deviceDetectionThreshold}mA")
            promise.resolve("Threshold set to ${threshold}mA")
        } catch (e: Exception) {
            Log.e(TAG, "🎯 [THRESHOLD UPDATE] ❌ Error setting threshold", e)
            promise.reject("SET_THRESHOLD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setDeviceDetectionEndThreshold(threshold: Double, promise: Promise) {
        Log.d(TAG, "🎯 [THRESHOLD UPDATE] Setting device detection END threshold from ${deviceDetectionEndThreshold}mA to ${threshold}mA")
        try {
            deviceDetectionEndThreshold = threshold
            Log.d(TAG, "🎯 [THRESHOLD UPDATE] ✅ Successfully set END threshold to ${deviceDetectionEndThreshold}mA")
            promise.resolve("End threshold set to ${threshold}mA")
        } catch (e: Exception) {
            Log.e(TAG, "🎯 [THRESHOLD UPDATE] ❌ Error setting END threshold", e)
            promise.reject("ERROR", "Failed to set end threshold: ${e.message}")
        }
    }

    @ReactMethod
    fun resetBaseline(promise: Promise) {
        Log.d(TAG, "Resetting baseline current")
        try {
            samplesForBaseline.clear()
            baselineCurrent = 0.0
            promise.resolve("Baseline reset")
        } catch (e: Exception) {
            Log.e(TAG, "Error resetting baseline", e)
            promise.reject("RESET_BASELINE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun enablePeriodicRecalibration(promise: Promise) {
        Log.d(TAG, "🔄 Enabling periodic recalibration")
        try {
            recalibrationEnabled = true
            lastRecalibrationTime = System.currentTimeMillis()
            recentBaselineSamples.clear()
            Log.d(TAG, "🔄 Periodic recalibration enabled - will update every 10 seconds")
            promise.resolve("Periodic recalibration enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling periodic recalibration", e)
            promise.reject("ENABLE_RECALIBRATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun disablePeriodicRecalibration(promise: Promise) {
        Log.d(TAG, "🔄 Disabling periodic recalibration")
        try {
            recalibrationEnabled = false
            recentBaselineSamples.clear()
            Log.d(TAG, "🔄 Periodic recalibration disabled")
            promise.resolve("Periodic recalibration disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling periodic recalibration", e)
            promise.reject("DISABLE_RECALIBRATION_ERROR", e.message, e)
        }
    }

    private fun startPowerMonitoring() {
        coroutineScope.launch {
            while (isSessionActive) {
                try {
                    val now = System.currentTimeMillis()
                    
                    // Auto-expire attach window after time passes (safety)
                    if (attachArmed && now > attachWindowUntil) {
                        closeAttachWindow()
                    }
                    
                    // Read raw current (unfiltered for variance calculation) - ALWAYS read
                    val rawCurrent = getCurrentReading()
                    val filteredCurrent = filter(rawCurrent)  // Keep filter for internal detection logic
                    val voltage = getVoltageReading()
                    val batteryInfo = getBatteryInfo()
                    val charging = batteryInfo["is_charging"] as Boolean
                    
                    // Calculate delta magnitude for reporting
                    var deltaMagnitude = 0.0
                    
                    // Update baseline only when not charging
                    if (!charging) {
                        // CRITICAL: Immediate abort if charging detected during active phases
                        if (currentPhase == "HEATUP" || currentPhase == "TREATMENT") {
                            Log.d(TAG, "🚨🚨🚨 IMMEDIATE ABORT: Charging detected during ${currentPhase}")
                            isHeating = false
                            currentPhase = "ABORT"
                            lastPhaseChangeTime = now
                            sendEvent("PhaseChanged", map(
                                "phase", "ABORT",
                                "reason", "CHARGING_DETECTED_IMMEDIATE",
                                "timestamp", now.toString()
                            ))
                        }
                        
                        updateBaseline(filteredCurrent)
                    
                        // Calculate delta magnitude for reporting (TypeScript detector handles detection)
                        deltaMagnitude = deltaMag(filteredCurrent, baselineCurrent)
                    } else {
                        // Charging state: Close attach window and reset detection
                        closeAttachWindow()
                        isHeating = false
                    }
                    
                    // FORCE EMISSION: Always send Sample event with RAW data (every 10ms) - regardless of charging state
                    // Verification: Log normalized current to verify unit conversion
                    Log.d(TAG, "Normalized Current: ${"%.2f".format(rawCurrent)} mA")
                    
                    sendEvent("Sample", Arguments.createMap().apply {
                        putDouble("current_mA", rawCurrent)  // RAW data, normalized to milliamps
                        putDouble("voltage_V", voltage)
                        putDouble("power_W", rawCurrent * voltage / 1000.0)
                        putInt("battery_level", batteryInfo["level"] as Int)
                        putString("charging_status", batteryInfo["status"] as String)
                        putBoolean("is_charging", charging)
                        putBoolean("device_detected", false)  // TypeScript detector handles detection
                        putDouble("baseline_current", baselineCurrent)
                        putDouble("delta_mA", deltaMagnitude) // positive = more drain
                        putDouble("detection_threshold", deviceDetectionThreshold)
                        putBoolean("calibration_complete", calibrationComplete)
                        putBoolean("attach_window_active", !charging && attachArmed && (System.currentTimeMillis() <= attachWindowUntil))
                        putString("timestamp", System.currentTimeMillis().toString())
                    })
                    
                    // Check for phase changes
                    checkPhaseChanges()
                    
                    // PM specification: 100Hz sampling (10ms)
                    delay(SAMPLE_MS)
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error in power monitoring", e)
                    delay(1000) // Wait longer on error
                }
            }
        }
    }

    // PM Fix #3: EMA low-pass filter for noise reduction
    private fun filter(current: Double): Double {
        ema = if (ema == null) current else (ema!! + ALPHA * (current - ema!!))
        lastEma = ema
        return ema!!
    }
    
    // PM Fix #1: Direction-agnostic delta magnitude
    private fun deltaMag(current: Double, baseline: Double): Double {
        return if (dischargeNegative) (baseline - current) else (current - baseline)
    }
    
    // PM Fix #4: Check if phone is charging
    private fun isCharging(): Boolean {
        try {
            val batteryIntent = reactApplicationContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        } catch (e: Exception) {
            return false
        }
    }

    private fun getCurrentReading(): Double {
        try {
            // Get real battery current from Android BatteryManager
            val raw = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW).toDouble()
            
            // UNIT NORMALIZATION: Always return milliamps (mA)
            // Check magnitude to determine input unit and convert to mA
            val normalizedCurrent: Double = when {
                // IF |raw| < 10.0: It is likely Amperes. Multiply by 1000 to get mA
                Math.abs(raw) < 10.0 -> raw * 1000.0
            
                // IF |raw| > 100000: It is likely Microamps. Divide by 1000 to get mA
                Math.abs(raw) > 100000.0 -> raw / 1000.0
                
                // ELSE: It is likely Milliamps. Leave it as is
                else -> raw
            }
            
            // Clamp out-of-range noise (values < 0.1mA are considered noise)
            val finalCurrent = if (Math.abs(normalizedCurrent) < 0.1) {
                0.0
            } else {
                normalizedCurrent
            }
            
            return finalCurrent
        } catch (e: Exception) {
            Log.e(TAG, "Error reading battery current", e)
            return 0.0
        }
    }

    private fun getVoltageReading(): Double {
        try {
            // Get real battery voltage from Android BatteryManager using battery intent
            val batteryIntent = reactApplicationContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val voltageMilliVolts = batteryIntent?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1) ?: 0
            
            // Convert from millivolts to volts
            val voltageVolts = voltageMilliVolts.toDouble() / 1000.0
            
            Log.d(TAG, "Real battery voltage: ${voltageVolts}V (raw: ${voltageMilliVolts}mV)")
            
            return voltageVolts
        } catch (e: Exception) {
            Log.e(TAG, "Error reading battery voltage", e)
            return 0.0
        }
    }

    private fun checkPhaseChanges() {
        if (!isSessionActive) {
            Log.d(TAG, "⏸️ checkPhaseChanges: session not active")
            return
        }
        
        val currentTime = System.currentTimeMillis()
        val elapsedTime = currentTime - sessionStartTime
        
        // Handle calibration period
        if (!calibrationComplete) {
            if (elapsedTime >= CALIBRATION_DURATION_MS) {
                calibrationComplete = true
                Log.d(TAG, "✅✅✅ CALIBRATION COMPLETE - Detection now active! Baseline: ${"%.2f".format(baselineCurrent)}mA")
                
                // PM Fix #1: Auto-detect discharge direction
                dischargeNegative = baselineCurrent < 0
                
                // Enable periodic recalibration (client requirement: every 10 seconds)
                recalibrationEnabled = true
                lastRecalibrationTime = currentTime
                Log.d(TAG, "🔄 Periodic recalibration enabled - will update every 10 seconds")
                
                Log.d(TAG, "✅ Calibration complete! Baseline: ${baselineCurrent}mA (${samplesForBaseline.size} samples), dischargeNegative: ${dischargeNegative}")
                // Stay in PREHEAT_DETECT phase, wait for device detection
            }
            return
        }
        
        // Phase transitions based on heating detection and timers
        Log.d(TAG, "🔍 checkPhaseChanges: currentPhase=$currentPhase, heatupStartTime=$heatupStartTime, treatmentStartTime=$treatmentStartTime")
        
        when (currentPhase) {
            "HEATUP" -> {
                val elapsed = if (heatupStartTime != null) currentTime - heatupStartTime!! else 0
                Log.d(TAG, "⏱️ HEATUP elapsed: ${elapsed}ms / 15000ms")
                // After 15s of heating, move to TREATMENT (don't require isHeating - complete workflow once started)
                if (heatupStartTime != null && elapsed >= 15000) {
                    currentPhase = "TREATMENT"
                    treatmentStartTime = currentTime
                    lastPhaseChangeTime = currentTime
                    
                    Log.d(TAG, "📡 Phase transition: HEATUP -> TREATMENT")
                    sendEvent("PhaseChanged", Arguments.createMap().apply {
                        putString("phase", currentPhase)
                        putLong("remainingMs", 20000) // 20 seconds treatment
                        putString("timestamp", currentTime.toString())
                    })
                }
            }
            "TREATMENT" -> {
                val elapsed = if (treatmentStartTime != null) currentTime - treatmentStartTime!! else 0
                Log.d(TAG, "⏱️ TREATMENT elapsed: ${elapsed}ms / 20000ms")
                // After 20s of treatment, move to COOLDOWN (don't require isHeating - complete workflow once started)
                if (treatmentStartTime != null && elapsed >= 20000) {
                    currentPhase = "COOLDOWN"
                    cooldownStartTime = currentTime
                    lastPhaseChangeTime = currentTime
                    
                    Log.d(TAG, "📡 Phase transition: TREATMENT -> COOLDOWN")
                    sendEvent("PhaseChanged", Arguments.createMap().apply {
                        putString("phase", currentPhase)
                        putLong("remainingMs", 10000) // 10 seconds cooldown
                        putString("timestamp", currentTime.toString())
                    })
                }
            }
            "COOLDOWN" -> {
                val elapsed = if (cooldownStartTime != null) currentTime - cooldownStartTime!! else 0
                Log.d(TAG, "⏱️ COOLDOWN elapsed: ${elapsed}ms / 10000ms")
                // After 10s of cooldown, move to DONE
                if (cooldownStartTime != null && elapsed >= 10000) {
                    currentPhase = "DONE"
                    lastPhaseChangeTime = currentTime
                    
                    Log.d(TAG, "📡 Phase transition: COOLDOWN -> DONE")
                    sendEvent("PhaseChanged", Arguments.createMap().apply {
                        putString("phase", currentPhase)
                        putString("timestamp", currentTime.toString())
                    })
                    
                    // Stop session after completion
                    isSessionActive = false
                }
            }
        }
    }

    // PM Fix #2: Only update baseline when inactive
    private fun updateBaseline(current: Double) {
        // Freeze baseline during detection, debounce, or attach window
        if (isHeating || startCandidateTime != null || attachArmed) {
            return
        }
        
        // Add current reading to baseline samples
        samplesForBaseline.add(current)
        
        // Keep only the last N samples
        if (samplesForBaseline.size > maxBaselineSamples) {
            samplesForBaseline.removeAt(0)
        }
        
        // Calculate average baseline (only if we have enough samples)
        if (samplesForBaseline.size >= 3) {
            baselineCurrent = samplesForBaseline.average()
        }
        
        // Periodic recalibration (client requirement: every 10 seconds)
        if (recalibrationEnabled && calibrationComplete) {
            val now = System.currentTimeMillis()
            
            // Add to recent baseline samples for recalibration
            recentBaselineSamples.add(current)
            if (recentBaselineSamples.size > RECENT_BASELINE_SAMPLES) {
                recentBaselineSamples.removeAt(0)
            }
            
            // Check if it's time for recalibration
            if (now - lastRecalibrationTime >= RECALIBRATION_INTERVAL_MS) {
                performPeriodicRecalibration(now)
            }
        }
        
        Log.d(TAG, "Baseline updated: ${baselineCurrent}mA (samples: ${samplesForBaseline.size})")
    }

    // Periodic recalibration method (client requirement: every 10 seconds)
    private fun performPeriodicRecalibration(now: Long) {
        if (recentBaselineSamples.size < 10) {
            Log.d(TAG, "🔄 Periodic recalibration skipped - insufficient samples (${recentBaselineSamples.size})")
            lastRecalibrationTime = now
            return
        }
        
        val oldBaseline = baselineCurrent
        val oldStartThreshold = deviceDetectionThreshold
        val oldEndThreshold = deviceDetectionEndThreshold
        
        // Calculate new baseline from recent samples
        val newBaseline = recentBaselineSamples.average()
        val baselineChange = Math.abs(newBaseline - oldBaseline)
        
        // Only update if baseline changed significantly (more than 10mA)
        if (baselineChange >= 10.0) {
            Log.d(TAG, "🔄 Periodic recalibration: baseline changed ${"%.1f".format(baselineChange)}mA")
            
            // Update baseline
            baselineCurrent = newBaseline
            
            // PM specification: Thresholds are fixed at 350mA delta from baseline
            // Threshold (ON) = Baseline - 350mA (always 350mA delta)
            // Threshold (OFF) = Baseline + 350mA (always 350mA delta)
            // Thresholds remain constant at 350mA - no recalculation needed
            deviceDetectionThreshold = THRESHOLD_ON_MA  // Always 350mA
            deviceDetectionEndThreshold = THRESHOLD_OFF_MA  // Always 350mA
            
            Log.d(TAG, "🔄 Periodic recalibration complete:")
            Log.d(TAG, "  Baseline: ${"%.1f".format(oldBaseline)}mA → ${"%.1f".format(newBaseline)}mA")
            Log.d(TAG, "  Threshold (ON): ${"%.1f".format(THRESHOLD_ON_MA)}mA (fixed)")
            Log.d(TAG, "  Threshold (OFF): ${"%.1f".format(THRESHOLD_OFF_MA)}mA (fixed)")
            
            // Send recalibration event to frontend
            sendEvent("Recalibration", map(
                "type", "PERIODIC_UPDATE",
                "oldBaseline", oldBaseline,
                "newBaseline", newBaseline,
                "oldStartThreshold", THRESHOLD_ON_MA,  // Always 350mA
                "newStartThreshold", THRESHOLD_ON_MA,    // Always 350mA
                "oldEndThreshold", THRESHOLD_OFF_MA,    // Always 350mA
                "newEndThreshold", THRESHOLD_OFF_MA,     // Always 350mA
                "timestamp", now.toString()
            ))
        } else {
            Log.d(TAG, "🔄 Periodic recalibration skipped - baseline change too small (${"%.1f".format(baselineChange)}mA)")
        }
        
        lastRecalibrationTime = now
        recentBaselineSamples.clear() // Reset for next cycle
    }

    // PM-recommended detection with positive deltas and hysteresis
    private fun checkDeviceDetection(current: Double): Boolean {
        if (!calibrationComplete) return false

        val now = System.currentTimeMillis()
        val inAttachWindow = (now <= attachWindowUntil) && attachArmed

        // Direction-agnostic "more drain than baseline"
        val dGlobal = deltaMag(current, baselineCurrent)
        val dAttach = attachBaseline?.let { deltaMag(current, it) } ?: 0.0
        val step = if (lastEma != null) Math.abs(current - lastEma!!) else 0.0

        // Check for charging state (indicates device unplugged)
        val batteryInfo = getBatteryInfo()
        val isCharging = batteryInfo["is_charging"] as? Boolean ?: false

        // PM specification: Threshold (ON) = Baseline - 350mA
        // Current must drain 350mA more than baseline (delta magnitude >= 350mA)
        // Inside attach window: accept smaller delta for faster detection
        // Outside window: use full 350mA threshold
        val startAllowed = if (inAttachWindow) {
            (dAttach >= ATTACH_DELTA_MIN_MA) || (step >= STEP_THRESHOLD_MA) || (dGlobal >= THRESHOLD_ON_MA)
        } else {
            dGlobal >= THRESHOLD_ON_MA  // PM spec: 350mA threshold
        }

        Log.d(TAG, "🔍 Detect: cur=${"%.2f".format(current)} base=${"%.2f".format(baselineCurrent)} " +
                "dGlobal=${"%.1f".format(dGlobal)} dAttach=${"%.1f".format(dAttach)} step=${"%.1f".format(step)} " +
                "inWin=$inAttachWindow startAllowed=$startAllowed isHeating=$isHeating isCharging=$isCharging")

        if (!isHeating) {
            // START condition: use effective threshold
            if (startAllowed) {
                if (startCandidateTime == null) {
                    startCandidateTime = now
                } else if (now - startCandidateTime!! >= START_DEBOUNCE_MS) {
                    isHeating = true
                    startCandidateTime = null
                    endCandidateTime = null
                    closeAttachWindow()  // prevent re-firing

                    // REMOVED: Native detection - TypeScript detector handles START_HEAT
                    // Log.d(TAG, "🔥🔥🔥 START_HEAT confirmed! Setting phase to HEATUP")
                    // sendEvent("Detector", map("type","START_HEAT","delta_mA",dGlobal,"tMillis",now))
                    // Phase transitions are now handled by TypeScript detector via START_HEAT event
                    // if (currentPhase == "PREHEAT_DETECT") {
                    //     currentPhase = "HEATUP"
                    //     heatupStartTime = now
                    //     lastPhaseChangeTime = now
                    //     Log.d(TAG, "📡📡📡 Sending PhaseChanged: HEATUP")
                    //     sendPhase("HEATUP", 15000L)
                    //     Log.d(TAG, "✅✅✅ PhaseChanged: HEATUP sent successfully")
                    // } else {
                    //     Log.w(TAG, "⚠️ Not sending HEATUP - currentPhase is: $currentPhase")
                    // }
                }
            } else {
                startCandidateTime = null
            }
        } else {
            // PM specification: Threshold (OFF) = Baseline + 350mA
            // Current must return within 350mA of baseline (delta magnitude <= 350mA)
            // For abort detection: Use PM spec threshold (350mA) for consistent behavior
            val deltaBelowThreshold = dGlobal <= THRESHOLD_OFF_MA  // PM spec: 350mA threshold
            
            // AGGRESSIVE ABORT DETECTION - Multiple redundant conditions for reliability across all phones:
            // 1. Delta falls below threshold (PM spec: 350mA) - Device current returns to baseline
            // 2. Device goes into charging mode (unplugged) - MOST RELIABLE
            // 3. Current suddenly stops draining (goes from negative to positive/zero)
            // 4. Dramatic current jump back towards baseline (device removed, current returns to idle)
            // 5. Drastic reduction in device drain (>300mA drop from device baseline)
            val deviceUnplugged = isCharging
            val suddenCurrentStop = lastEma != null && 
                                  lastEma!! < -0.1 && // Was draining significantly
                                  current > -0.05    // Now barely draining or charging
            
            // NEW: Check if current jumped back towards baseline (device removed = less drain)
            // This detects when device is unplugged and current returns closer to baseline
            val currentReturnedToBaseline = lastEma != null && 
                                           Math.abs(current - baselineCurrent) < Math.abs(lastEma!! - baselineCurrent) &&
                                           Math.abs(current - lastEma!!) > 200.0  // Significant jump back
            
            // NEW: Drastic reduction in device drain from the device's own baseline
            // If we were draining extra (device working), and drain drops dramatically, device is unplugged
            val drasticDrainReduction = lastEma != null && 
                                       lastEma!! < -200.0 && // Was draining for device (>200mA)
                                       (current - lastEma!!) > 300.0  // Sudden 300mA+ reduction in drain
            
            val shouldEnd = deltaBelowThreshold || deviceUnplugged || suddenCurrentStop || 
                           currentReturnedToBaseline || drasticDrainReduction
            
            Log.d(TAG, "🔍 END Check: dGlobal=${"%.1f".format(dGlobal)} threshold=${"%.1f".format(THRESHOLD_OFF_MA)} " +
                    "deltaBelow=$deltaBelowThreshold unplugged=$deviceUnplugged suddenStop=$suddenCurrentStop " +
                    "returnedToBaseline=$currentReturnedToBaseline drasticReduction=$drasticDrainReduction " +
                    "debounce=${END_DEBOUNCE_MS}ms shouldEnd=$shouldEnd")

            if (shouldEnd) {
                if (endCandidateTime == null) endCandidateTime = now
                else if (now - endCandidateTime!! >= END_DEBOUNCE_MS) {
                    isHeating = false
                    endCandidateTime = null
                    startCandidateTime = null
                    
                    val disconnectReason = when {
                        deviceUnplugged -> "DEVICE_UNPLUGGED"
                        suddenCurrentStop -> "SUDDEN_CURRENT_STOP"
                        else -> "LOST_SIGNAL"
                    }
                    
                    // REMOVED: Native detection - TypeScript detector handles END_HEAT
                    // sendEvent("Detector", map("type","END_HEAT","delta_mA",dGlobal,"tMillis",now,"reason",disconnectReason))
                    // Phase transitions are now handled by TypeScript detector via END_HEAT event
                    // if (currentPhase != "COOLDOWN" && currentPhase != "DONE") {
                    //     currentPhase = "ABORT"
                    //     lastPhaseChangeTime = now
                    //     sendEvent("PhaseChanged", map("phase","ABORT","reason",disconnectReason,"timestamp", now.toString()))
                    //     Log.d(TAG, "🚨🚨🚨 DEVICE DISCONNECTED - Phase changed to ABORT: $disconnectReason")
                    // }
                }
            } else {
                endCandidateTime = null
            }
        }
        
        return isHeating
    }
    
    // Helper to create WritableMap from varargs
    private fun map(vararg kv: Any): WritableMap = Arguments.createMap().apply {
        var i = 0
        while (i < kv.size) {
            val k = kv[i] as String
            when (val v = kv[i+1]) {
                is String -> putString(k, v)
                is Double -> putDouble(k, v)
                is Int -> putInt(k, v)
                is Long -> putDouble(k, v.toDouble())
                is Boolean -> putBoolean(k, v)
            }
            i += 2
        }
    }
    
    // Helper to send phase events
    private fun sendPhase(name: String, remaining: Long) {
        val now = System.currentTimeMillis()
        sendEvent("PhaseChanged", map("phase", name, "remainingMs", remaining, "timestamp", now.toString()))
    }

    private fun getBatteryInfo(): Map<String, Any> {
        return try {
            val batteryIntent = reactApplicationContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 0
            val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: 100
            val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: BatteryManager.BATTERY_STATUS_UNKNOWN
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
            
            val statusText = when (status) {
                BatteryManager.BATTERY_STATUS_CHARGING -> "Charging"
                BatteryManager.BATTERY_STATUS_DISCHARGING -> "Discharging"
                BatteryManager.BATTERY_STATUS_FULL -> "Full"
                BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "Not Charging"
                else -> "Unknown"
            }
            
            mapOf(
                "level" to (level * 100 / scale),
                "status" to statusText,
                "is_charging" to isCharging
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting battery info", e)
            mapOf(
                "level" to 0,
                "status" to "Unknown",
                "is_charging" to false
            )
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending event: $eventName", e)
        }
    }

    // USB helper functions
    private fun emitUsbEvent(type: String, extra: WritableMap?) {
        val m = Arguments.createMap().apply {
            putString("type", type)
            putString("timestamp", System.currentTimeMillis().toString())
            if (extra != null) merge(extra)
        }
        sendEvent("Usb", m)
    }

    private fun scheduleAttachWindow() {
        attachWindowUntil = System.currentTimeMillis() + ATTACH_WINDOW_MS
        attachBaseline = baselineCurrent            // snapshot baseline at plug time
        attachArmed = true
        Log.d(TAG, "🚦 Attach window opened (${ATTACH_WINDOW_MS}ms), attachBaseline=${"%.2f".format(attachBaseline)} mA")
        emitUsbEvent("ATTACH_WINDOW_OPENED", null)   // Make window visible to JS
    }

    private fun closeAttachWindow() {
        attachWindowUntil = 0L
        attachBaseline = null
        attachArmed = false
        emitUsbEvent("ATTACH_WINDOW_CLOSED", null)
    }

    private fun maybeOpenAttachWindowByRoles(connected: Boolean, powerRole: Int?, dataRole: Int?) {
        // Use reflection to get USB port constants
        val POWER_ROLE_SOURCE = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                Class.forName("android.hardware.usb.UsbPort").getField("POWER_ROLE_SOURCE").getInt(null)
            } else 1
        } catch (e: Exception) { 1 }
        
        val DATA_ROLE_HOST = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                Class.forName("android.hardware.usb.UsbPort").getField("DATA_ROLE_HOST").getInt(null)
            } else 2
        } catch (e: Exception) { 2 }
        
        val isSource = powerRole == POWER_ROLE_SOURCE
        val isHost   = dataRole == DATA_ROLE_HOST
        val okRoles  = connected && (isSource || isHost)
        val okPower  = !lastIsCharging && lastPlugType == 0  // not plugged to AC/USB/wireless

        Log.d(TAG, "USB role gate: connected=$connected, isSource=$isSource, isHost=$isHost, " +
                "isCharging=$lastIsCharging, plugType=$lastPlugType, gate=${okRoles && okPower}")

        if (okRoles && okPower) {
            scheduleAttachWindow() // 3s window where current-delta can confirm
        }
    }

    private fun startUsbMonitoring() {
        if (usbManager == null) usbManager = reactApplicationContext.getSystemService(Context.USB_SERVICE) as UsbManager

        // --- Dynamic broadcast receiver (with flags on API 33+) ---
        if (!usbReceiverRegistered) {
            val f = IntentFilter().apply {
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
                addAction("android.hardware.usb.action.USB_STATE")
            }
            if (Build.VERSION.SDK_INT >= 33) {
                reactApplicationContext.registerReceiver(usbAttachReceiver, f, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("DEPRECATION")
                reactApplicationContext.registerReceiver(usbAttachReceiver, f)
            }
            usbReceiverRegistered = true
        }

        // --- Battery receiver ---
        if (!batteryReceiverRegistered) {
            val bf = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            if (Build.VERSION.SDK_INT >= 33) {
                reactApplicationContext.registerReceiver(batteryReceiver, bf, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("DEPRECATION")
                reactApplicationContext.registerReceiver(batteryReceiver, bf)
            }
            batteryReceiverRegistered = true
        }

        // Port role callback (API 28+) - use reflection for compatibility
        if (usbPortCallback == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                // Use reflection to create PortListener
                val portListenerClass = Class.forName("android.hardware.usb.UsbManager\$PortListener")
                val usbPortClass = Class.forName("android.hardware.usb.UsbPort")
                val usbPortStatusClass = Class.forName("android.hardware.usb.UsbPortStatus")
                
                usbPortCallback = java.lang.reflect.Proxy.newProxyInstance(
                    portListenerClass.classLoader,
                    arrayOf(portListenerClass)
                ) { _, method, args ->
                    if (method.name == "onPortChanged") {
                        try {
                            val port = args!![0]
                            val status = args[1]
                            
                            // Use reflection to get values
                            val isConnected = status.javaClass.getMethod("isConnected").invoke(status) as Boolean
                            val powerRole = status.javaClass.getMethod("getCurrentPowerRole").invoke(status) as Int
                            val dataRole = status.javaClass.getMethod("getCurrentDataRole").invoke(status) as Int
                            
                            val POWER_ROLE_SOURCE = usbPortClass.getField("POWER_ROLE_SOURCE").getInt(null)
                            val POWER_ROLE_SINK = usbPortClass.getField("POWER_ROLE_SINK").getInt(null)
                            val DATA_ROLE_HOST = usbPortClass.getField("DATA_ROLE_HOST").getInt(null)
                            val DATA_ROLE_DEVICE = usbPortClass.getField("DATA_ROLE_DEVICE").getInt(null)
                            
                            val canSource = isConnected && powerRole == POWER_ROLE_SOURCE
                            val isHost = isConnected && dataRole == DATA_ROLE_HOST

                            val map = Arguments.createMap().apply {
                                putBoolean("connected", isConnected)
                                putString("powerRole",
                                    when (powerRole) {
                                        POWER_ROLE_SOURCE -> "SOURCE"
                                        POWER_ROLE_SINK -> "SINK"
                                        else -> "UNKNOWN"
                                    })
                                putString("dataRole",
                                    when (dataRole) {
                                        DATA_ROLE_HOST -> "HOST"
                                        DATA_ROLE_DEVICE -> "DEVICE"
                                        else -> "UNKNOWN"
                                    })
                                putBoolean("canSourcePower", canSource)
                                putBoolean("isHost", isHost)
                            }
                            emitUsbEvent("USB_PORT_CHANGED", map)

                            // If we became power SOURCE or HOST, open the attach window
                            maybeOpenAttachWindowByRoles(isConnected, powerRole, dataRole)
                        } catch (t: Throwable) {
                            Log.w(TAG, "Usb port callback error", t)
                        }
                    }
                    null
                }
                
                // Register the callback using reflection
                val registerMethod = usbManager!!.javaClass.getMethod(
                    "registerPortCallback", 
                    java.util.concurrent.Executor::class.java,
                    portListenerClass
                )
                registerMethod.invoke(usbManager, reactApplicationContext.mainExecutor, usbPortCallback)
                
                Log.d(TAG, "USB port callback registered successfully")
            } catch (t: Throwable) {
                Log.w(TAG, "USB port callback not available or failed to register", t)
            }
        }
    }

    @ReactMethod
    fun forceAttachWindow(promise: Promise) {
        scheduleAttachWindow()
        promise.resolve(true)
    }

    @ReactMethod
    fun performRecalibration(promise: Promise) {
        Log.d(TAG, "🔄 [MANUAL RECALIBRATION] Performing manual recalibration")
        try {
            // Force a recalibration by clearing recent samples and triggering update
            recentBaselineSamples.clear()
            lastRecalibrationTime = System.currentTimeMillis()
            
            // Trigger immediate recalibration
            performPeriodicRecalibration(System.currentTimeMillis())
            
            Log.d(TAG, "🔄 [MANUAL RECALIBRATION] ✅ Manual recalibration completed")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "🔄 [MANUAL RECALIBRATION] ❌ Failed to perform manual recalibration", e)
            promise.reject("RECALIBRATION_ERROR", "Failed to perform manual recalibration", e)
        }
    }

    private fun startUsbPoller() {
        coroutineScope.launch {
            while (isSessionActive) {
                try {
                    val count = try { usbManager?.deviceList?.size ?: 0 } catch (_: Throwable) { 0 }
                    if (lastDeviceListCount != -1 && count > 0 && lastDeviceListCount == 0 && !lastIsCharging && lastPlugType == 0) {
                        Log.d(TAG, "🔄 USB poller detected devices count change 0 -> $count, opening attach window")
                        scheduleAttachWindow()
                        emitUsbEvent("USB_POLLED_ATTACH", null)
                    }
                    lastDeviceListCount = count
                } catch (t: Throwable) {
                    Log.w(TAG, "USB poller error", t)
                }
                delay(300)
            }
            lastDeviceListCount = -1
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        isSessionActive = false
        coroutineScope.cancel()
    }
}

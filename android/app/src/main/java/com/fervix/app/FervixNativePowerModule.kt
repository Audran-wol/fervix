package com.fervix.app

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log
import android.os.BatteryManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
    
    // Device detection variables (POSITIVE magnitudes in mA)
    private var deviceDetectionThreshold = 260.0 // mA magnitude for START
    private var deviceDetectionEndThreshold = 150.0 // mA magnitude for END
    private var baselineCurrent = 0.0
    private var lastDeviceConnected = false
    private var samplesForBaseline = mutableListOf<Double>()
    private val maxBaselineSamples = 120 // ~30s at 4Hz sampling
    
    // Direction detection (auto-detected during calibration)
    private var dischargeNegative = true // true = discharging current is negative

    // EMA filter for noise reduction
    private var ema: Double? = null
    private val SAMPLE_MS = 250L // 4 Hz sampling
    private val ALPHA = 0.1 // ~3-5s time constant

    // Debouncing state
    private var startCandidateTime: Long? = null
    private var endCandidateTime: Long? = null
    private var isHeating = false
    private val START_DEBOUNCE_MS = 1500L
    private val END_DEBOUNCE_MS = 1500L

    // Calibration
    private var calibrationComplete = false
    private val CALIBRATION_DURATION_MS = 8000L

    // Phase management
    private var currentPhase = "IDLE"
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

    private fun startPowerMonitoring() {
        coroutineScope.launch {
            while (isSessionActive) {
                try {
                    // PM Fix #4: Check if charging and block detection
                    val batteryInfo = getBatteryInfo()
                    val charging = batteryInfo["is_charging"] as Boolean
                    
                    if (charging) {
                        // Hard-block detection while charging
                        sendEvent("Sample", Arguments.createMap().apply {
                            putString("state", "PAUSED_CHARGING")
                            putBoolean("is_charging", true)
                            putBoolean("calibration_complete", calibrationComplete)
                            putString("timestamp", System.currentTimeMillis().toString())
                        })
                        delay(SAMPLE_MS)
                        continue
                    }
                    
                    // Read and filter current (PM Fix #3 & #5)
                    val rawCurrent = getCurrentReading()
                    val current = filter(rawCurrent)
                    val voltage = getVoltageReading()
                    
                    // Update baseline (PM Fix #2 - auto-freezes when heating)
                    updateBaseline(current)
                    
                    // Check device detection (PM Fix #1 - direction-agnostic)
                    val deviceDetected = checkDeviceDetection(current)
                    
                    // Calculate delta magnitude for reporting
                    val deltaMagnitude = deltaMag(current, baselineCurrent)
                    
                    // Send sample event with real battery data and device detection
                    sendEvent("Sample", Arguments.createMap().apply {
                        putDouble("current_mA", current)
                        putDouble("voltage_V", voltage)
                        putDouble("power_W", current * voltage / 1000.0)
                        putInt("battery_level", batteryInfo["level"] as Int)
                        putString("charging_status", batteryInfo["status"] as String)
                        putBoolean("is_charging", false)
                        putBoolean("device_detected", deviceDetected)
                        putDouble("baseline_current", baselineCurrent)
                        putDouble("delta_mA", deltaMagnitude) // positive = more drain
                        putDouble("detection_threshold", deviceDetectionThreshold)
                        putBoolean("calibration_complete", calibrationComplete)
                        putString("timestamp", System.currentTimeMillis().toString())
                    })
                    
                    // Check for phase changes
                    checkPhaseChanges()
                    
                    // PM recommended: 4Hz sampling (250ms)
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
            val raw = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)
            
            // DETERMINISTIC UNIT CONVERSION (PM Fix #5)
            // Assume µA → mA (most common)
            var mA = raw / 1000.0
            
            // Sanity: if |mA| > 10000 (>10A is nonsense for phones)
            if (Math.abs(mA) > 10000.0) {
                // Likely already in mA
                mA = raw.toDouble()
            }
            
            // Clamp out-of-range noise
            if (Math.abs(mA) < 0.1) {
                mA = 0.0
            }
            
            return mA
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
        if (!isSessionActive) return
        
        val currentTime = System.currentTimeMillis()
        val elapsedTime = currentTime - sessionStartTime
        
        // Handle calibration period
        if (!calibrationComplete) {
            if (elapsedTime >= CALIBRATION_DURATION_MS) {
                calibrationComplete = true
                
                // PM Fix #1: Auto-detect discharge direction
                dischargeNegative = baselineCurrent < 0
                
                Log.d(TAG, "✅ Calibration complete! Baseline: ${baselineCurrent}mA (${samplesForBaseline.size} samples), dischargeNegative: ${dischargeNegative}")
                // Stay in PREHEAT_DETECT phase, wait for device detection
            }
            return
        }
        
        // Phase transitions based on heating detection and timers
        when (currentPhase) {
            "HEATUP" -> {
                // After 15s of heating, move to TREATMENT
                if (heatupStartTime != null && currentTime - heatupStartTime!! >= 15000 && isHeating) {
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
                // After 20s of treatment, move to COOLDOWN
                if (treatmentStartTime != null && currentTime - treatmentStartTime!! >= 20000 && isHeating) {
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
                // After 10s of cooldown, move to DONE
                if (cooldownStartTime != null && currentTime - cooldownStartTime!! >= 10000) {
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
        // Freeze baseline during and near detection
        if (isHeating || startCandidateTime != null) {
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
        
        Log.d(TAG, "Baseline updated: ${baselineCurrent}mA (samples: ${samplesForBaseline.size})")
    }

    // PM-recommended detection with positive deltas and hysteresis
    private fun checkDeviceDetection(current: Double): Boolean {
        if (!calibrationComplete) return false

        // PM Fix #1: Direction-agnostic delta (positive = more drain than baseline)
        val d = deltaMag(current, baselineCurrent)
        val now = System.currentTimeMillis()

        Log.d(TAG, "🔍 Detection: current=${current}mA, baseline=${baselineCurrent}mA, deltaMag=${d}mA, threshold=${deviceDetectionThreshold}mA, isHeating=${isHeating}")

        if (!isHeating) {
            // START condition: d >= threshold (device draws threshold mA or more)
            if (d >= deviceDetectionThreshold) {
                if (startCandidateTime == null) {
                    startCandidateTime = now
                    Log.d(TAG, "🔥 Start candidate: deltaMag=${d}mA >= ${deviceDetectionThreshold}mA")
                } else if (now - startCandidateTime!! >= START_DEBOUNCE_MS) {
                    // Confirmed START
                    isHeating = true
                    startCandidateTime = null
                    endCandidateTime = null
                    
                    Log.d(TAG, "🔥 START_HEAT confirmed! deltaMag=${d}mA sustained for ${START_DEBOUNCE_MS}ms")
                    sendEvent("Detector", map("type", "START_HEAT", "delta_mA", d, "tMillis", now))
                    
                    // Transition to HEATUP phase
                    if (currentPhase == "PREHEAT_DETECT") {
                        currentPhase = "HEATUP"
                        heatupStartTime = now
                        lastPhaseChangeTime = now
                        sendPhase("HEATUP", 15000L)
                    }
                }
            } else {
                // Delta dropped below threshold - cancel candidate
                startCandidateTime = null
            }
        } else {
            // END condition: d <= end threshold (device stopped drawing significant power)
            if (d <= deviceDetectionEndThreshold) {
                if (endCandidateTime == null) {
                    endCandidateTime = now
                    Log.d(TAG, "❄️ End candidate: deltaMag=${d}mA <= ${deviceDetectionEndThreshold}mA")
                } else if (now - endCandidateTime!! >= END_DEBOUNCE_MS) {
                    // Confirmed END
                    isHeating = false
                    endCandidateTime = null
                    startCandidateTime = null
                    
                    Log.d(TAG, "❄️ END_HEAT confirmed! deltaMag=${d}mA sustained for ${END_DEBOUNCE_MS}ms")
                    sendEvent("Detector", map("type", "END_HEAT", "delta_mA", d, "tMillis", now))
                    
                    // Abort session if heating stopped prematurely
                    if (currentPhase != "COOLDOWN" && currentPhase != "DONE") {
                        currentPhase = "ABORT"
                        lastPhaseChangeTime = now
                        sendEvent("PhaseChanged", map("phase", "ABORT", "reason", "LOST_SIGNAL", "timestamp", now.toString()))
                    }
                }
            } else {
                // Delta rose above end threshold - cancel candidate
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

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        isSessionActive = false
        coroutineScope.cancel()
    }
}

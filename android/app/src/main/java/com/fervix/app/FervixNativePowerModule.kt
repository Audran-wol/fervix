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
    
    // Device detection variables
    private var deviceDetectionThreshold = -0.7 // Default threshold in mA
    private var baselineCurrent = 0.0
    private var lastDeviceConnected = false
    private var samplesForBaseline = mutableListOf<Double>()
    private val maxBaselineSamples = 10

    // Phase management
    private var currentPhase = "IDLE"
    private var sessionStartTime = 0L
    private var lastPhaseChangeTime = 0L

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
            currentPhase = "HEATUP"
            lastPhaseChangeTime = sessionStartTime

            // Send initial phase change
            sendEvent("PhaseChanged", Arguments.createMap().apply {
                putString("phase", currentPhase)
                putLong("remainingMs", 15000) // 15 seconds for heating
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
            val deviceDetected = checkDeviceDetection(current)
            
            val snapshot = Arguments.createMap().apply {
                putDouble("current_mA", current)
                putDouble("voltage_V", voltage)
                putDouble("power_W", current * voltage / 1000.0) // Convert to watts
                putInt("battery_level", batteryInfo["level"] as Int)
                putString("charging_status", batteryInfo["status"] as String)
                putBoolean("is_charging", batteryInfo["is_charging"] as Boolean)
                putBoolean("device_detected", deviceDetected)
                putDouble("baseline_current", baselineCurrent)
                putDouble("detection_threshold", deviceDetectionThreshold)
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
                    // Read actual hardware data here
                    val current = getCurrentReading()
                    val voltage = getVoltageReading()
                    
                    // Update baseline and check device detection
                    updateBaseline(current)
                    val deviceDetected = checkDeviceDetection(current)
                    
                    // Send sample event with real battery data and device detection
                    val batteryInfo = getBatteryInfo()
                    sendEvent("Sample", Arguments.createMap().apply {
                        putDouble("current_mA", current)
                        putDouble("voltage_V", voltage)
                        putDouble("power_W", current * voltage / 1000.0) // Convert to watts
                        putInt("battery_level", batteryInfo["level"] as Int)
                        putString("charging_status", batteryInfo["status"] as String)
                        putBoolean("is_charging", batteryInfo["is_charging"] as Boolean)
                        putBoolean("device_detected", deviceDetected)
                        putDouble("baseline_current", baselineCurrent)
                        putDouble("detection_threshold", deviceDetectionThreshold)
                        putString("timestamp", System.currentTimeMillis().toString())
                    })
                    
                    // Check for phase changes
                    checkPhaseChanges()
                    
                    // Small delay between readings
                    delay(100) // 10Hz sampling rate
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error in power monitoring", e)
                    delay(1000) // Wait longer on error
                }
            }
        }
    }

    private fun getCurrentReading(): Double {
        try {
            // Get real battery current from Android BatteryManager
            val currentMicroAmps = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)
            
            // Convert from microamps to milliamps
            val currentMilliAmps = currentMicroAmps.toDouble() / 1000.0
            
            Log.d(TAG, "Real battery current: ${currentMilliAmps}mA (raw: ${currentMicroAmps}μA)")
            
            return currentMilliAmps
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
        val timeSinceLastPhaseChange = currentTime - lastPhaseChangeTime
        
        val newPhase = when {
            elapsedTime < 15000 -> "HEATUP" // 15 seconds heating
            elapsedTime < 35000 -> "TREATMENT" // 20 seconds treatment (15-35s)
            elapsedTime < 45000 -> "COOLDOWN" // 10 seconds cooldown (35-45s)
            else -> "DONE" // Session complete
        }
        
        // Only send phase change if phase actually changed
        if (newPhase != currentPhase) {
            Log.d(TAG, "Phase change: $currentPhase -> $newPhase (elapsed: ${elapsedTime}ms)")
            currentPhase = newPhase
            lastPhaseChangeTime = currentTime
            
            val remainingMs = when (newPhase) {
                "HEATUP" -> 15000 - elapsedTime
                "TREATMENT" -> 35000 - elapsedTime
                "COOLDOWN" -> 45000 - elapsedTime
                else -> 0L
            }
            
            Log.d(TAG, "📡 Sending PhaseChanged event to React Native: phase=$currentPhase, remainingMs=$remainingMs")
            sendEvent("PhaseChanged", Arguments.createMap().apply {
                putString("phase", currentPhase)
                putLong("remainingMs", maxOf(0, remainingMs))
                putString("timestamp", currentTime.toString())
            })
        }
    }

    private fun updateBaseline(current: Double) {
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

    private fun checkDeviceDetection(current: Double): Boolean {
        // Device detected if current is more negative than threshold
        // Examples:
        // - Normal charging: current = +0.37mA, threshold = -0.7mA → NOT detected (0.37 > -0.7)
        // - Device plugged: current = -0.789mA, threshold = -0.7mA → DETECTED (-0.789 < -0.7)
        // - Device plugged: current = -0.850mA, threshold = -0.7mA → DETECTED (-0.850 < -0.7)
        // - Device plugged: current = -0.745mA, threshold = -2.0mA → NOT detected (-0.745 > -2.0)
        val deviceDetected = current < deviceDetectionThreshold
        
        Log.d(TAG, "🔍 Detection check: current=${current}mA, threshold=${deviceDetectionThreshold}mA, detected=${deviceDetected}")
        
        // Log state changes
        if (deviceDetected != lastDeviceConnected) {
            if (deviceDetected) {
                Log.d(TAG, "🔌 Device CONNECTED! Current: ${current}mA is MORE NEGATIVE than threshold: ${deviceDetectionThreshold}mA")
                sendEvent("Detector", Arguments.createMap().apply {
                    putString("event", "device_connected")
                    putDouble("current_mA", current)
                    putDouble("threshold_mA", deviceDetectionThreshold)
                    putString("timestamp", System.currentTimeMillis().toString())
                })
            } else {
                Log.d(TAG, "🔌 Device DISCONNECTED! Current: ${current}mA is LESS NEGATIVE than threshold: ${deviceDetectionThreshold}mA")
                sendEvent("Detector", Arguments.createMap().apply {
                    putString("event", "device_disconnected")
                    putDouble("current_mA", current)
                    putDouble("threshold_mA", deviceDetectionThreshold)
                    putString("timestamp", System.currentTimeMillis().toString())
                })
            }
            lastDeviceConnected = deviceDetected
        }
        
        return deviceDetected
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

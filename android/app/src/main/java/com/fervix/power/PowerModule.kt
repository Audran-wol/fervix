package com.fervix.power

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log

/**
 * PowerModule - React Native bridge for power monitoring
 * Exposes startSession, stopSession, getSnapshot to JavaScript
 */
class PowerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    init {
        // Store static reference for service to send events
        PowerModule.reactContext = reactContext
    }
    
    override fun getName(): String = "FervixNativePower"
    
    /**
     * Start power monitoring session
     */
    @ReactMethod
    fun startSession(options: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "=== START SESSION DEBUG ===")
            Log.d(TAG, "Options: $options")
            Log.d(TAG, "React context available: ${reactApplicationContext != null}")
            
            val context = reactApplicationContext
            if (context == null) {
                Log.e(TAG, "React context is null!")
                promise.reject("START_SESSION_ERROR", "React context is null")
                return
            }
            
            val intent = Intent(context, PowerService::class.java)
            Log.d(TAG, "Created intent for PowerService")
            
            // Start foreground service
            val result = context.startService(intent)
            Log.d(TAG, "startService result: $result")
            
            promise.resolve(null)
            Log.d(TAG, "Session started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start session: ${e.message}", e)
            promise.reject("START_SESSION_ERROR", "Failed to start session: ${e.message}", e)
        }
    }
    
    /**
     * Stop power monitoring session
     */
    @ReactMethod
    fun stopSession(promise: Promise) {
        try {
            Log.d(TAG, "Stopping power monitoring session")
            
            val context = reactApplicationContext
            val intent = Intent(context, PowerService::class.java)
            
            // Stop service
            context.stopService(intent)
            
            promise.resolve(null)
            Log.d(TAG, "Session stopped successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop session: ${e.message}", e)
            promise.reject("STOP_SESSION_ERROR", "Failed to stop session: ${e.message}", e)
        }
    }
    
    /**
     * Get current detector snapshot
     */
    @ReactMethod
    fun getSnapshot(promise: Promise) {
        try {
            val service = PowerService.instance
            
            if (service != null) {
                val snapshot = service.getSnapshot()
                val result = Arguments.createMap().apply {
                    putDouble("baseline_mA", snapshot["baseline_mA"] as? Double ?: 0.0)
                    putDouble("lastDelta_mA", snapshot["lastDelta_mA"] as? Double ?: 0.0)
                    putBoolean("isConnected", snapshot["isConnected"] as? Boolean ?: false)
                }
                promise.resolve(result)
            } else {
                // Service not running - return default values
                val result = Arguments.createMap().apply {
                    putDouble("baseline_mA", 0.0)
                    putDouble("lastDelta_mA", 0.0)
                    putBoolean("isConnected", false)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get snapshot: ${e.message}", e)
            promise.reject("SNAPSHOT_ERROR", "Failed to get snapshot: ${e.message}", e)
        }
    }
    
    companion object {
        private const val TAG = "PowerModule"
        
        // Static reference for service to send events
        var reactContext: ReactApplicationContext? = null
    }
}

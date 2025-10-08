package com.fervix.power

import android.util.Log

/**
 * PowerDetector - Accessory connection/disconnection detection
 * Uses IIR filters and debouncing to detect sustained current steps
 */
class PowerDetector(
    private val onDetectorEvent: (type: String, tMillis: Long, delta_mA: Double) -> Unit
) {
    // Filter coefficients
    private val ALPHA = 0.25  // Low-pass filter for fast tracking
    private val BETA = 0.02   // Baseline tracking (slow)
    
    // Thresholds (in mA, negative = discharge)
    private val TH_CONNECT = 150.0     // Accessory connected threshold
    private val TH_DISCONNECT = 90.0   // Accessory disconnected threshold
    
    // Debounce times (ms)
    private val CONNECT_DEBOUNCE = 800L
    private val DISCONNECT_DEBOUNCE = 1000L
    
    // State
    private var baseline_mA = 0.0
    private var filtered_mA = 0.0
    private var isConnected = false
    private var candidateStartTime: Long? = null
    private var candidateEndTime: Long? = null
    private var initialized = false
    
    /**
     * Process a new current sample
     */
    fun processSample(current_mA: Double, tMillis: Long) {
        // Initialize filters on first sample
        if (!initialized) {
            baseline_mA = current_mA
            filtered_mA = current_mA
            initialized = true
            return
        }
        
        // Apply IIR filters
        filtered_mA = ALPHA * current_mA + (1 - ALPHA) * filtered_mA
        
        // Update baseline only when not connected (to track idle level)
        if (!isConnected) {
            baseline_mA = BETA * current_mA + (1 - BETA) * baseline_mA
        }
        
        // Calculate delta (negative = more discharge = accessory drawing power)
        val delta = filtered_mA - baseline_mA
        
        // State machine with hysteresis and debouncing
        if (!isConnected) {
            // Looking for CONNECT: delta drops below -TH_CONNECT
            if (delta <= -TH_CONNECT) {
                if (candidateStartTime == null) {
                    candidateStartTime = tMillis
                } else if (tMillis - candidateStartTime!! >= CONNECT_DEBOUNCE) {
                    // Debounce passed - confirm connection
                    isConnected = true
                    candidateStartTime = null
                    candidateEndTime = null
                    onDetectorEvent("ACCESSORY_CONNECTED", tMillis, delta)
                    Log.d(TAG, "ACCESSORY_CONNECTED detected: delta=$delta mA")
                }
            } else {
                // Delta rose back above threshold - reset debounce
                candidateStartTime = null
            }
        } else {
            // Looking for DISCONNECT: delta rises above -TH_DISCONNECT
            if (delta >= -TH_DISCONNECT) {
                if (candidateEndTime == null) {
                    candidateEndTime = tMillis
                } else if (tMillis - candidateEndTime!! >= DISCONNECT_DEBOUNCE) {
                    // Debounce passed - confirm disconnection
                    isConnected = false
                    candidateEndTime = null
                    candidateStartTime = null
                    onDetectorEvent("ACCESSORY_DISCONNECTED", tMillis, delta)
                    Log.d(TAG, "ACCESSORY_DISCONNECTED detected: delta=$delta mA")
                }
            } else {
                // Delta dropped back below threshold - reset debounce
                candidateEndTime = null
            }
        }
    }
    
    /**
     * Get current detector state snapshot
     */
    fun getSnapshot(): Map<String, Any> {
        return mapOf(
            "baseline_mA" to baseline_mA,
            "filtered_mA" to filtered_mA,
            "lastDelta_mA" to (filtered_mA - baseline_mA),
            "isConnected" to isConnected
        )
    }
    
    /**
     * Reset detector state
     */
    fun reset() {
        baseline_mA = 0.0
        filtered_mA = 0.0
        isConnected = false
        candidateStartTime = null
        candidateEndTime = null
        initialized = false
        Log.d(TAG, "Detector reset")
    }
    
    companion object {
        private const val TAG = "PowerDetector"
    }
}

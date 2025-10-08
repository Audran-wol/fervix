package com.fervix.power

import android.content.Context
import android.content.SharedPreferences
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import java.io.File

/**
 * PowerReader - Tiered current reading strategy
 * Tries multiple methods to read battery current, falls back gracefully
 */
class PowerReader(private val context: Context) {
    private val batteryManager: BatteryManager = 
        context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("PowerReader", Context.MODE_PRIVATE)
    
    private val deviceKey = "${Build.MANUFACTURER}_${Build.MODEL}"
    
    // Sign flip flag - persisted per device model
    private var signFlip: Boolean = prefs.getBoolean("${deviceKey}_signFlip", false)
    
    // Cached reader source for performance
    private var preferredSource: ReaderSource? = null
    
    private enum class ReaderSource {
        BM_NOW,
        BM_AVG,
        SYSFS
    }
    
    private val sysfsPathsAllowlist = listOf(
        "/sys/class/power_supply/battery/current_now",
        "/sys/class/power_supply/Battery/current_now",
        "/sys/class/power_supply/usb/current_now",
        "/sys/class/hw_power/charger/current_now"
    )
    
    /**
     * Read current in milliamps
     * Returns current where discharge = negative
     */
    fun readCurrentMa(): Double {
        var current: Double? = null
        var source: ReaderSource? = null
        
        Log.d(TAG, "=== POWER READER DEBUG ===")
        Log.d(TAG, "Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        Log.d(TAG, "Preferred source: $preferredSource")
        
        // Try preferred source first if available
        if (preferredSource != null) {
            Log.d(TAG, "Trying preferred source: $preferredSource")
            current = trySource(preferredSource!!)
            if (current != null) {
                val result = applySignFlip(current)
                Log.d(TAG, "Preferred source success: $current -> $result mA (signFlip: $signFlip)")
                return result
            } else {
                Log.w(TAG, "Preferred source failed, falling back to tiered approach")
            }
        }
        
        // Tier 1: BatteryManager instantaneous current
        Log.d(TAG, "Tier 1: Trying BatteryManager.CURRENT_NOW")
        current = tryBatteryManagerNow()
        if (current != null) {
            source = ReaderSource.BM_NOW
            Log.d(TAG, "Tier 1 SUCCESS: $current mA")
        } else {
            Log.w(TAG, "Tier 1 FAILED: BatteryManager.CURRENT_NOW not available")
        }
        
        // Tier 2: BatteryManager average current
        if (current == null) {
            Log.d(TAG, "Tier 2: Trying BatteryManager.CURRENT_AVERAGE")
            current = tryBatteryManagerAverage()
            if (current != null) {
                source = ReaderSource.BM_AVG
                Log.d(TAG, "Tier 2 SUCCESS: $current mA")
            } else {
                Log.w(TAG, "Tier 2 FAILED: BatteryManager.CURRENT_AVERAGE not available")
            }
        }
        
        // Tier 3: Sysfs paths
        if (current == null) {
            Log.d(TAG, "Tier 3: Trying sysfs paths")
            current = trySysfs()
            if (current != null) {
                source = ReaderSource.SYSFS
                Log.d(TAG, "Tier 3 SUCCESS: $current mA")
            } else {
                Log.w(TAG, "Tier 3 FAILED: All sysfs paths not accessible")
            }
        }
        
        // Cache successful source
        if (source != null && preferredSource == null) {
            preferredSource = source
            Log.d(TAG, "CACHED preferred current source: $source")
        }
        
        val result = if (current != null) {
            val finalResult = applySignFlip(current)
            Log.d(TAG, "FINAL RESULT: $current -> $finalResult mA (signFlip: $signFlip)")
            finalResult
        } else {
            Log.e(TAG, "ALL METHODS FAILED: No current reading available on this device!")
            0.0
        }
        
        Log.d(TAG, "=== END POWER READER DEBUG ===")
        return result
    }
    
    private fun trySource(source: ReaderSource): Double? {
        return when (source) {
            ReaderSource.BM_NOW -> tryBatteryManagerNow()
            ReaderSource.BM_AVG -> tryBatteryManagerAverage()
            ReaderSource.SYSFS -> trySysfs()
        }
    }
    
    private fun tryBatteryManagerNow(): Double? {
        return try {
            val microAmps = batteryManager.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)
            Log.d(TAG, "BatteryManager.CURRENT_NOW raw value: $microAmps µA")
            if (microAmps == Long.MIN_VALUE) {
                Log.w(TAG, "BatteryManager.CURRENT_NOW returned MIN_VALUE (not supported)")
                null
            } else {
                val result = microAmps / 1000.0 // µA → mA
                Log.d(TAG, "BatteryManager.CURRENT_NOW converted: $result mA")
                result
            }
        } catch (e: Exception) {
            Log.e(TAG, "BatteryManager.CURRENT_NOW exception: ${e.message}", e)
            null
        }
    }
    
    private fun tryBatteryManagerAverage(): Double? {
        return try {
            val microAmps = batteryManager.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_AVERAGE)
            Log.d(TAG, "BatteryManager.CURRENT_AVERAGE raw value: $microAmps µA")
            if (microAmps == Long.MIN_VALUE) {
                Log.w(TAG, "BatteryManager.CURRENT_AVERAGE returned MIN_VALUE (not supported)")
                null
            } else {
                val result = microAmps / 1000.0 // µA → mA
                Log.d(TAG, "BatteryManager.CURRENT_AVERAGE converted: $result mA")
                result
            }
        } catch (e: Exception) {
            Log.e(TAG, "BatteryManager.CURRENT_AVERAGE exception: ${e.message}", e)
            null
        }
    }
    
    private fun trySysfs(): Double? {
        for (path in sysfsPathsAllowlist) {
            val current = tryReadSysfsPath(path)
            if (current != null) {
                return current
            }
        }
        return null
    }
    
    private fun tryReadSysfsPath(path: String): Double? {
        return try {
            val file = File(path)
            Log.d(TAG, "Checking sysfs path: $path")
            if (!file.exists()) {
                Log.d(TAG, "Sysfs path does not exist: $path")
                return null
            }
            if (!file.canRead()) {
                Log.d(TAG, "Sysfs path not readable: $path")
                return null
            }
            
            val content = file.readText().trim()
            Log.d(TAG, "Sysfs content: '$content'")
            val value = content.toLongOrNull()
            if (value != null) {
                val result = value / 1000.0 // µA → mA
                Log.d(TAG, "Sysfs path success: $path -> $value µA -> $result mA")
                result
            } else {
                Log.w(TAG, "Sysfs path content not a number: $path -> '$content'")
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sysfs path exception: $path -> ${e.message}")
            null
        }
    }
    
    private fun applySignFlip(current: Double): Double {
        return if (signFlip) -current else current
    }
    
    /**
     * Enable/disable sign flip and persist
     */
    fun setSignFlip(enabled: Boolean) {
        signFlip = enabled
        prefs.edit()
            .putBoolean("${deviceKey}_signFlip", enabled)
            .apply()
        Log.d(TAG, "Sign flip ${if (enabled) "enabled" else "disabled"} for device: $deviceKey")
    }
    
    fun getSignFlip(): Boolean = signFlip
    
    companion object {
        private const val TAG = "PowerReader"
    }
}

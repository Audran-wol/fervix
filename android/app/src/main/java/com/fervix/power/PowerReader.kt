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
        
        // Try preferred source first if available
        if (preferredSource != null) {
            current = trySource(preferredSource!!)
            if (current != null) {
                return applySignFlip(current)
            }
        }
        
        // Tier 1: BatteryManager instantaneous current
        current = tryBatteryManagerNow()
        if (current != null) {
            source = ReaderSource.BM_NOW
        }
        
        // Tier 2: BatteryManager average current
        if (current == null) {
            current = tryBatteryManagerAverage()
            if (current != null) {
                source = ReaderSource.BM_AVG
            }
        }
        
        // Tier 3: Sysfs paths
        if (current == null) {
            current = trySysfs()
            if (current != null) {
                source = ReaderSource.SYSFS
            }
        }
        
        // Cache successful source
        if (source != null && preferredSource == null) {
            preferredSource = source
            Log.d(TAG, "Preferred current source: $source")
        }
        
        return if (current != null) {
            applySignFlip(current)
        } else {
            Log.w(TAG, "All current reading methods failed, returning 0.0")
            0.0
        }
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
            if (microAmps == Long.MIN_VALUE) {
                null
            } else {
                microAmps / 1000.0 // µA → mA
            }
        } catch (e: Exception) {
            Log.w(TAG, "BatteryManager.CURRENT_NOW failed: ${e.message}")
            null
        }
    }
    
    private fun tryBatteryManagerAverage(): Double? {
        return try {
            val microAmps = batteryManager.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_AVERAGE)
            if (microAmps == Long.MIN_VALUE) {
                null
            } else {
                microAmps / 1000.0 // µA → mA
            }
        } catch (e: Exception) {
            Log.w(TAG, "BatteryManager.CURRENT_AVERAGE failed: ${e.message}")
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
            if (!file.exists() || !file.canRead()) {
                return null
            }
            
            val value = file.readText().trim().toLongOrNull()
            if (value != null) {
                value / 1000.0 // µA → mA
            } else {
                null
            }
        } catch (e: Exception) {
            // Silently skip if not readable (SELinux, permissions, etc.)
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

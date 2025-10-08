package com.fervix.power

import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * PowerService - Foreground service for battery current sampling
 * Samples at ~12.5 Hz (80ms interval) and emits events to React Native
 */
class PowerService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    
    private lateinit var reader: PowerReader
    private lateinit var detector: PowerDetector
    
    private val sampleInterval = 80L // ms (~12.5 Hz)
    private var isRunning = false
    
    private val samplingRunnable = object : Runnable {
        override fun run() {
            if (isRunning) {
                sample()
                handler.postDelayed(this, sampleInterval)
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "PowerService onCreate")
        
        // Create notification channel
        PowerNotifications.createNotificationChannel(this)
        
        // Initialize reader and detector
        reader = PowerReader(this)
        detector = PowerDetector { type, tMillis, delta_mA ->
            emitDetectorEvent(type, tMillis, delta_mA)
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "PowerService onStartCommand")
        
        // Start foreground with notification
        val notification = PowerNotifications.buildNotification(this)
        startForeground(PowerNotifications.getNotificationId(), notification)
        
        // Acquire partial wake lock
        acquireWakeLock()
        
        // Start sampling
        startSampling()
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        Log.d(TAG, "PowerService onDestroy")
        stopSampling()
        releaseWakeLock()
        super.onDestroy()
    }
    
    private fun startSampling() {
        if (!isRunning) {
            isRunning = true
            detector.reset()
            handler.post(samplingRunnable)
            Log.d(TAG, "Sampling started")
        }
    }
    
    private fun stopSampling() {
        if (isRunning) {
            isRunning = false
            handler.removeCallbacks(samplingRunnable)
            Log.d(TAG, "Sampling stopped")
        }
    }
    
    private fun sample() {
        val current_mA = reader.readCurrentMa()
        val tMillis = System.currentTimeMillis()
        
        Log.d(TAG, "SAMPLE: $current_mA mA at $tMillis")
        
        // Process through detector
        detector.processSample(current_mA, tMillis)
        
        // Emit sample event to React Native
        emitSampleEvent(tMillis, current_mA)
    }
    
    private fun emitSampleEvent(tMillis: Long, current_mA: Double) {
        try {
            Log.d(TAG, "EMITTING Sample event: $current_mA mA")
            val params = Arguments.createMap().apply {
                putDouble("tMillis", tMillis.toDouble())
                putDouble("current_mA", current_mA)
            }
            sendEvent("Sample", params)
            Log.d(TAG, "Sample event sent successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit Sample event: ${e.message}", e)
        }
    }
    
    private fun emitDetectorEvent(type: String, tMillis: Long, delta_mA: Double) {
        try {
            val params = Arguments.createMap().apply {
                putString("type", type)
                putDouble("tMillis", tMillis.toDouble())
                putDouble("delta_mA", delta_mA)
            }
            sendEvent("Detector", params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit Detector event: ${e.message}")
        }
    }
    
    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap?) {
        try {
            Log.d(TAG, "Sending event $eventName to React Native")
            val reactContext = PowerModule.reactContext
            if (reactContext == null) {
                Log.w(TAG, "React context is null, cannot send event $eventName")
                return
            }
            
            val emitter = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            if (emitter == null) {
                Log.w(TAG, "Event emitter is null, cannot send event $eventName")
                return
            }
            
            emitter.emit(eventName, params)
            Log.d(TAG, "Event $eventName sent successfully to React Native")
        } catch (e: Exception) {
            Log.e(TAG, "Exception sending event $eventName: ${e.message}", e)
        }
    }
    
    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Fervix::PowerMonitor"
            ).apply {
                acquire(30 * 60 * 1000L) // 30 minutes timeout
            }
            Log.d(TAG, "WakeLock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire WakeLock: ${e.message}")
        }
    }
    
    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }
    
    fun getSnapshot(): Map<String, Any> {
        return detector.getSnapshot()
    }
    
    companion object {
        private const val TAG = "PowerService"
        var instance: PowerService? = null
    }
    
    init {
        instance = this
    }
}

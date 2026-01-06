package com.example.ichtestemich

import android.os.BatteryManager
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "battery_info_channel"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        MethodChannel(flutterEngine?.dartExecutor?.binaryMessenger!!, CHANNEL).setMethodCallHandler {
                call, result ->
            if (call.method == "getBatteryInfo") {
                val batteryManager = getSystemService(BATTERY_SERVICE) as BatteryManager

                val info = mapOf(
                    "Charge Counter (mAh)" to batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER),
                    "Current Now (µA)" to batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW),
                    "Current Average (µA)" to batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_AVERAGE),
                    "Capacity (%)" to batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY),
                    "Energy Counter (nWh)" to batteryManager.getLongProperty(BatteryManager.BATTERY_PROPERTY_ENERGY_COUNTER)
                )
                result.success(info)
            } else {
                result.notImplemented()
            }
        }
    }
}

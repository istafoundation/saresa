package expo.modules.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BroadcastReceiver that starts the AppMonitorService when the device boots.
 * This ensures parental controls are active immediately after a device restart.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS_NAME = "app_blocker_prefs"
        private const val KEY_MONITORING_ENABLED = "monitoring_enabled"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Boot completed - checking if monitoring should start")
            
            // Check if monitoring was previously enabled
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val monitoringEnabled = prefs.getBoolean(KEY_MONITORING_ENABLED, false)
            
            if (monitoringEnabled) {
                Log.d(TAG, "Monitoring was enabled - starting AppMonitorService")
                startMonitoringService(context)
                
                // Also schedule the WorkManager watchdog
                ServiceWatchdogWorker.schedule(context)
            } else {
                Log.d(TAG, "Monitoring was not enabled - skipping service start")
            }
        }
    }

    private fun startMonitoringService(context: Context) {
        try {
            val serviceIntent = Intent(context, AppMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d(TAG, "AppMonitorService started successfully from boot")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start AppMonitorService from boot: ${e.message}", e)
        }
    }
}

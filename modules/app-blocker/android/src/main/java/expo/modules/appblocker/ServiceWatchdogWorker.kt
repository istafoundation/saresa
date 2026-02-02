package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * WorkManager Worker that periodically checks if the AppMonitorService is running
 * and restarts it if necessary. This provides resilience against force-stop.
 * 
 * Runs every 15 minutes (minimum allowed interval by Android).
 */
class ServiceWatchdogWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    companion object {
        private const val TAG = "ServiceWatchdogWorker"
        private const val WORK_NAME = "app_blocker_watchdog"
        private const val PREFS_NAME = "app_blocker_prefs"
        private const val KEY_MONITORING_ENABLED = "monitoring_enabled"

        /**
         * Schedule the periodic watchdog worker.
         * Uses KEEP policy to avoid rescheduling if already scheduled.
         */
        fun schedule(context: Context) {
            Log.d(TAG, "Scheduling watchdog worker")
            
            val workRequest = PeriodicWorkRequestBuilder<ServiceWatchdogWorker>(
                15, TimeUnit.MINUTES // Minimum interval allowed by WorkManager
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiresBatteryNotLow(false) // Run even on low battery
                        .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP, // Keep existing if already scheduled
                workRequest
            )
            
            Log.d(TAG, "Watchdog worker scheduled successfully")
        }

        /**
         * Cancel the periodic watchdog worker.
         */
        fun cancel(context: Context) {
            Log.d(TAG, "Cancelling watchdog worker")
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }

    override fun doWork(): Result {
        Log.d(TAG, "Watchdog check running...")
        
        // Check if monitoring is supposed to be enabled
        val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val monitoringEnabled = prefs.getBoolean(KEY_MONITORING_ENABLED, false)
        
        if (!monitoringEnabled) {
            Log.d(TAG, "Monitoring disabled - skipping service check")
            return Result.success()
        }

        // Check if service is running
        if (!AppMonitorService.isServiceRunning) {
            Log.w(TAG, "Service not running! Attempting to restart...")
            try {
                val serviceIntent = Intent(appContext, AppMonitorService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    appContext.startForegroundService(serviceIntent)
                } else {
                    appContext.startService(serviceIntent)
                }
                Log.d(TAG, "Service restart initiated")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restart service: ${e.message}", e)
                return Result.retry()
            }
        } else {
            Log.d(TAG, "Service is running - all good")
        }

        return Result.success()
    }
}

package expo.modules.appblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppBlockerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        AsyncFunction("checkUsagePermission") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
                }
                mode == AppOpsManager.MODE_ALLOWED
            }
        }

        Function("requestUsagePermission") {
            appContext.reactContext?.let { context ->
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
        }

        AsyncFunction("checkOverlayPermission") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        Function("requestOverlayPermission") {
            appContext.reactContext?.let { context ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + context.packageName))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                }
            }
        }

        AsyncFunction("getInstalledApps") {
            val context = appContext.reactContext
            if (context == null) {
                emptyList<Map<String, Any>>()
            } else {
                val pm = context.packageManager
                val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)
                val appsList = mutableListOf<Map<String, Any>>()

                for (packageInfo in packages) {
                    val appInfo = packageInfo.applicationInfo ?: continue
                    val packageName = packageInfo.packageName
                    
                    // Skip our own app
                    if (packageName == context.packageName) continue
                    
                    // Get app label
                    val label = pm.getApplicationLabel(appInfo).toString()
                    
                    // Check app type flags
                    val isSystemApp = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                    val isUpdatedSystemApp = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
                    
                    appsList.add(mapOf(
                        "name" to label,
                        "packageName" to packageName,
                        "isSystemApp" to (isSystemApp && !isUpdatedSystemApp)
                    ))
                }
                appsList
            }
        }

        AsyncFunction("setBlockedApps") { blockedApps: List<String> ->
            AppMonitorService.setBlockedApps(blockedApps)
            true
        }

        AsyncFunction("startMonitoring") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else if (AppMonitorService.isServiceRunning) {
                true
            } else {
                val intent = Intent(context, AppMonitorService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    try {
                        context.startForegroundService(intent)
                        true
                    } catch (e: Exception) {
                        android.util.Log.e("AppBlocker", "Failed to start foreground service: ${e.message}")
                        false
                    }
                } else {
                    context.startService(intent)
                    true
                }
            }
        }

        AsyncFunction("stopMonitoring") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                val intent = Intent(context, AppMonitorService::class.java)
                context.stopService(intent)
                true
            }
        }

        AsyncFunction("checkNotificationPermission") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                manager.areNotificationsEnabled()
            } else {
                true
            }
        }

        Function("openNotificationSettings") {
            appContext.reactContext?.let { context ->
                val intent = Intent()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                } else {
                    intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                    intent.addCategory(Intent.CATEGORY_DEFAULT)
                    intent.data = Uri.parse("package:" + context.packageName)
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
        }
    }
}

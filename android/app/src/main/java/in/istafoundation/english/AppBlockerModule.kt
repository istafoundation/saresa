package `in`.istafoundation.english

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.app.Activity
import android.net.Uri

class AppBlockerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppBlocker"
    }

    @ReactMethod
    fun checkUsagePermission(promise: Promise) {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactApplicationContext.packageName)
        } else {
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactApplicationContext.packageName)
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun requestUsagePermission() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactApplicationContext.packageName))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)
            val appsLink = Arguments.createArray()

            for (packageInfo in packages) {
                val appInfo = packageInfo.applicationInfo ?: continue
                val packageName = packageInfo.packageName
                
                // Skip our own app
                if (packageName == reactApplicationContext.packageName) continue
                
                // Get app label
                val label = pm.getApplicationLabel(appInfo).toString()
                
                // Check app type flags
                val isSystemApp = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                val isUpdatedSystemApp = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
                
                // Include ALL apps (user requested to show every app)
                val map = Arguments.createMap()
                map.putString("name", label)
                map.putString("packageName", packageName)
                map.putBoolean("isSystemApp", isSystemApp && !isUpdatedSystemApp)
                appsLink.pushMap(map)
            }
            promise.resolve(appsLink)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun setBlockedApps(blockedApps: ReadableArray, promise: Promise) {
        try {
            val apps = ArrayList<String>()
            for (i in 0 until blockedApps.size()) {
                val app = blockedApps.getString(i)
                if (app != null) {
                    apps.add(app)
                }
            }
            
            // Pass the list to the service
            AppMonitorService.setBlockedApps(apps)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun startMonitoring(promise: Promise) {
        try {
            if (AppMonitorService.isServiceRunning) {
                promise.resolve(true)
                return
            }

            val intent = Intent(reactApplicationContext, AppMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    reactApplicationContext.startForegroundService(intent)
                } catch (e: Exception) {
                    // This happens if the app is in background (Android 12+)
                    // We just log it and don't crash.
                    // The service will start automatically next time the app is opened.
                    android.util.Log.e("AppBlocker", "Failed to start foreground service: ${e.message}")
                    promise.resolve(false) // Resolve false but don't reject
                    return
                }
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, AppMonitorService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun checkNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            promise.resolve(manager.areNotificationsEnabled())
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openNotificationSettings() {
        val intent = Intent()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
        } else {
            intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            intent.addCategory(Intent.CATEGORY_DEFAULT)
            intent.data = android.net.Uri.parse("package:" + reactApplicationContext.packageName)
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }
}

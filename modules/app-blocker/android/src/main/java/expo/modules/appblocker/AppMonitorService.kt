package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import android.content.SharedPreferences
import android.os.HandlerThread

class AppMonitorService : Service() {

    private val handler by lazy {
        val thread = HandlerThread("AppMonitorThread")
        thread.start()
        Handler(thread.looper)
    }
    private val mainHandler = Handler(Looper.getMainLooper())
    private val checkInterval = 500L // Check every 0.5 second
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var windowManager: WindowManager
    private var blockingView: View? = null
    private val TAG = "AppMonitorService"
    private val PREFS_NAME = "AppBlockerPrefs"
    private val KEY_BLOCKED_APPS = "blocked_apps"

    companion object {
        var isServiceRunning = false
        private var blockedPackages: MutableList<String> = ArrayList()

        fun setBlockedApps(apps: List<String>) {
            synchronized(blockedPackages) {
                blockedPackages.clear()
                blockedPackages.addAll(apps)
            }
            android.util.Log.d("AppMonitorService", "Blocked apps updated in memory: $apps")
        }
    }

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isServiceRunning) return
            try {
                checkCurrentApp()
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Error in monitor loop", e)
            }
            handler.postDelayed(this, checkInterval)
        }
    }

    override fun onCreate() {
        super.onCreate()
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        loadBlockedApps()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isServiceRunning) {
            isServiceRunning = true
            startForeground(1, createNotification())
            handler.post(monitorRunnable)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        handler.removeCallbacks(monitorRunnable)
        handler.looper.quit() // Stop the background thread
        mainHandler.post { removeBlockingView() }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun checkCurrentApp() {
        val currentBlockedPackages = synchronized(blockedPackages) {
            ArrayList(blockedPackages)
        }

        if (currentBlockedPackages.isEmpty()) {
            mainHandler.post { removeBlockingView() }
            return
        }

        val time = System.currentTimeMillis()
        // Query events from the last 2 seconds for real-time detection
        val usageEvents = usageStatsManager.queryEvents(time - 2000, time)
        
        var currentForegroundApp: String? = null
        val event = android.app.usage.UsageEvents.Event()
        
        // Find the most recent foreground event
        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (event.eventType == android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED ||
                event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                currentForegroundApp = event.packageName
            }
        }
        
        // If we found a foreground app
        if (currentForegroundApp != null) {
            // If it's one of ours, or the launcher, we definitely don't want to block it
            if (currentForegroundApp == packageName) {
                return
            }

            if (currentBlockedPackages.contains(currentForegroundApp)) {
                // It is a blocked app -> Show Overlay
                android.util.Log.d(TAG, "Blocking app: $currentForegroundApp")
                mainHandler.post { showBlockingView(currentForegroundApp!!) }
            } else {
                // It is NOT a blocked app -> Remove Overlay
                // Only remove if we are sure we moved to a safe app
                mainHandler.post { removeBlockingView() }
            }
        }
    }

    private fun showBlockingView(blockedPackageName: String) {
        if (blockingView != null) return // Already showing

        try {
            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            )
            layoutParams.gravity = Gravity.CENTER

            // Create Programmatic View
            val frameLayout = FrameLayout(this)
            frameLayout.setBackgroundColor(Color.parseColor("#CC000000")) // Semi-transparent black background

            val container = LinearLayout(this)
            container.orientation = LinearLayout.VERTICAL
            container.gravity = Gravity.CENTER
            val containerParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
            containerParams.gravity = Gravity.CENTER
            frameLayout.addView(container, containerParams)

            // Icon/Text
            val title = TextView(this)
            title.text = "Access Restricted"
            title.textSize = 24f
            title.setTextColor(Color.WHITE)
            title.gravity = Gravity.CENTER
            title.setPadding(0, 0, 0, 32)
            container.addView(title)

            val message = TextView(this)
            message.text = "This app is currently blocked by your parent."
            message.textSize = 16f
            message.setTextColor(Color.LTGRAY)
            message.gravity = Gravity.CENTER
            message.setPadding(48, 0, 48, 64)
            container.addView(message)

            // Go Home Button
            val button = Button(this)
            button.text = "Go Home"
            button.setOnClickListener {
                val homeIntent = Intent(Intent.ACTION_MAIN)
                homeIntent.addCategory(Intent.CATEGORY_HOME)
                homeIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(homeIntent)
                // We rely on the next checkLoop to remove the view once Home is foreground
            }
            container.addView(button)

            blockingView = frameLayout
            windowManager.addView(blockingView, layoutParams)
            android.util.Log.d(TAG, "Blocking view added")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error showing blocking view", e)
        }
    }

    private fun removeBlockingView() {
        if (blockingView == null) return

        try {
            windowManager.removeView(blockingView)
            blockingView = null
            android.util.Log.d(TAG, "Blocking view removed")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error removing blocking view", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val serviceChannel = NotificationChannel(
                "AppMonitorChannel_v2",
                "App Monitor Service",
                NotificationManager.IMPORTANCE_MIN
            )
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, "AppMonitorChannel_v2")
            .setContentTitle("Saresa Parental Control")
            .setContentText("Monitoring active apps...")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }
    private fun loadBlockedApps() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedApps = prefs.getStringSet(KEY_BLOCKED_APPS, emptySet())
        if (savedApps != null) {
            setBlockedApps(savedApps.toList())
            android.util.Log.d(TAG, "Restored blocked apps: $savedApps")
        }
    }
}

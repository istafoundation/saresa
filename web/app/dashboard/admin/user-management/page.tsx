"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { 
  Shield, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Action names mapped to human-readable labels
const ACTION_LABELS: Record<string, string> = {
  login: "Login Attempts",
  addXP: "XP Operations",
  updateShards: "Shard Operations",
  finishGame: "Game Completions",
  mutation: "General Mutations",
  checkUsername: "Username Checks",
};

export default function UserManagementPage() {
  const isAdmin = useQuery(api.parents.isAdmin);
  const [activeTab, setActiveTab] = useState<"notifications" | "overview">("notifications");
  const [showRead, setShowRead] = useState(false);

  const notifications = useQuery(api.admin.getRateLimitNotifications, { 
    limit: 100,
    showRead 
  });
  const unreadCount = useQuery(api.admin.getUnreadNotificationCount);
  const securityOverview = useQuery(api.admin.getSecurityOverview);

  const markRead = useMutation(api.admin.markNotificationRead);
  const markAllRead = useMutation(api.admin.markAllNotificationsRead);
  const clearOld = useMutation(api.admin.clearOldNotifications);

  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Shield className="w-16 h-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold">Admin Access Required</h2>
        <p className="mt-2">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="text-emerald-600" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Monitor security alerts and rate limit violations
          </p>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "notifications"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Notifications
            {(unreadCount?.count ?? 0) > 0 && (
              <span className="ml-2 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount?.count}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Overview
          </button>
        </div>
      </div>

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRead(!showRead)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                {showRead ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showRead ? "Hide Read" : "Show Read"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => markAllRead({})}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark All Read
              </button>
              <button
                onClick={() => clearOld({})}
                className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Clear Old
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications === undefined ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
              <p className="font-medium">No rate limit violations</p>
              <p className="text-sm text-slate-400">Everything is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-xl border transition-all ${
                    notification.isRead
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white border-rose-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.isRead ? "bg-slate-200" : "bg-rose-100"
                      }`}>
                        <AlertTriangle className={`w-5 h-5 ${
                          notification.isRead ? "text-slate-500" : "text-rose-600"
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          Rate Limit Hit: {ACTION_LABELS[notification.action] ?? notification.action}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {notification.childDetails ? (
                            <>
                              <User className="w-3 h-3 inline mr-1" />
                              <span className="font-medium">{notification.childDetails.username}</span>
                              {" "}({notification.childDetails.name})
                              {notification.childDetails.parentEmail && (
                                <span className="text-slate-400"> • {notification.childDetails.parentEmail}</span>
                              )}
                            </>
                          ) : (
                            notification.username && (
                              <>
                                <User className="w-3 h-3 inline mr-1" />
                                <span className="font-medium">{notification.username}</span>
                              </>
                            )
                          )}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          <span className="mx-2">•</span>
                          {notification.count} attempts / {notification.limit} allowed in {notification.windowMinutes} min
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markRead({ notificationId: notification._id })}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Violations (24h)"
              value={securityOverview?.violations24h ?? 0}
              icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
              color="rose"
            />
            <StatCard
              title="Users Affected"
              value={securityOverview?.uniqueUsersAffected ?? 0}
              icon={<User className="w-5 h-5 text-amber-500" />}
              color="amber"
            />
            <StatCard
              title="Active Limits (1h)"
              value={securityOverview?.activeRateLimitEvents ?? 0}
              icon={<Shield className="w-5 h-5 text-blue-500" />}
              color="blue"
            />
            <StatCard
              title="Unread Alerts"
              value={securityOverview?.unreadNotifications ?? 0}
              icon={<Bell className="w-5 h-5 text-emerald-500" />}
              color="emerald"
            />
          </div>

          {/* Violations by Action */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Violations by Action (24h)</h3>
            {securityOverview?.violationsByAction && 
             Object.keys(securityOverview.violationsByAction).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(securityOverview.violationsByAction).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-slate-700">{ACTION_LABELS[action] ?? action}</span>
                    </div>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p>No violations in the last 24 hours</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Stats Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  color: "rose" | "amber" | "blue" | "emerald";
}) {
  const colorClasses = {
    rose: "bg-rose-50 border-rose-100",
    amber: "bg-amber-50 border-amber-100",
    blue: "bg-blue-50 border-blue-100",
    emerald: "bg-emerald-50 border-emerald-100",
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

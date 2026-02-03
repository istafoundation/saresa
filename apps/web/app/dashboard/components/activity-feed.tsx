"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { 
  Gamepad2, 
  Trophy, 
  Flame, 
  AlertTriangle,
  TrendingUp,
  Clock
} from "lucide-react";

interface Activity {
  id: string;
  childName: string;
  type: string;
  message: string;
  icon: string;
  timestamp: number;
  color: string;
}

// Helper to format relative time
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const iconMap = {
  game: Gamepad2,
  trophy: Trophy,
  flame: Flame,
  alert: AlertTriangle,
  trending: TrendingUp,
};

const colorMap = {
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  indigo: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  teal: "bg-teal-50 text-teal-600 border-teal-100",
};

export function ActivityFeed() {
  const activities = useQuery(api.parents.getRecentActivities);

  if (activities === undefined) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="text-slate-300" size={24} />
          </div>
          <p className="text-slate-500 text-sm">No recent activity yet</p>
          <p className="text-slate-400 text-xs mt-1">Activities will appear here as your children play</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">{activities.length} events</span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {activities.map((activity: Activity) => {
          const Icon = iconMap[activity.icon as keyof typeof iconMap] || Gamepad2;
          const colorClasses = colorMap[activity.color as keyof typeof colorMap] || colorMap.indigo;
          
          return (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors"
            >
              <div className={`p-2 rounded-lg border ${colorClasses}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 font-medium">
                  <span className="text-emerald-600">{activity.childName}</span>{' '}
                  {activity.message}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{getTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { 
  Trophy, 
  Flame, 
  Star, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff,
  User,
  Check,
  BarChart3,
  Clock,
  Gamepad2,
  Pencil,
  Zap,
  Settings
} from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";
import { EditChildModal } from "./edit-child-modal";

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
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

interface ChildProps {
  _id: Id<"children">;
  name: string;
  username: string;
  password?: string;
  role: string;
  group?: "A" | "B" | "C";
  xp: number;
  streak: number;
  level: number;
  hasPlayedToday: boolean;
  // New enhanced stats
  gamesPlayed: number;
  nextLevel: number;
  xpProgress: number;
  xpToNextLevel: number;
  lastActiveAt: number;
  lastLoginDate?: string;
  // Subscription status
  subscriptionStatus?: string;
  subscriptionPlanGroup?: "A" | "B" | "C";
  activatedTill?: number;
  isSubscriptionActive?: boolean;
}

export function ChildCard({ child }: { child: ChildProps }) {
  const [showCreds, setShowCreds] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const deleteChild = useMutation(api.parents.deleteChild);
  const regeneratePassword = useMutation(api.parents.regeneratePassword);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${child.name}? This cannot be undone.`)) {
      await deleteChild({ childId: child._id });
    }
  };

  const handleRegenerate = async () => {
    if (confirm(`Generate new password for ${child.name}? The old one will stop working.`)) {
      const newPassword = Math.random().toString(36).slice(-8);
      await regeneratePassword({ childId: child._id, newPassword });
    }
  };

  const groupLabel = child.group === "A" ? "Class 1-4" : child.group === "C" ? "Class 9-10" : "Class 5-8";
  const groupColor = child.group === "A" ? "emerald" : child.group === "C" ? "purple" : "blue";

  return (
    <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-100 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">
            {child.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {child.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                groupColor === "emerald" ? "bg-emerald-100 text-emerald-700" :
                groupColor === "purple" ? "bg-purple-100 text-purple-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                Group {child.group || "B"} ({groupLabel})
              </span>
            </div>
          </div>
        </div>
        {child.hasPlayedToday && (
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full border border-emerald-100 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Active Today
          </div>
        )}
      </div>

      {/* Stats Grid - 4 columns now */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-amber-500 mb-1"><Trophy size={16} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.level}</div>
          <div className="text-xs text-slate-500 font-medium">Level</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-emerald-500 mb-1"><Star size={16} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.xp}</div>
          <div className="text-xs text-slate-500 font-medium">XP</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-orange-500 mb-1"><Flame size={16} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.streak}</div>
          <div className="text-xs text-slate-500 font-medium">Streak</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-emerald-500 mb-1"><Gamepad2 size={16} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.gamesPlayed}</div>
          <div className="text-xs text-slate-500 font-medium">Games</div>
        </div>
      </div>

      {/* XP Progress to Next Level */}
      <div className="mb-4 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-600 font-medium">Progress to Level {child.nextLevel}</span>
          <span className="text-emerald-600 font-bold">{child.xpProgress}%</span>
        </div>
        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(child.xpProgress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">{child.xpToNextLevel} XP needed</p>
      </div>

      {/* Last Active */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 px-1">
        <Clock size={12} />
        <span>Last active: <span className="font-medium text-slate-700">{getTimeAgo(child.lastActiveAt)}</span></span>
      </div>

      <div className="space-y-3 mb-6">
        {/* Username Row */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-emerald-200 transition-colors">
          <div className="min-w-0">
            <label className="text-xs text-slate-500 block mb-0.5">Username</label>
            <div className="font-mono font-medium text-slate-900 text-sm truncate">{child.username}</div>
          </div>
          <button 
            onClick={() => copyToClipboard(child.username, 'username')}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            title="Copy Username"
          >
            {copiedField === 'username' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Password Row */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-emerald-200 transition-colors">
          <div className="min-w-0 flex-1">
            <label className="text-xs text-slate-500 block mb-0.5">Password</label>
            <div className="font-mono font-medium text-slate-900 text-sm flex items-center gap-2">
              <span>{showCreds ? child.password : "••••••••"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowCreds(!showCreds)}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            >
              {showCreds ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={() => child.password && copyToClipboard(child.password, 'password')}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Copy Password"
            >
              {copiedField === 'password' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
        <Link 
          href={`/dashboard/child/${child._id}`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
        >
          <BarChart3 size={14} />
          <span>View Stats</span>
        </Link>
        {child.isSubscriptionActive ? (
          <Link 
            href={`/dashboard/subscription/${child._id}/manage`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all active:scale-95"
          >
            <Settings size={14} />
            <span>Manage</span>
          </Link>
        ) : (
          <Link 
            href={`/dashboard/subscription/${child._id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 border border-transparent rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <Zap size={14} />
            <span>Activate</span>
          </Link>
        )}
        <button 
          onClick={() => setIsEditOpen(true)}
          className="flex-none p-2.5 text-emerald-500 bg-emerald-50 border border-transparent rounded-xl hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-95"
          title="Edit Child"
        >
          <Pencil size={14} />
        </button>
        <button 
          onClick={handleRegenerate}
          className="flex-none p-2.5 text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all active:scale-95"
          title="Reset Password"
        >
          <RefreshCw size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="flex-none p-2.5 text-rose-400 bg-rose-50 border border-transparent rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-95"
          title="Delete Account"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Edit Child Modal */}
      <EditChildModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        child={{
          _id: child._id,
          name: child.name,
          username: child.username,
          level: child.level,
          xp: child.xp,
        }}
      />
    </div>
  );
}

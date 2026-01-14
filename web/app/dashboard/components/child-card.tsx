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
  BarChart3
} from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ChildProps {
  _id: Id<"children">;
  name: string;
  username: string;
  password?: string;
  role: string;
  xp: number;
  streak: number;
  level: number;
  hasPlayedToday: boolean;
}

export function ChildCard({ child }: { child: ChildProps }) {
  const [showCreds, setShowCreds] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
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

  return (
    <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
            {child.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {child.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User size={14} />
              <span>{child.role}</span>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-amber-500 mb-1"><Trophy size={18} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.level}</div>
          <div className="text-xs text-slate-500 font-medium">Level</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-indigo-500 mb-1"><Star size={18} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.xp}</div>
          <div className="text-xs text-slate-500 font-medium">XP</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <div className="flex justify-center text-orange-500 mb-1"><Flame size={18} /></div>
          <div className="font-bold text-slate-900 text-lg">{child.streak}</div>
          <div className="text-xs text-slate-500 font-medium">Streak</div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {/* Username Row */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 transition-colors">
          <div className="min-w-0">
            <label className="text-xs text-slate-500 block mb-0.5">Username</label>
            <div className="font-mono font-medium text-slate-900 text-sm truncate">{child.username}</div>
          </div>
          <button 
            onClick={() => copyToClipboard(child.username, 'username')}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Copy Username"
          >
            {copiedField === 'username' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Password Row */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group-focus-within:border-indigo-200 transition-colors">
          <div className="min-w-0 flex-1">
            <label className="text-xs text-slate-500 block mb-0.5">Password</label>
            <div className="font-mono font-medium text-slate-900 text-sm flex items-center gap-2">
              <span>{showCreds ? child.password : "••••••••"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowCreds(!showCreds)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >
              {showCreds ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={() => child.password && copyToClipboard(child.password, 'password')}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Copy Password"
            >
              {copiedField === 'password' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
        <Link 
          href={`/dashboard/child/${child._id}`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          <BarChart3 size={14} />
          <span>View Stats</span>
        </Link>
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
    </div>
  );
}

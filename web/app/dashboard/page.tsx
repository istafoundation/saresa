"use client";

import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { ChildCard } from "./components/child-card";
import { AddChildForm } from "./components/add-child-form";
import { Users, Sparkles, TrendingUp, Gamepad2, Flame, Calendar, CheckCircle2 } from "lucide-react";
import { StatCard } from "../components/stats/StatCard";
import { ActivityFeed } from "./components/activity-feed";

export default function Dashboard() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const parentData = useQuery(api.parents.getMyParentData);
  const myChildren = useQuery(api.parents.getMyChildren);
  const getOrCreateParent = useMutation(api.parents.getOrCreateParent);
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Detect subscription success from redirect
  useEffect(() => {
    const subscribedChildId = searchParams.get("subscribed");
    if (subscribedChildId) {
      setShowSuccessToast(true);
      // Clear the URL params after showing toast
      router.replace("/dashboard", { scroll: false });
      // Hide toast after 5 seconds
      const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);
  
  // Create parent account if needed which syncs clerk user to convex
  useEffect(() => {
    if (user && parentData === null) {
      getOrCreateParent({
        email: user.primaryEmailAddress?.emailAddress!,
        name: user.fullName || "Parent",
      });
    }
  }, [user, parentData, getOrCreateParent]);

  // Calculate Aggregate Stats
  const totalChildren = myChildren?.length || 0;
  const activeToday = myChildren?.filter(c => c.hasPlayedToday).length || 0;
  const totalXP = myChildren?.reduce((acc, curr) => acc + (curr.xp || 0), 0) || 0;
  const totalStreak = myChildren?.reduce((acc, curr) => acc + (curr.streak || 0), 0) || 0;
  const totalGamesPlayed = myChildren?.reduce((acc, curr) => acc + (curr.gamesPlayed || 0), 0) || 0;
  const bestStreak = myChildren?.reduce((acc, curr) => Math.max(acc, curr.streak || 0), 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Success Toast for subscription completion */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm text-emerald-100">Subscription is now active</p>
            </div>
            <button 
              onClick={() => setShowSuccessToast(false)}
              className="ml-2 hover:bg-emerald-500 rounded p-1 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Quick Stats Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="text-emerald-100 mt-1 text-sm md:text-base">
                Here's how your little learners are doing today.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                <Users size={14} />
                <span>Today's Activity</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">
                {activeToday}<span className="text-lg text-emerald-200">/{totalChildren}</span>
              </p>
              <p className="text-emerald-200 text-xs mt-1">learners playing</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                <TrendingUp size={14} />
                <span>Total XP</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{totalXP.toLocaleString()}</p>
              <p className="text-emerald-200 text-xs mt-1">experience earned</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-medium mb-1">
                <Flame size={14} />
                <span>Best Streak</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{bestStreak}</p>
              <p className="text-emerald-200 text-xs mt-1">days in a row</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                <Gamepad2 size={14} />
                <span>Games Played</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{totalGamesPlayed.toLocaleString()}</p>
              <p className="text-emerald-200 text-xs mt-1">total sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Total Learners" 
          value={totalChildren} 
          icon={Users} 
          color="blue"
        />
        <StatCard 
          label="Total XP Earned" 
          value={totalXP.toLocaleString()} 
          icon={TrendingUp} 
          color="indigo"
        />
        <StatCard 
          label="Active Streaks" 
          value={totalStreak} 
          icon={Sparkles} 
          color="amber"
        />
        <StatCard 
          label="Games Played" 
          value={totalGamesPlayed.toLocaleString()} 
          icon={Gamepad2} 
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Child List */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-500" size={24} />
                Your Children
              </h2>
            </div>
            
            {!myChildren ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map(i => (
                  <div key={i} className="h-64 bg-white rounded-2xl shadow-sm border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : myChildren.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-slate-300" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No children added yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Add a child account to let them access games, track their progress, and start learning.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {myChildren.map(child => (
                  <ChildCard key={child._id} child={child} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Activity Feed + Add Child Form */}
        <div className="lg:col-span-1 space-y-6">
          <ActivityFeed />
          <div className="sticky top-8">
             <AddChildForm />
          </div>
        </div>
      </div>
    </div>
  );
}

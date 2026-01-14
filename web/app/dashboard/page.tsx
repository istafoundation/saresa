"use client";

import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { ChildCard } from "./components/child-card";
import { AddChildForm } from "./components/add-child-form";
import { Users, Sparkles, TrendingUp, Gamepad2 } from "lucide-react";
import { StatCard } from "../components/stats/StatCard";

export default function Dashboard() {
  const { user } = useUser();
  const parentData = useQuery(api.parents.getMyParentData);
  const myChildren = useQuery(api.parents.getMyChildren);
  const getOrCreateParent = useMutation(api.parents.getOrCreateParent);
  
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Here's how your little learners are doing today.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
          <Sparkles size={16} />
          <span>{activeToday} Active Today</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          trend={{ value: 12, label: "vs last week", positive: true }} 
        />
        <StatCard 
          label="Active Streaks" 
          value={totalStreak} 
          icon={Sparkles} 
          color="amber"
        />
        <StatCard 
          label="Games Played" 
          value="--" 
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
                <Users className="text-indigo-500" size={24} />
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

        {/* Add Child Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
             <AddChildForm />
          </div>
        </div>
      </div>
    </div>
  );
}

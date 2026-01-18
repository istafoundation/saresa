"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ArrowLeft, Trophy, Flame, Target, BookOpen, Gamepad2, Search, GraduationCap } from "lucide-react";
import { StatCard } from "../../../components/stats/StatCard";
import { SimpleBarChart, SimplePieChart } from "../../../components/stats/Charts";
import Link from "next/link";

// Group options with descriptive labels
const GROUP_OPTIONS = [
  { id: "A" as const, label: "Class 1-4", desc: "Sets 1, 3, 5", color: "emerald" },
  { id: "B" as const, label: "Class 5-8", desc: "Sets 1, 2, 3", color: "blue" },
  { id: "C" as const, label: "Class 9-10", desc: "Sets 1, 2, 4", color: "purple" },
];

// Read-only group display - group is now controlled by subscription plan
function GroupDisplay({ 
  currentGroup, 
  childName,
  isSubscribed
}: { 
  currentGroup: "A" | "B" | "C"; 
  childName: string;
  isSubscribed: boolean;
}) {
  const group = GROUP_OPTIONS.find(g => g.id === currentGroup) || GROUP_OPTIONS[1];
  
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-indigo-600" size={24} />
          <div>
            <h3 className="font-bold text-lg text-slate-900">Learning Level</h3>
            <p className="text-slate-500 text-sm">
              {childName}'s current class level
            </p>
          </div>
        </div>
        {!isSubscribed && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
            Activate to change
          </span>
        )}
      </div>
      
      {/* Current Group Display */}
      <div className={`p-4 rounded-xl border-2 ${
        group.color === "emerald" 
          ? "border-emerald-500 bg-emerald-50"
          : group.color === "blue"
          ? "border-blue-500 bg-blue-50"
          : "border-purple-500 bg-purple-50"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-bold text-lg ${
              group.color === "emerald" ? "text-emerald-700" 
              : group.color === "blue" ? "text-blue-700" 
              : "text-purple-700"
            }`}>
              {group.label}
            </div>
            <div className="text-sm text-slate-600">Group {group.id}</div>
          </div>
          <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-lg">
            Question Sets: {group.desc}
          </div>
        </div>
      </div>
      
      <p className="text-xs text-slate-400 mt-3 text-center">
        💡 Learning level is set by subscription plan. Change plan to update.
      </p>
    </div>
  );
}

export default function ChildStatsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as Id<"children">;
  
  const stats = useQuery(api.parents.getChildStats, { childId });

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (stats === null) {
     return (
        <div className="text-center py-20">
           <h2 className="text-2xl font-bold text-slate-800">Child Not Found</h2>
           <Link href="/dashboard" className="text-indigo-600 hover:underline mt-4 inline-block">Return to Dashboard</Link>
        </div>
     )
  }

  const { child } = stats;
  // Only destructure stats if they exist
  const detailedStats = stats.hasPlayed ? stats : null;


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              {child.name}
              <span className="text-sm font-medium px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                Level {detailedStats ? Math.floor((detailedStats.profile?.xp ?? 0) / 100) + 1 : 1}
              </span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-mono">@{child.username}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total XP</p>
            <p className="text-2xl font-bold text-emerald-600">
              {detailedStats ? (detailedStats.profile?.xp ?? 0).toLocaleString() : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Learning Level Group Display - read-only, controlled by subscription */}
      <GroupDisplay currentGroup={(child.group as "A" | "B" | "C") || "B"} childName={child.name} isSubscribed={true} />

      {!detailedStats ? (
        <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
           <Gamepad2 className="mx-auto text-slate-300 mb-4" size={48} />
           <h3 className="text-lg font-bold text-slate-900">No Gameplay Data Yet</h3>
           <p className="text-slate-500">Once {child.name} starts playing games, you'll see their stats here!</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
             <StatCard 
               label="Current Streak" 
               value={detailedStats.profile?.streak ?? 0} 
               icon={Flame} 
               color="amber"
             />
             <StatCard 
                label="English Insane Accuracy" 
                value={`${detailedStats.gkStats?.accuracy ?? 0}%`} 
                icon={Target} 
                color="emerald"
                trend={(detailedStats.gkStats?.accuracy ?? 0) > 80 ? { value: 0, label: "Great job!", positive: true } : undefined}
             />
             <StatCard 
               label="Words Found" 
               value={(detailedStats.wordFinderStats?.totalXPEarned ?? 0) / 10} 
               icon={Search} 
               color="blue" 
             />
             <StatCard 
               label="Artifacts" 
               value={detailedStats.collections?.artifacts ?? 0} 
               icon={Trophy} 
               color="amber"
             />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GK Stats */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="font-bold text-lg text-slate-900">English Insane</h3>
                   <p className="text-slate-500 text-xs">Practice session accuracy</p>
                 </div>
                 <div className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg text-sm">
                   {detailedStats.gkStats?.practiceTotal ?? 0} Questions
                 </div>
               </div>
               
               {(detailedStats.gkStats?.practiceTotal ?? 0) > 0 ? (
                 <div className="flex items-center justify-center">
                    <SimplePieChart data={[
                      { name: "Correct", value: detailedStats.gkStats?.practiceCorrect ?? 0, color: "#10b981" },
                      { name: "Incorrect", value: (detailedStats.gkStats?.practiceTotal ?? 0) - (detailedStats.gkStats?.practiceCorrect ?? 0), color: "#ef4444" },
                    ]} />
                 </div>
               ) : (
                 <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl">
                    No data yet
                 </div>
               )}
            </div>

            {/* Wordle Stats */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="font-bold text-lg text-slate-900">Wordle</h3>
                   <p className="text-slate-500 text-xs">Guess distribution</p>
                 </div>
                 <div className="flex gap-2">
                    <div className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-medium text-slate-600">
                      {detailedStats.wordleStats?.gamesPlayed ?? 0} Played
                    </div>
                    <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-xs font-bold">
                      {detailedStats.wordleStats?.maxStreak ?? 0} Max Streak
                    </div>
                 </div>
               </div>

               {(detailedStats.wordleStats?.gamesPlayed ?? 0) > 0 ? (
                 <SimpleBarChart data={(detailedStats.wordleStats?.wordleGuessDistribution || []).map((value: number, index: number) => ({
                    name: `${index + 1}`,
                    value,
                  }))} color="#f59e0b" />
               ) : (
                 <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl">
                    No data yet
                 </div>
               )}
            </div>
            
            {/* Gameplay Frequency (Word Finder Focus) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Word Finder Mastery</h3>
                        <p className="text-slate-500 text-xs">Difficulty level preference</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">E</div>
                             <div>
                                <h4 className="font-bold text-blue-900">Easy Mode</h4>
                                <p className="text-blue-600/80 text-xs">Standard Grid</p>
                             </div>
                          </div>
                          <span className="text-2xl font-bold text-blue-700">{detailedStats.wordFinderStats?.easyGamesPlayed ?? 0}</span>
                       </div>
                       
                       <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold">H</div>
                             <div>
                                <h4 className="font-bold text-purple-900">Hard Mode</h4>
                                <p className="text-purple-600/80 text-xs">Complex Grid</p>
                             </div>
                          </div>
                          <span className="text-2xl font-bold text-purple-700">{detailedStats.wordFinderStats?.hardGamesPlayed ?? 0}</span>
                       </div>
                    </div>
                    
                    <div className="h-[200px]">
                        <SimpleBarChart data={[
                            { name: "Easy", value: detailedStats.wordFinderStats?.easyGamesPlayed || 0 },
                            { name: "Hard", value: detailedStats.wordFinderStats?.hardGamesPlayed || 0 },
                          ]} color="#8b5cf6" />
                    </div>
                 </div>
            </div>
            
            {/* Grammar Detective Stats - Investigation Theme */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl shadow-sm border border-indigo-100">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl">🔍</div>
                     <div>
                        <h3 className="font-bold text-lg text-slate-900">Grammar Detective</h3>
                        <p className="text-slate-500 text-xs">Parts of speech investigations</p>
                     </div>
                  </div>
                  <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl font-bold">
                     {detailedStats.grammarDetectiveStats?.accuracy ?? 0}% Accuracy
                  </div>
               </div>
               
               {/* Progress Bar */}
               <div className="mb-6">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                     <span>Cases Solved</span>
                     <span>{detailedStats.grammarDetectiveStats?.correctAnswers ?? 0} / {detailedStats.grammarDetectiveStats?.questionsAnswered ?? 0}</span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                     <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ 
                           width: `${(detailedStats.grammarDetectiveStats?.questionsAnswered ?? 0) > 0 
                              ? Math.min((detailedStats.grammarDetectiveStats?.correctAnswers ?? 0) / (detailedStats.grammarDetectiveStats?.questionsAnswered ?? 0) * 100, 100)
                              : 0}%` 
                        }}
                     />
                  </div>
               </div>
               
               {/* Stats Badges */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                     <div className="text-3xl font-bold text-indigo-600">{detailedStats.grammarDetectiveStats?.questionsAnswered ?? 0}</div>
                     <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Investigated</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                     <div className="text-3xl font-bold text-emerald-600">{detailedStats.grammarDetectiveStats?.correctAnswers ?? 0}</div>
                     <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Solved</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                     <div className="text-3xl font-bold text-amber-600">{detailedStats.grammarDetectiveStats?.totalXPEarned ?? 0}</div>
                     <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">XP Earned</div>
                  </div>
               </div>
            </div>

            {/* Explorer India Stats */}
            <div className="bg-orange-50 p-6 rounded-3xl shadow-sm border border-orange-100">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl">🇮🇳</div>
                     <div>
                        <h3 className="font-bold text-lg text-slate-900">Explore India</h3>
                        <p className="text-slate-500 text-xs">Daily progress</p>
                     </div>
                  </div>
               </div>
               
               {/* Progress Bar */}
               <div className="mb-6">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                     <span>Regions Found Today</span>
                     <span>{detailedStats.explorerStats?.guessedTodayCount ?? 0} / {detailedStats.explorerStats?.totalRegions ?? 36}</span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                     <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500"
                        style={{ 
                           width: `${Math.min(((detailedStats.explorerStats?.guessedTodayCount ?? 0) / (detailedStats.explorerStats?.totalRegions ?? 36)) * 100, 100)}%` 
                        }}
                     />
                  </div>
               </div>

               <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl">
                   <span className="font-bold text-orange-600">Last Played:</span>
                   <span>{detailedStats.explorerStats?.lastPlayedDate ?? "Never"}</span>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

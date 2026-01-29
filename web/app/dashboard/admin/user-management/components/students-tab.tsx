"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Search, User, Gamepad2, BookOpen, Puzzle, Brain, TrendingUp } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

export function StudentsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<Id<"children"> | null>(null);

  // Only search when we have at least 2 characters
  const searchResults = useQuery(
    api.parents.adminSearchChildren,
    searchQuery.length >= 2 ? { searchQuery, limit: 10 } : "skip"
  );

  // Get stats for selected child
  const childStats = useQuery(
    api.parents.adminGetChildStats,
    selectedChildId ? { childId: selectedChildId } : "skip"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Student Lookup</h2>
        <p className="text-slate-600">Search for any student by username or name</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedChildId(null);
          }}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-900">
              {searchQuery.length < 2 
                ? "Enter at least 2 characters to search" 
                : `Results (${searchResults?.length || 0})`}
            </h2>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {searchResults?.map((child) => (
              <button
                key={child._id}
                onClick={() => setSelectedChildId(child._id)}
                className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                  selectedChildId === child._id ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{child.name}</p>
                    <p className="text-sm text-slate-500">@{child.username}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Parent: {child.parentName}</p>
                  </div>
                </div>
              </button>
            ))}

            {searchQuery.length >= 2 && searchResults?.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No students found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-900">
              {selectedChildId ? "Student Stats" : "Select a student"}
            </h2>
          </div>

          {!selectedChildId ? (
            <div className="p-8 text-center text-slate-500">
              <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Select a student from search results to view their stats</p>
            </div>
          ) : !childStats ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">
              Loading stats...
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900">{childStats.child.name}</h3>
                <p className="text-sm text-slate-500">@{childStats.child.username}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Parent: {childStats.parent.name} ({childStats.parent.email})
                </p>
              </div>

              {!childStats.hasPlayed ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg text-sm">
                  This student hasn't started playing yet.
                </div>
              ) : (
                <>
                  {/* XP & Streak */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                        <TrendingUp className="w-4 h-4" />
                        XP
                      </div>
                      <p className="text-2xl font-bold text-indigo-700">
                        {childStats.profile?.xp?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                        🔥 Streak
                      </div>
                      <p className="text-2xl font-bold text-amber-700">
                        {childStats.profile?.streak || 0} days
                      </p>
                    </div>
                  </div>

                  {/* Game Stats */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-700">Game Performance</h4>
                    
                    {/* Wordle */}
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="font-medium text-emerald-700">Wordle</p>
                        <p className="text-xs text-emerald-600">
                          {childStats.wordleStats?.gamesWon || 0}/{childStats.wordleStats?.gamesPlayed || 0} won · 
                          Best streak: {childStats.wordleStats?.maxStreak || 0}
                        </p>
                      </div>
                    </div>

                    {/* Word Finder */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Puzzle className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-700">Word Finder</p>
                        <p className="text-xs text-blue-600">
                          Easy: {childStats.wordFinderStats?.easyGamesPlayed || 0} · 
                          Hard: {childStats.wordFinderStats?.hardGamesPlayed || 0} · 
                          {childStats.wordFinderStats?.totalXPEarned || 0} XP
                        </p>
                      </div>
                    </div>

                    {/* English Insane */}
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="font-medium text-purple-700">English Insane</p>
                        <p className="text-xs text-purple-600">
                          {childStats.gkStats?.practiceCorrect || 0}/{childStats.gkStats?.practiceTotal || 0} correct · 
                          {childStats.gkStats?.accuracy || 0}% accuracy
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import {
  BookOpen,
  Puzzle,
  Brain,
  Search,
  Plus,
  Archive,
  RefreshCw,
  ChevronRight,
  Package,
  BarChart3,
  Upload,
} from "lucide-react";

export default function ContentManagementPage() {
  // Fetch content counts for each game
  const wordleContent = useQuery(api.content.getAllContent, { gameId: "wordle" });
  const wordFinderContent = useQuery(api.content.getAllContent, { gameId: "word-finder" });
  const englishInsaneContent = useQuery(api.content.getAllContent, { gameId: "english-insane" });
  const grammarDetectiveContent = useQuery(api.content.getAllContent, { gameId: "grammar-detective" });

  const games = [
    {
      id: "wordle",
      name: "Wordle",
      description: "5-letter word guessing game",
      icon: BookOpen,
      color: "emerald",
      href: "/dashboard/content/wordle",
      contentCount: wordleContent?.length ?? 0,
      activeCount: wordleContent?.filter((c) => c.status === "active").length ?? 0,
    },
    {
      id: "word-finder",
      name: "Word Finder",
      description: "Word sets (Easy) & Questions (Hard)",
      icon: Puzzle,
      color: "blue",
      href: "/dashboard/content/word-finder",
      contentCount: wordFinderContent?.length ?? 0,
      activeCount: wordFinderContent?.filter((c) => c.status === "active").length ?? 0,
    },
    {
      id: "english-insane",
      name: "English Insane",
      description: "English grammar questions",
      icon: Brain,
      color: "purple",
      href: "/dashboard/content/english-insane",
      contentCount: englishInsaneContent?.length ?? 0,
      activeCount: englishInsaneContent?.filter((c) => c.status === "active").length ?? 0,
    },
    {
      id: "grammar-detective",
      name: "Grammar Detective",
      description: "Parts of speech questions",
      icon: Search,
      color: "indigo",
      href: "/dashboard/content/grammar-detective",
      contentCount: grammarDetectiveContent?.length ?? 0,
      activeCount: grammarDetectiveContent?.filter((c) => c.status === "active").length ?? 0,
    },
  ];

  const totalContent =
    (wordleContent?.length ?? 0) +
    (wordFinderContent?.length ?? 0) +
    (englishInsaneContent?.length ?? 0) +
    (grammarDetectiveContent?.length ?? 0);

  const totalActive =
    (wordleContent?.filter((c) => c.status === "active").length ?? 0) +
    (wordFinderContent?.filter((c) => c.status === "active").length ?? 0) +
    (englishInsaneContent?.filter((c) => c.status === "active").length ?? 0) +
    (grammarDetectiveContent?.filter((c) => c.status === "active").length ?? 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Manager</h1>
          <p className="text-slate-600 mt-1">
            Add, edit, and manage game content over-the-air
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Content</p>
              <p className="text-2xl font-bold text-slate-900">{totalContent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-slate-900">{totalActive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Archived</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalContent - totalActive}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Games</p>
              <p className="text-2xl font-bold text-slate-900">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => {
          const Icon = game.icon;
          const bgColor =
            game.color === "emerald"
              ? "bg-emerald-500"
              : game.color === "blue"
              ? "bg-blue-500"
              : game.color === "indigo"
              ? "bg-indigo-500"
              : "bg-purple-500";
          const lightBg =
            game.color === "emerald"
              ? "bg-emerald-50"
              : game.color === "blue"
              ? "bg-blue-50"
              : game.color === "indigo"
              ? "bg-indigo-50"
              : "bg-purple-50";
          const textColor =
            game.color === "emerald"
              ? "text-emerald-600"
              : game.color === "blue"
              ? "text-blue-600"
              : game.color === "indigo"
              ? "text-indigo-600"
              : "text-purple-600";

          return (
            <Link
              key={game.id}
              href={game.href}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${lightBg} rounded-xl`}>
                  <Icon className={`w-6 h-6 ${textColor}`} />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {game.name}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{game.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-900">
                    {game.contentCount}
                  </span>
                  <span className="text-slate-500">total</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium text-slate-900">
                    {game.activeCount}
                  </span>
                  <span className="text-slate-500">active</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/content/wordle?action=add"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Plus className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Add Wordle Word</p>
              <p className="text-sm text-slate-500">New 5-letter word + hint</p>
            </div>
          </Link>

          <Link
            href="/dashboard/content/word-finder?action=add"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Add Word Set</p>
              <p className="text-sm text-slate-500">Theme + 5 words</p>
            </div>
          </Link>

          <Link
            href="/dashboard/content/english-insane?action=add"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Plus className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Add Question</p>
              <p className="text-sm text-slate-500">English Insane</p>
            </div>
          </Link>

          <Link
            href="/dashboard/content/grammar-detective?action=add"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Plus className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Grammar Detective</p>
              <p className="text-sm text-slate-500">Parts of speech</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Upload className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">
              Over-the-Air Updates
            </h3>
            <p className="text-sm text-emerald-700 mt-1">
              Changes made here will be instantly available to all users. No app
              store update required!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

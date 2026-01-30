"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Save, RefreshCw, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const settings = useQuery(api.settings.getGameSettings);
  const updateSettings = useMutation(api.settings.updateGameSettings);

  const [englishInsaneLimit, setEnglishInsaneLimit] = useState(1);
  const [wfEasyLimit, setWfEasyLimit] = useState(2);
  const [wfHardLimit, setWfHardLimit] = useState(1);
  const [lecLimit, setLecLimit] = useState(1);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setEnglishInsaneLimit(settings.englishInsaneDailyLimit ?? 1);
      setWfEasyLimit(settings.wordFinderEasyDailyLimit ?? 2);
      setWfHardLimit(settings.wordFinderHardDailyLimit ?? 1);
      setLecLimit(settings.letEmCookDailyLimit ?? 1);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateSettings({
        englishInsaneDailyLimit: englishInsaneLimit,
        wordFinderEasyDailyLimit: wfEasyLimit,
        wordFinderHardDailyLimit: wfHardLimit,
        letEmCookDailyLimit: lecLimit,
      });
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
      console.error(err);
    }
    setIsSaving(false);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-slate-100 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Game Settings</h1>
          <p className="text-slate-600">Configure global game limits and behavior</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">Daily Limits</h2>
          <p className="text-sm text-slate-500">
            Control how many times users can play specific game modes per day.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* English Insane */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pb-6 border-b border-slate-100">
            <div>
              <label className="block font-medium text-slate-900 mb-1">
                English Insane (Competitive)
              </label>
              <p className="text-sm text-slate-500">
                Max competitive attempts per day
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={englishInsaneLimit}
                  onChange={(e) => setEnglishInsaneLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-600 text-sm">attempts</span>
              </div>
            </div>
          </div>

          {/* Word Finder Easy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pb-6 border-b border-slate-100">
            <div>
              <label className="block font-medium text-slate-900 mb-1">
                Word Finder (Easy)
              </label>
              <p className="text-sm text-slate-500">
                Max easy mode attempts per day
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={wfEasyLimit}
                  onChange={(e) => setWfEasyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-600 text-sm">attempts</span>
              </div>
            </div>
          </div>

          {/* Word Finder Hard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pb-6 border-b border-slate-100">
            <div>
              <label className="block font-medium text-slate-900 mb-1">
                Word Finder (Hard)
              </label>
              <p className="text-sm text-slate-500">
                Max hard mode attempts per day
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={wfHardLimit}
                  onChange={(e) => setWfHardLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-600 text-sm">attempts</span>
              </div>
            </div>
          </div>

          {/* Let'em Cook */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <label className="block font-medium text-slate-900 mb-1">
                Let 'em Cook
              </label>
              <p className="text-sm text-slate-500">
                Max daily challenge attempts
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={lecLimit}
                  onChange={(e) => setLecLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-600 text-sm">attempts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {message ? (
                <div className={`text-sm px-3 py-1.5 rounded-md ${
                    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {message.text}
                </div>
            ) : <div></div>}
            
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm active:transform active:scale-95"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

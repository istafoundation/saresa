"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ShieldAlert, Smartphone, Save, RefreshCw, Clock } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";

export default function BlockedAppsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as Id<"children">;

  const childStats = useQuery(api.parents.getChildStats, { childId });
  const myChildren = useQuery(api.parents.getMyChildren);
  const updateBlockedApps = useMutation(api.parents.updateBlockedApps);

  const currentChild = myChildren?.find((c) => c._id === childId);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when data loads
  useEffect(() => {
    if (currentChild?.blockedApps) {
      setBlockedApps(currentChild.blockedApps);
    }
  }, [currentChild]);

  if (!currentChild) {
    return <div className="p-8">Loading child data...</div>;
  }

  const installedApps = currentChild.installedApps || [];
  
  // Filter apps by search query
  const filteredApps = installedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleApp = (packageName: string) => {
    setBlockedApps((prev) =>
      prev.includes(packageName)
        ? prev.filter((p) => p !== packageName)
        : [...prev, packageName]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBlockedApps({
        childId,
        blockedApps,
      });
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return "Never synced";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-red-500" />
            Manage Blocked Apps
          </h1>
          <p className="text-slate-500">
            Control which apps {currentChild.name} can access on their device.
          </p>
        </div>
      </div>

      {installedApps.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Apps Found
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            We haven't received a list of installed apps from {currentChild.name}
            's device yet. Please open the app on their device to sync the list.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
            {/* Search bar */}
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Stats and actions row */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">
                    {filteredApps.length} of {installedApps.length} Apps
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${
                    currentChild.lastAppSync 
                      ? (Date.now() - currentChild.lastAppSync < 60 * 60 * 1000) 
                        ? "text-emerald-600" // Less than 1 hour ago - green
                        : (Date.now() - currentChild.lastAppSync < 24 * 60 * 60 * 1000)
                          ? "text-amber-600" // Less than 24 hours ago - amber
                          : "text-red-500" // More than 24 hours ago - red
                      : "text-slate-400"
                  }`}>
                    <Clock size={12} />
                    Last sync: {formatLastSync(currentChild.lastAppSync)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {blockedApps.length} blocked
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw size={10} />
                App list syncs automatically when {currentChild.name} opens the app on their device
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredApps
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((app) => {
                const isBlocked = blockedApps.includes(app.packageName);
                return (
                  <div
                    key={app.packageName}
                    className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                      isBlocked ? "bg-red-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isBlocked
                            ? "bg-red-100 text-red-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {app.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {app.packageName}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isBlocked}
                        onChange={() => toggleApp(app.packageName)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

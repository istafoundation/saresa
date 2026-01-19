"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { X, User, Save, Loader2, Check } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface EditChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: {
    _id: Id<"children">;
    name: string;
    username: string;
    level: number;
    xp: number;
  };
}

export function EditChildModal({ isOpen, onClose, child }: EditChildModalProps) {
  const [name, setName] = useState(child.name);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const updateChildName = useMutation(api.parents.updateChildName);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(child.name);
      setError("");
      setSuccess(false);
    }
  }, [isOpen, child.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await updateChildName({
        childId: child._id,
        name: name.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      // Parse Convex errors and provide user-friendly messages
      const errorMessage = err instanceof Error ? err.message : "";
      
      if (errorMessage.includes("Not authenticated")) {
        setError("Your session has expired. Please refresh the page.");
      } else if (errorMessage.includes("Child not found")) {
        setError("Could not find this account. Please refresh and try again.");
      } else if (errorMessage.includes("Name must be")) {
        setError("Please enter a valid display name.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Edit Child</h2>
              <p className="text-xs text-slate-500">@{child.username}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Child Info Summary */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl">
              {child.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900">{child.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>Level {child.level}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{child.xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">
              Display Name
            </label>
            <input
              type="text"
              required
              minLength={1}
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400 text-lg"
              placeholder="Enter display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1.5 ml-1">
              This is the name shown on the dashboard and in the app.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium animate-in fade-in">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium flex items-center gap-2 animate-in fade-in">
              <Check size={16} />
              Name updated successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || name.trim() === child.name}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white bg-emerald-600 hover:bg-emerald-700 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

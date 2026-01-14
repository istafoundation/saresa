"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { UserPlus, AlertCircle, Loader2 } from "lucide-react";

export function AddChildForm() {
  const addChild = useMutation(api.parents.addChild);
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.username.length < 4) {
      setError("Username must be at least 4 characters");
      setLoading(false);
      return;
    }

    try {
      await addChild({
        name: formData.name,
        username: formData.username,
        password: formData.password,
      });
      setFormData({ name: "", username: "", password: "", confirmPassword: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to add child");
      } else {
        setError("Failed to add child");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <UserPlus size={20} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Add Child</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Display Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400"
            placeholder="e.g. Arjun"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Username</label>
          <input
            type="text"
            required
            minLength={4}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400 font-mono text-sm"
            placeholder="e.g. arjun_cool"
            value={formData.username}
            onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
          />
          <p className="text-[10px] text-slate-400 mt-1 ml-1">Must be unique, 4+ chars</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400"
              placeholder="Min 6 chars"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Confirm</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400"
              placeholder="Re-enter"
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
            <UserPlus size={18} className="shrink-0 mt-0.5" />
            <p className="font-medium">Child account created successfully!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

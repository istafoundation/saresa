"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function UserProfileMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isLoaded || !user) {
    return (
      <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
    );
  }

  const handleSignOut = async () => {
    await signOut(() => router.push("/"));
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
      >
        <div className="h-9 w-9 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border border-slate-200">
          <img 
            src={user.imageUrl} 
            alt={user.fullName || "User"} 
            className="h-full w-full object-cover"
          />
        </div>
        <div className="hidden md:block text-left mr-1">
          <p className="text-sm font-semibold text-slate-700 leading-none">
            {user.firstName || "Parent"}
          </p>
        </div>
        <ChevronDown size={14} className="text-slate-400 hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 z-50">
          <div className="p-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">
              {user.fullName}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Account
            </div>
            {/* 
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <User size={16} />
              Profile Settings
            </button>
            */}
            
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

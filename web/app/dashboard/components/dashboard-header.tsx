"use client";

import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Parent Dashboard</h1>
          <p className="text-slate-500 text-sm sm:text-base">Manage your family's Saresa accounts</p>
        </div>
      </div>
      <div className="self-end sm:self-center">
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "h-10 w-10 ring-2 ring-indigo-100",
            }
          }}
          afterSignOutUrl="/" 
        />
      </div>
    </header>
  );
}

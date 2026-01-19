"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Trophy, Settings, Menu, X, Rocket, Package, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserProfileMenu } from "./components/user-profile-menu";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const isAdmin = useQuery(api.parents.isAdmin);
  
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  // Build navigation based on role
  const navigation = useMemo(() => {
    const baseNav = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    ];

    if (isAdmin) {
      baseNav.push(
        { name: "Content", href: "/dashboard/content", icon: Package },
        { name: "Students", href: "/dashboard/admin/students", icon: Search }
      );
    }

    return baseNav;
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Header (Unified for Mobile & Desktop) */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
               <div className="bg-emerald-600 p-2 rounded-xl text-white">
                 <Rocket size={20} />
               </div>
               <span className="font-bold text-xl text-slate-900 tracking-tight hidden sm:block">Saresa</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1 absolute left-1/2 -translate-x-1/2">
               {navigation.map((item) => {
                 const isActive = pathname === item.href;
                 return (
                   <Link
                     key={item.name}
                     href={item.href}
                     className={cn(
                       "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                       isActive
                         ? "bg-emerald-50 text-emerald-700"
                         : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                     )}
                   >
                     <item.icon size={16} />
                     {item.name}
                   </Link>
                 );
               })}
            </nav>

            {/* User & Mobile Menu */}
            <div className="flex items-center gap-2">
               <UserProfileMenu />

              <button 
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-4 pb-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 font-medium text-lg",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={24} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

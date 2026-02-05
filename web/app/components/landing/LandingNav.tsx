"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, LogIn, Sparkles } from "lucide-react";

interface LandingNavProps {
  variant?: "light" | "dark" | "glass";
  logoColor?: string;
  textColor?: string;
  buttonBg?: string;
  buttonHoverBg?: string;
}

export function LandingNav({
  variant = "light",
  logoColor = "#3b82f6",
  textColor = "#1e293b",
  buttonBg = "#3b82f6",
  buttonHoverBg = "#2563eb",
}: LandingNavProps) {
  const { isSignedIn, isLoaded } = useUser();

  const variantStyles = {
    light: {
      bg: "bg-white/80 backdrop-blur-lg border-b border-slate-100",
      text: "text-slate-700",
      logo: "text-blue-600",
    },
    dark: {
      bg: "bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50",
      text: "text-slate-200",
      logo: "text-blue-400",
    },
    glass: {
      bg: "bg-white/10 backdrop-blur-xl border-b border-white/20",
      text: "text-white",
      logo: "text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${styles.bg}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform"
              style={{ backgroundColor: logoColor }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span
              className={`text-xl font-bold tracking-tight ${styles.logo}`}
              style={{ color: logoColor }}
            >
              ISTA Kids
            </span>
          </Link>

          {/* Auth Button */}
          <div className="flex items-center gap-4">
            {!isLoaded ? (
              <div className="w-32 h-10 bg-slate-200/50 rounded-xl animate-pulse" />
            ) : isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                style={{ backgroundColor: buttonBg }}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all cursor-pointer"
                  style={{ backgroundColor: buttonBg }}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

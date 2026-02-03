"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function Home() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8 text-center">
      <div className="max-w-xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            Saresa Parent <span className="text-blue-600">Portal</span>
          </h1>
          <p className="text-xl text-gray-600">
            Create and manage child accounts for your Saresa learning adventure. Set unique usernames, monitor progress, and keep them safe.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <SignInButton mode="modal">
            <button className="bg-white text-blue-600 border-2 border-blue-600 font-semibold py-3 px-8 rounded-full hover:bg-blue-50 transition-colors shadow-sm text-lg">
              Sign In
            </button>
          </SignInButton>
          
          <SignUpButton mode="modal">
            <button className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl text-lg">
              Get Started
            </button>
          </SignUpButton>
        </div>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl">
        <Feature 
          title="Safe Login" 
          desc="Children log in with a simple username and password you create." 
        />
        <Feature 
          title="Full Control" 
          desc="View credentials, reset passwords, and manage accounts easily." 
        />
        <Feature 
          title="Progress Tracking" 
          desc="See learning stats and game progress in real-time." 
        />
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

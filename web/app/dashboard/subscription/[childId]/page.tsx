"use client";

import { useQuery, useAction } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { ArrowLeft, Zap, Check, Loader2 } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    group: "A" as const,
    name: "Group A",
    description: "Class 1-4",
    price: 89,
    color: "emerald",
    features: ["Age-appropriate content", "Basic learning games", "Progress tracking"],
  },
  {
    group: "B" as const,
    name: "Group B", 
    description: "Class 5-8",
    price: 129,
    color: "blue",
    features: ["Advanced vocabulary", "Grammar challenges", "Competitive modes"],
  },
  {
    group: "C" as const,
    name: "Group C",
    description: "Class 9-10",
    price: 189,
    color: "purple",
    features: ["Exam-level content", "All game modes", "Priority support"],
  },
];

export default function SubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as Id<"children">;
  
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "C" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const myChildren = useQuery(api.parents.getMyChildren);
  const createSubscription = useAction(api.subscriptionActions.createSubscription);
  
  const child = myChildren?.find(c => c._id === childId);
  
  const handleSubscribe = async () => {
    if (!selectedPlan || !childId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createSubscription({
        childId,
        planGroup: selectedPlan,
      });
      
      // Redirect to Razorpay short URL for payment
      if (result.shortUrl) {
        window.location.href = result.shortUrl;
      }
    } catch (err) {
      console.error("Failed to create subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to create subscription");
      setIsLoading(false);
    }
  };
  
  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activate Account</h1>
          <p className="text-slate-500">Choose a plan for {child.name}</p>
        </div>
      </div>
      
      {/* Current Group Info */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">
            {child.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{child.name}</h3>
            <p className="text-sm text-slate-500">
              Currently in Group {child.group || "B"} ({child.group === "A" ? "Class 1-4" : child.group === "C" ? "Class 9-10" : "Class 5-8"})
            </p>
          </div>
        </div>
      </div>
      
      {/* Plan Selection */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.group;
          const isRecommended = plan.group === (child.group || "B");
          
          return (
            <button
              key={plan.group}
              onClick={() => setSelectedPlan(plan.group)}
              className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                  Recommended
                </span>
              )}
              
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                plan.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                plan.color === "blue" ? "bg-blue-100 text-blue-700" :
                "bg-purple-100 text-purple-700"
              }`}>
                {plan.name}
              </div>
              
              <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
              
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">₹{plan.price}</span>
                <span className="text-slate-500">/month</span>
              </div>
              
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Subscribe Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubscribe}
          disabled={!selectedPlan || isLoading}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all ${
            selectedPlan && !isLoading
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 active:scale-95"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Subscribe for ₹{selectedPlan ? PLANS.find(p => p.group === selectedPlan)?.price : "—"}/month
            </>
          )}
        </button>
      </div>
      
      {/* Info */}
      <p className="text-center text-sm text-slate-500">
        You will be redirected to Razorpay to complete the payment. 
        Subscription renews monthly until cancelled.
      </p>
    </div>
  );
}

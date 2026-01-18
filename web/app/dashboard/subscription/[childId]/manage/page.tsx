"use client";

import { useQuery, useAction } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { ArrowLeft, Settings, CreditCard, Calendar, AlertTriangle, Check, Loader2, History, Zap } from "lucide-react";
import Link from "next/link";

const PLANS = [
  { group: "A" as const, name: "Group A", description: "Class 1-4", price: 89 },
  { group: "B" as const, name: "Group B", description: "Class 5-8", price: 129 },
  { group: "C" as const, name: "Group C", description: "Class 9-10", price: 189 },
];

function formatDate(timestamp?: number): string {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export default function ManageSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as Id<"children">;
  
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<"A" | "B" | "C" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const myChildren = useQuery(api.parents.getMyChildren);
  const paymentHistory = useQuery(api.subscriptions.getPaymentHistory, { childId });
  const changePlan = useAction(api.subscriptionActions.changePlan);
  const cancelSubscription = useAction(api.subscriptionActions.cancelSubscription);
  
  const child = myChildren?.find(c => c._id === childId);
  
  const handleChangePlan = async () => {
    if (!selectedNewPlan || !childId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await changePlan({
        childId,
        newPlanGroup: selectedNewPlan,
      });
      
      // Redirect to Razorpay for new subscription payment
      if (result.shortUrl) {
        window.location.href = result.shortUrl;
      }
    } catch (err) {
      console.error("Failed to change plan:", err);
      setError(err instanceof Error ? err.message : "Failed to change plan");
      setIsLoading(false);
    }
  };
  
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this subscription? The child will lose access after the current billing period.")) {
      return;
    }
    
    setIsCancelling(true);
    setError(null);
    
    try {
      await cancelSubscription({ childId });
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
      setIsCancelling(false);
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
  
  const currentPlan = PLANS.find(p => p.group === child.subscriptionPlanGroup);
  
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Subscription</h1>
          <p className="text-slate-500">{child.name}'s subscription</p>
        </div>
      </div>
      
      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold mb-2">{currentPlan?.name || "Unknown"}</h2>
            <p className="text-emerald-100">{currentPlan?.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">₹{currentPlan?.price || 0}</p>
            <p className="text-emerald-100 text-sm">/month</p>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-200" />
            <span>Activated till: <strong>{formatDate(child.activatedTill)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span className="capitalize">{child.subscriptionStatus}</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowChangePlan(!showChangePlan)}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Change Plan</h3>
            <p className="text-sm text-slate-500">Switch to a different group</p>
          </div>
        </button>
        
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all text-left"
        >
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
            {isCancelling ? (
              <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Cancel Subscription</h3>
            <p className="text-sm text-slate-500">Stop recurring payments</p>
          </div>
        </button>
      </div>
      
      {/* Change Plan Section */}
      {showChangePlan && (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Changing plan will cancel your current subscription immediately and start a new one.</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {PLANS.filter(p => p.group !== child.subscriptionPlanGroup).map((plan) => (
              <button
                key={plan.group}
                onClick={() => setSelectedNewPlan(plan.group)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedNewPlan === plan.group
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                <p className="text-sm text-slate-500">{plan.description}</p>
                <p className="text-lg font-bold text-emerald-600 mt-2">₹{plan.price}/mo</p>
              </button>
            ))}
          </div>
          
          <button
            onClick={handleChangePlan}
            disabled={!selectedNewPlan || isLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              selectedNewPlan && !isLoading
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Change to {selectedNewPlan ? PLANS.find(p => p.group === selectedNewPlan)?.name : "..."}
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Payment History</h3>
        </div>
        
        {!paymentHistory || paymentHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No payments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paymentHistory.map((payment) => (
              <div key={payment._id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{formatAmount(payment.amount)}</p>
                  <p className="text-sm text-slate-500">{formatDate(payment.createdAt)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  payment.status === "captured" 
                    ? "bg-emerald-100 text-emerald-700"
                    : payment.status === "failed"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700"
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

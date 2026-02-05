"use client";

import { useQuery, useAction } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { ArrowLeft, CreditCard, Calendar, AlertTriangle, Check, Loader2, History } from "lucide-react";
import Link from "next/link";

// Single plan pricing
const PLAN_PRICE = 351;

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
  
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const myChildren = useQuery(api.parents.getMyChildren);
  const paymentHistory = useQuery(api.subscriptions.getPaymentHistory, { childId });
  const cancelSubscription = useAction(api.subscriptionActions.cancelSubscription);
  
  const child = myChildren?.find(c => c._id === childId);
  
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
      // Parse errors and provide user-friendly messages
      const errorMessage = err instanceof Error ? err.message : "";
      
      if (errorMessage.includes("No active subscription")) {
        setError("No active subscription to cancel.");
      } else if (errorMessage.includes("Child not found")) {
        setError("Could not find this account. Please refresh and try again.");
      } else if (errorMessage.includes("already cancelled")) {
        setError("This subscription has already been cancelled.");
      } else {
        setError("Unable to cancel subscription. Please try again later.");
      }
      setIsCancelling(false);
    }
  };
  
  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }
  
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
      <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold mb-1">ISTA Kids</h2>
            <p className="text-emerald-200 text-sm font-semibold">Monthly Subscription</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">₹{PLAN_PRICE}</p>
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
      
      {/* Cancel Subscription Action */}
      <div>
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all text-left w-full md:w-auto"
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

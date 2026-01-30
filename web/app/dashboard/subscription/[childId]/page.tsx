"use client";

import { useQuery, useAction } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { ArrowLeft, Zap, Check, Loader2, Star } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

// Razorpay type declarations
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Single plan details
const PLAN = {
  name: "ISTA English",
  price: 351,
  discountCode: "ISTA51",
  discountAmount: 51,
  offerId: "offer_S9ySg0lMzkgUNP",
  features: [
    "Full access to all learning content",
    "Comprehensive English curriculum",
    "Interactive games & exercises",
    "Progress tracking & reports",
    "Certificate of completion"
  ],
};

export default function SubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as Id<"children">;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  
  const myChildren = useQuery(api.parents.getMyChildren);
  const createSubscription = useAction(api.subscriptionActions.createSubscription);
  
  const child = myChildren?.find(c => c._id === childId);
  
  const handleSubscribe = async () => {
    if (!childId || !razorpayLoaded) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createSubscription({
        childId,
        // Pass offerId if coupon is applied to lock in the discount on backend
        offerId: isCouponApplied ? PLAN.offerId : undefined,
      });
      
      // Open Razorpay Checkout instead of redirecting
      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: result.subscriptionId,
        name: "Saresa Learning",
        description: `${PLAN.name} Monthly Subscription`,
        handler: function(response: any) {
          // Payment successful - redirect to dashboard
          console.log("Payment successful:", response);
          router.push(`/dashboard?subscribed=${childId}&payment_id=${response.razorpay_payment_id}`);
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
          },
          escape: true,
          backdropclose: false,
        },
        prefill: {
          name: child?.name || "",
        },
        theme: {
          color: "#10B981",
        },
        notes: {
          note_to_user: `Use code ${PLAN.discountCode} for ₹${PLAN.discountAmount} off!`
        }
      };

      
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function(response: any) {
        console.error("Payment failed:", response.error);
        setError(response.error.description || "Payment failed. Please try again.");
        setIsLoading(false);
      });
      
      razorpay.open();
    } catch (err) {
      console.error("Failed to create subscription:", err);
      // Parse errors and provide user-friendly messages
      const errorMessage = err instanceof Error ? err.message : "";
      
      if (errorMessage.includes("already has an active subscription")) {
        setError("This child already has an active subscription.");
      } else if (errorMessage.includes("Child not found")) {
        setError("Could not find this account. Please go back and try again.");
      } else if (errorMessage.includes("Not authenticated")) {
        setError("Your session has expired. Please refresh the page and sign in again.");
      } else {
        setError("Unable to create subscription. Please try again later.");
      }
      setIsLoading(false);
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
    <>
      {/* Load Razorpay Checkout Script */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />
      
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
            <p className="text-slate-500">Subscription for {child.name}</p>
          </div>
        </div>
        
        {/* Single Plan Card */}
        <div className="relative bg-white rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-xl max-w-lg mx-auto">
          {/* Header Banner */}
          <div className="bg-linear-to-r from-emerald-500 to-emerald-600 p-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-1">{PLAN.name}</h2>
            <p className="text-emerald-100 font-medium">Complete Access Plan</p>
          </div>
          
          <div className="p-8">
            {/* Price Section */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    {isCouponApplied ? (
                      <>
                        <span className="text-2xl text-slate-400 line-through">₹{PLAN.price}</span>
                        <span className="text-4xl font-bold text-emerald-600">₹{PLAN.price - PLAN.discountAmount}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-slate-900">₹{PLAN.price}</span>
                    )}
                    <span className="text-slate-500 font-medium">/month</span>
                </div>
                
                {/* Discount Banner */}
                <div className="inline-block bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 mt-2">
                    <p className="text-amber-800 text-sm font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        Use code <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 select-all">{PLAN.discountCode}</span> for ₹{PLAN.discountAmount} OFF!
                    </p>
                </div>
            </div>
            
            {/* Features List */}
            <ul className="space-y-4 mb-8">
              {PLAN.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 bg-emerald-100 rounded-full p-1 shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-rose-700 text-sm flex items-start gap-2">
                <div className="mt-0.5 shrink-0">⚠️</div>
                <p>{error}</p>
              </div>
            )}
            
            {/* Subscribe Button */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter Coupon Code"
                    className={`w-full px-4 py-3 rounded-xl border-2 ${couponError ? "border-rose-300 focus:border-rose-500" : isCouponApplied ? "border-emerald-500 bg-emerald-50" : "border-slate-200 focus:border-emerald-500"} focus:outline-hidden text-lg uppercase placeholder:normal-case transition-colors`}
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                      setIsCouponApplied(false);
                    }}
                    disabled={isCouponApplied}
                  />
                  {isCouponApplied && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 font-medium text-sm">
                      <Check className="w-4 h-4" /> Applied
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (couponCode === PLAN.discountCode) {
                      setIsCouponApplied(true);
                      setCouponError(null);
                    } else {
                      setCouponError("Invalid Coupon Code");
                      setIsCouponApplied(false);
                    }
                  }}
                  disabled={isCouponApplied || !couponCode}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                    isCouponApplied 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  Apply
                </button>
              </div>
              {couponError && (
                 <p className="text-rose-500 text-sm ml-1 -mt-2">{couponError}</p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={isLoading || !razorpayLoaded}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${
                  !isLoading && razorpayLoaded
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : !razorpayLoaded ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading Payment...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Subscribe Now
                  </>
                )}
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-4">
              Secure payment via Razorpay. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

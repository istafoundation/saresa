"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { 
  Ticket, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Trash2,
  Copy,
  Calendar,
  Users
} from "lucide-react";
import { format } from "date-fns";

export default function CouponsPage() {
  const coupons = useQuery(api.coupons.getCoupons);
  const createCoupon = useAction(api.couponActions.createCoupon);
  const toggleStatus = useMutation(api.coupons.toggleCouponStatus);
  
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    razorpayOfferId: "",
    discountType: "flat" as "flat" | "percentage",
    discountAmount: 300, // Default 300 INR for display
    description: "",
    maxTotalUses: ""
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createCoupon({
        code: formData.code.toUpperCase(),
        razorpayOfferId: formData.razorpayOfferId || undefined,
        discountType: formData.discountType,
        discountAmount: formData.discountType === 'flat' 
          ? Number(formData.discountAmount) * 100 // Convert to paise
          : Number(formData.discountAmount), // Keep as percentage
        description: formData.description,
        maxTotalUses: formData.maxTotalUses ? Number(formData.maxTotalUses) : undefined,
      });
      setIsCreating(false);
      setFormData({
        code: "",
        razorpayOfferId: "",
        discountType: "flat",
        discountAmount: 300,
        description: "",
        maxTotalUses: ""
      });
    } catch (err: any) {
      setError(err.message || "Failed to create coupon");
    }
  };

  if (coupons === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Ticket className="text-emerald-600" />
            Coupon Management
          </h1>
          <p className="text-slate-500 mt-1">
            Create and manage discount codes for subscriptions
          </p>
        </div>
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Coupon
        </button>
      </div>

      {/* Create Modal/Form Area */}
      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold mb-4">New Coupon</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg uppercase"
                  placeholder="e.g. SUMMER50"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount Amount (in ₹)</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.discountAmount}
                  onChange={e => setFormData({...formData, discountAmount: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses (Optional)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Unlimited"
                  value={formData.maxTotalUses}
                  onChange={e => setFormData({...formData, maxTotalUses: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Razorpay Offer ID (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder="offer_xxxxxxxxxx"
                  value={formData.razorpayOfferId}
                  onChange={e => setFormData({...formData, razorpayOfferId: e.target.value})}
                />
                <p className="text-xs text-slate-400 mt-1">Create offer in Razorpay Dashboard first, then paste the ID here</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Internal note or user facing description"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {error && <p className="text-rose-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Code</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Discount</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Usage</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Created</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No coupons found. Create your first one!
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {coupon.code}
                        </span>
                        {coupon.razorpayOfferId && (
                           <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Razorpay Offer Linked">
                             Linked
                           </span>
                        )}
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-slate-400 mt-1">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-emerald-600">
                        {coupon.discountType === "flat" 
                          ? `₹${coupon.discountAmount / 100} OFF`
                          : `${coupon.discountAmount}% OFF`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3 h-3" />
                        <span>{coupon.usageCount}</span>
                        {coupon.maxTotalUses && (
                            <span className="text-slate-400">/ {coupon.maxTotalUses}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(coupon.createdAt, "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus({ id: coupon._id })}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title={coupon.isActive ? "Deactivate" : "Activate"}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

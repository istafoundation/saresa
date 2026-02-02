// HTTP Routes for Razorpay Webhooks
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Helper function to verify webhook signature using Web Crypto API
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  
  // Timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

// Razorpay Webhook Handler
http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      const signature = request.headers.get("x-razorpay-signature");
      
      // Verify webhook signature
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }
      
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response("Missing signature", { status: 401 });
      }
      
      // Verify signature using Web Crypto API
      const isValid = await verifySignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
      
      // Parse webhook payload
      const payload = JSON.parse(body);
      const event = payload.event;
      const subscriptionData = payload.payload?.subscription?.entity;
      const paymentData = payload.payload?.payment?.entity;
      
      console.log("Received Razorpay webhook:", event);
      
      if (!subscriptionData) {
        console.log("No subscription data in webhook");
        return new Response("OK", { status: 200 });
      }
      
      // Handle different subscription events
      switch (event) {
        case "subscription.authenticated":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "authenticated",
          });
          break;
          
        case "subscription.activated":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "active",
            currentPeriodStart: subscriptionData.current_start ? subscriptionData.current_start * 1000 : undefined,
            currentPeriodEnd: subscriptionData.current_end ? subscriptionData.current_end * 1000 : undefined,
          });
          break;
          
        case "subscription.charged":
          // Update subscription status and period
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "active",
            currentPeriodStart: subscriptionData.current_start ? subscriptionData.current_start * 1000 : undefined,
            currentPeriodEnd: subscriptionData.current_end ? subscriptionData.current_end * 1000 : undefined,
          });
          
          // Record payment
          if (paymentData) {
            await ctx.runMutation(internal.subscriptions.recordPayment, {
              razorpaySubscriptionId: subscriptionData.id,
              razorpayPaymentId: paymentData.id,
              razorpayInvoiceId: paymentData.invoice_id,
              amount: paymentData.amount,
              status: "captured",
            });
          }
          break;
          
        case "subscription.pending":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "pending",
          });
          break;
          
        case "subscription.halted":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "halted",
          });
          break;
          
        case "subscription.cancelled":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "cancelled",
          });
          break;
          
        case "subscription.completed":
          await ctx.runMutation(internal.subscriptions.updateSubscriptionByRazorpayId, {
            razorpaySubscriptionId: subscriptionData.id,
            status: "completed",
          });
          break;
          
        case "payment.failed":
          if (paymentData && subscriptionData) {
            await ctx.runMutation(internal.subscriptions.recordPayment, {
              razorpaySubscriptionId: subscriptionData.id,
              razorpayPaymentId: paymentData.id,
              amount: paymentData.amount,
              status: "failed",
            });
          }
          break;
          
        default:
          console.log("Unhandled webhook event:", event);
      }
      
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http;

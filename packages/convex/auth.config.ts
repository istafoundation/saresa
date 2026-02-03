// NOTE: Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard > Settings > Environment Variables
// Value should be your Clerk instance domain, e.g., "your-app.clerk.accounts.dev"

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

// Convex Client Provider for Mobile App
// Uses ChildAuthProvider for session-based auth (no Clerk)

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ChildAuthProvider } from "../utils/childAuth";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ChildAuthProvider>
        {children}
      </ChildAuthProvider>
    </ConvexProvider>
  );
}

// Export the convex client for direct access if needed
export { convex };

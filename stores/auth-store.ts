import { create } from 'zustand';

interface AuthState {
  isSignedIn: boolean;
  email: string | null;
  name: string | null;
  clerkId: string | null;
  
  // Actions
  setAuth: (user: { email: string; name: string; clerkId: string } | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  email: null,
  name: null,
  clerkId: null,
  
  setAuth: (user) => {
    if (user) {
      set({ 
        isSignedIn: true, 
        email: user.email, 
        name: user.name, 
        clerkId: user.clerkId 
      });
    } else {
      set({ 
        isSignedIn: false, 
        email: null, 
        name: null, 
        clerkId: null 
      });
    }
  },
  
  signOut: () => set({ 
    isSignedIn: false, 
    email: null, 
    name: null, 
    clerkId: null 
  }),
}));

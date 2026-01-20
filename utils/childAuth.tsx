// Child Authentication Context for Mobile App
// Replaces Clerk auth - uses username/password with Convex sessions

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const SESSION_TOKEN_KEY = 'child_session_token';

interface ChildAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  childId: string | null;
  childName: string | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const ChildAuthContext = createContext<ChildAuthContextType | undefined>(undefined);

export function ChildAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [childInfo, setChildInfo] = useState<{ id: string; name: string } | null>(null);

  // Convex mutations
  const loginMutation = useMutation(api.childAuth.login);
  const logoutMutation = useMutation(api.childAuth.logout);

  // Validate session on mount and when token changes
  const sessionValidation = useQuery(
    api.childAuth.validateSession,
    token ? { token } : "skip"
  );

  // Load token from secure storage on mount
  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('[ChildAuth] Failed to load token:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadToken();
  }, []);

  // Update child info when session validation completes
  useEffect(() => {
    if (sessionValidation === undefined) return; // Still loading

    if (sessionValidation && sessionValidation.valid) {
      setChildInfo({
        id: sessionValidation.childId,
        name: sessionValidation.name,
      });
    } else if (token && sessionValidation === null) {
      // Token is invalid or expired - clear it
      console.log('[ChildAuth] Session invalid, clearing token');
      SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      setToken(null);
      setChildInfo(null);
    }
  }, [sessionValidation, token]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginMutation({ username, password });

      if (result.success && result.token) {
        // Store token securely
        await SecureStore.setItemAsync(SESSION_TOKEN_KEY, result.token);
        setToken(result.token);
        setChildInfo({
          id: result.child.id,
          name: result.child.name,
        });
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('[ChildAuth] Login error:', error);
      
      // Extract error message from ConvexError
      // ConvexError stores the message in error.data (string or object)
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.data) {
        // ConvexError format - error.data contains the message
        if (typeof error.data === 'string') {
          errorMessage = error.data;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        }
      } else if (error?.message) {
        // Check if it's a rate limit error (contains specific text)
        if (error.message.includes('rate limited') || error.message.includes('Rate limit')) {
          errorMessage = 'Too many login attempts. Please try again after 5 minutes.';
        } else if (!error.message.includes('Server Error')) {
          // Only use message if it's not the generic "Server Error"
          errorMessage = error.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutMutation({ token });
      }
    } catch (error) {
      console.error('[ChildAuth] Logout error:', error);
    } finally {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      setToken(null);
      setChildInfo(null);
    }
  };

  const isAuthenticated = !!token && !!sessionValidation?.valid;

  return (
    <ChildAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: isLoading || (!!token && sessionValidation === undefined),
        childId: childInfo?.id ?? null,
        childName: childInfo?.name ?? null,
        token,
        login,
        logout,
      }}
    >
      {children}
    </ChildAuthContext.Provider>
  );
}

export function useChildAuth() {
  const context = useContext(ChildAuthContext);
  if (context === undefined) {
    throw new Error('useChildAuth must be used within a ChildAuthProvider');
  }
  return context;
}

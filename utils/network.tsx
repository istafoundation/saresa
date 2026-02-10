
import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState, useNetInfo } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true, // Optimistic default
  isInternetReachable: true,
  type: 'unknown',
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const netInfo = useNetInfo();
  // Ensure we consistently use a boolean, defaulting to true if null (optimistic)
  const isConnected = netInfo.isConnected ?? true;
  const isInternetReachable = netInfo.isInternetReachable ?? true;

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        type: netInfo.type,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

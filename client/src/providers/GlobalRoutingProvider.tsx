import React from 'react';
import { GlobalRoutingContext, useRoutingConfigState } from '@/hooks/useGlobalRoutingConfig';

interface GlobalRoutingProviderProps {
  children: React.ReactNode;
}

export const GlobalRoutingProvider: React.FC<GlobalRoutingProviderProps> = ({ children }) => {
  const routingState = useRoutingConfigState();

  return (
    <GlobalRoutingContext.Provider value={routingState}>
      {children}
    </GlobalRoutingContext.Provider>
  );
};
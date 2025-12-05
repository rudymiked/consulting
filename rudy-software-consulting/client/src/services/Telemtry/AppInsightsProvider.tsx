// AppInsightsContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.REACT_APP_APPINSIGHTS_KEY!,
    enableAutoRouteTracking: true,
  },
});

appInsights.loadAppInsights();

// Context holds the singleton instance
export const AppInsightsContext = createContext<ApplicationInsights | null>(null);

export const AppInsightsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AppInsightsContext.Provider value={appInsights}>
      {children}
    </AppInsightsContext.Provider>
  );
};

// Hook for easy access
export const useAppInsights = () => {
  const ctx = useContext(AppInsightsContext);
  if (!ctx) throw new Error("useAppInsights must be used within AppInsightsProvider");
  return ctx;
};
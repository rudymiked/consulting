// AppInsightsContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const key = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING || '';

let appInsights: ApplicationInsights | null = null;

if (key) {
  appInsights = new ApplicationInsights({
    config: {
      connectionString: key,
      enableAutoRouteTracking: true,
    },
  });
  appInsights.loadAppInsights();
} else {
  console.log('App Insights connection string not provided.');
}

// Context holds the singleton instance (may be null)
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
  if (!ctx) {
    // Instead of throwing, you can just return a no-op shim
    return {
      trackEvent: () => {},
      trackPageView: () => {},
      // add other no-op methods if needed
    } as unknown as ApplicationInsights;
  }
  return ctx;
};
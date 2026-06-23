// AppInsightsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ApplicationInsights } from '@microsoft/applicationinsights-web';

const key = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING || '';

// Context holds the singleton instance (may be null until idle-loaded)
export const AppInsightsContext = createContext<ApplicationInsights | null>(null);

export const AppInsightsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appInsights, setAppInsights] = useState<ApplicationInsights | null>(null);

  useEffect(() => {
    if (!key) {
      console.log('App Insights connection string not provided.');
      return;
    }

    const init = async () => {
      const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
      const ai = new ApplicationInsights({
        config: {
          connectionString: key,
          enableAutoRouteTracking: true,
        },
      });
      ai.loadAppInsights();
      setAppInsights(ai);
    };

    // Defer until browser is idle so it stays off the critical render path
    if ('requestIdleCallback' in window) {
      requestIdleCallback(init);
    } else {
      setTimeout(init, 0);
    }
  }, []);

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
    return {
      trackEvent: () => {},
      trackPageView: () => {},
    } as unknown as ApplicationInsights;
  }
  return ctx;
};
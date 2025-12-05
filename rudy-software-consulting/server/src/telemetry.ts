import { appInsightsClient } from ".";

if (appInsightsClient) {
  console.log("Telemetry client initialized");
  appInsightsClient.addTelemetryProcessor((envelope) => {
    const msg = envelope.data?.baseData?.message;
    if (msg && msg.includes("azure:core-client:warning")) {
      return false; // drop noisy telemetry
    }
    return true;
  });
} else {
  console.warn("Telemetry client not initialized");
}

export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  try {
    if (appInsightsClient) {
      appInsightsClient.trackEvent({ name, properties });
      appInsightsClient.flush(); // force send immediately for local testing
    }
  } catch (e) {
    console.error("trackEvent error", e);
  }
};

export const trackTrace = (message: string, severity?: number | undefined, properties?: Record<string, unknown>) => {
  try {
    if (!appInsightsClient) return;
    const severityLevel = typeof severity === 'number' ? severity : 1;
    appInsightsClient.trackTrace({ message, severity: severityLevel.toString(), properties });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('trackTrace error', e);
  }
};

export const trackException = (error: unknown, properties?: Record<string, unknown>) => {
  try {
    if (!appInsightsClient) return;
    const err = error instanceof Error ? error : new Error(String(error));
    appInsightsClient.trackException({ exception: err, properties });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('trackException error', e);
  }
};

export const trackDependency = (opts: {
  target?: string;
  name: string;
  data?: string;
  durationMs?: number;
  resultCode?: string | number;
  success?: boolean;
  dependencyTypeName?: string;
  properties?: Record<string, unknown>;
}) => {
  try {
    if (!appInsightsClient) return;
    appInsightsClient.trackDependency({
      target: opts.target,
      name: opts.name,
      data: opts.data,
      duration: opts.durationMs,
      resultCode: opts.resultCode?.toString?.(),
      success: opts.success,
      dependencyTypeName: opts.dependencyTypeName,
      properties: opts.properties,
    } as any);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('trackDependency error', e);
  }
};

export const flush = (callback?: () => void) => {
  try {
    if (!appInsightsClient) {
      if (callback) callback();
      return;
    }
    appInsightsClient.flush();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('flush error', e);
    if (callback) callback();
  }
};

export default {
  trackEvent,
  trackTrace,
  trackException,
  trackDependency,
  flush,
};

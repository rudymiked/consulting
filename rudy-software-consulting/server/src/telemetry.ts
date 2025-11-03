import * as appInsights from 'applicationinsights';

const client = appInsights.defaultClient as any | undefined;

export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  try {
    if (client) client.trackEvent({ name, properties });
  } catch (e) {
    // no-op - don't let telemetry break application logic
    // eslint-disable-next-line no-console
    console.error('trackEvent error', e);
  }
};

export const trackTrace = (message: string, severity?: number | undefined, properties?: Record<string, unknown>) => {
  try {
    if (!client) return;
    const severityLevel = typeof severity === 'number' ? severity : 1;
    client.trackTrace({ message, severity: severityLevel, properties });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('trackTrace error', e);
  }
};

export const trackException = (error: unknown, properties?: Record<string, unknown>) => {
  try {
    if (!client) return;
    const err = error instanceof Error ? error : new Error(String(error));
    client.trackException({ exception: err, properties });
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
    if (!client) return;
    client.trackDependency({
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
    if (!client) {
      if (callback) callback();
      return;
    }
    client.flush({ callback });
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

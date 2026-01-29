"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flush = exports.trackDependency = exports.trackException = exports.trackTrace = exports.trackEvent = void 0;
const _1 = require(".");
if (_1.appInsightsClient) {
    console.log("Telemetry client initialized");
    _1.appInsightsClient.addTelemetryProcessor((envelope) => {
        const msg = envelope.data?.baseData?.message;
        if (msg && msg.includes("azure:core-client:warning")) {
            return false; // drop noisy telemetry
        }
        return true;
    });
}
else {
    console.warn("Telemetry client not initialized");
}
const trackEvent = (name, properties) => {
    try {
        if (_1.appInsightsClient) {
            _1.appInsightsClient.trackEvent({ name, properties });
            _1.appInsightsClient.flush(); // force send immediately for local testing
        }
    }
    catch (e) {
        console.error("trackEvent error", e);
    }
};
exports.trackEvent = trackEvent;
const trackTrace = (message, severity, properties) => {
    try {
        if (!_1.appInsightsClient)
            return;
        const severityLevel = typeof severity === 'number' ? severity : 1;
        _1.appInsightsClient.trackTrace({ message, severity: severityLevel.toString(), properties });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('trackTrace error', e);
    }
};
exports.trackTrace = trackTrace;
const trackException = (error, properties) => {
    try {
        if (!_1.appInsightsClient)
            return;
        const err = error instanceof Error ? error : new Error(String(error));
        _1.appInsightsClient.trackException({ exception: err, properties });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('trackException error', e);
    }
};
exports.trackException = trackException;
const trackDependency = (opts) => {
    try {
        if (!_1.appInsightsClient)
            return;
        _1.appInsightsClient.trackDependency({
            target: opts.target,
            name: opts.name,
            data: opts.data,
            duration: opts.durationMs,
            resultCode: opts.resultCode?.toString?.(),
            success: opts.success,
            dependencyTypeName: opts.dependencyTypeName,
            properties: opts.properties,
        });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('trackDependency error', e);
    }
};
exports.trackDependency = trackDependency;
const flush = (callback) => {
    try {
        if (!_1.appInsightsClient) {
            if (callback)
                callback();
            return;
        }
        _1.appInsightsClient.flush();
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('flush error', e);
        if (callback)
            callback();
    }
};
exports.flush = flush;
exports.default = {
    trackEvent: exports.trackEvent,
    trackTrace: exports.trackTrace,
    trackException: exports.trackException,
    trackDependency: exports.trackDependency,
    flush: exports.flush,
};

import 'dotenv/config';
import * as appInsights from 'applicationinsights';

const conn = process.env.APPINSIGHTS_CONNECTION_STRING;

if (!conn) {
    console.error('❌ Missing APPINSIGHTS_CONNECTION_STRING');
    process.exit(1);
}

try {
    appInsights.setup(conn)
        .setAutoCollectConsole(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectRequests(true)
        .setAutoDependencyCorrelation(true)
        .start();

    const client = appInsights.defaultClient;

    // Optional: tag cloud role
    const roleKey = client.context.keys.cloudRole;
    client.context.tags[roleKey] = process.env.APPINSIGHTS_ROLE_NAME || 'rudyard-api-test';

    // Send test telemetry
    client.trackTrace({ message: '✅ App Insights test trace' });
    client.trackEvent({ name: 'AppInsights_TestEvent' });
    client.trackException({ exception: new Error('Test exception for App Insights') });

    client.flush();
    console.log('✅ Telemetry sent. Check Azure Portal > Application Insights > Logs or Live Metrics.');
    process.exit(0);
} catch (err: any) {
    console.error('❌ Failed to initialize App Insights:', err?.message || err);
    process.exit(1);
}
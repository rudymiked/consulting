"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEntity = exports.deleteEntity = exports.queryEntities = exports.insertEntity = void 0;
exports.getTableClient = getTableClient;
const identity_1 = require("@azure/identity");
const data_tables_1 = require("@azure/data-tables");
// Helper to create a client for any table.
function getTableClient(tableName) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const env = process.env.NODE_ENV || "development";
    if (connectionString && env !== "production") {
        const hint = connectionString.length > 12 ? connectionString.slice(0, 8) + "..." : "present";
        return data_tables_1.TableClient.fromConnectionString(connectionString, tableName);
    }
    if (connectionString && env === "production") {
        console.warn("[TableClient] AZURE_STORAGE_CONNECTION_STRING is set but ignored in production for security.");
    }
    const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
    if (!account) {
        throw new Error("[TableClient] RUDYARD_STORAGE_ACCOUNT_NAME must be set when not using a connection string.");
    }
    const managedClientId = process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID;
    let credential;
    try {
        credential = managedClientId
            ? new identity_1.ManagedIdentityCredential(managedClientId)
            : new identity_1.DefaultAzureCredential();
    }
    catch (err) {
        console.error("[TableClient] Failed to initialize credential:", err);
        throw err;
    }
    const endpoint = `https://${account}.table.core.windows.net`;
    return new data_tables_1.TableClient(endpoint, tableName, credential);
}
const insertEntity = async (tableName, entity) => {
    try {
        const client = getTableClient(tableName);
        await client.createEntity(entity);
    }
    catch (error) {
        console.error(`[Insert] Error inserting entity into ${tableName}:`, error.message || error);
        throw error;
    }
};
exports.insertEntity = insertEntity;
// Query entities
const queryEntities = async (tableName, filter, partitionKey) => {
    const client = getTableClient(tableName);
    const queryOptions = partitionKey
        ? { filter: `${filter} and PartitionKey eq '${partitionKey}'` }
        : { filter };
    try {
        const entities = [];
        for await (const entity of client.listEntities({ queryOptions })) {
            entities.push(entity);
        }
        return entities;
    }
    catch (error) {
        console.error(`[Query] Error querying ${tableName}:`, error.message || error);
        throw error;
    }
};
exports.queryEntities = queryEntities;
// Delete entity
const deleteEntity = async (tableName, partitionKey, rowKey) => {
    const client = getTableClient(tableName);
    try {
        await client.deleteEntity(partitionKey, rowKey);
        console.log(`[Delete] Entity deleted from ${tableName}: PK=${partitionKey}, RK=${rowKey}`);
    }
    catch (error) {
        console.error(`[Delete] Error deleting entity from ${tableName}:`, error.message || error);
        throw error;
    }
};
exports.deleteEntity = deleteEntity;
// Update entity
const updateEntity = async (tableName, entity, merge = true) => {
    try {
        const client = getTableClient(tableName);
        await client.updateEntity(entity, merge ? "Merge" : "Replace");
    }
    catch (error) {
        console.error(`[Update] Error updating entity in ${tableName}:`, error.message || error);
        throw error;
    }
};
exports.updateEntity = updateEntity;
// Optional redaction helper
const redact = (entity) => {
    const clone = { ...entity };
    for (const key of Object.keys(clone)) {
        if (/password|token|secret/i.test(key)) {
            clone[key] = "***";
        }
    }
    return clone;
};

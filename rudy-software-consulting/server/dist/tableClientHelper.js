"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEntity = exports.deleteEntity = exports.queryEntities = exports.insertEntity = void 0;
exports.getTableClient = getTableClient;
const identity_1 = require("@azure/identity");
const data_tables_1 = require("@azure/data-tables");
// Cache for table clients to avoid creating new connections on every request
const tableClientCache = new Map();
// Cached credential (reused across all table clients)
let cachedCredential = null;
function getCredential() {
    if (cachedCredential) {
        return cachedCredential;
    }
    const managedClientId = process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID;
    cachedCredential = managedClientId
        ? new identity_1.ManagedIdentityCredential(managedClientId)
        : new identity_1.DefaultAzureCredential();
    return cachedCredential;
}
// Helper to create a client for any table (with caching).
function getTableClient(tableName) {
    // Check cache first
    const cached = tableClientCache.get(tableName);
    if (cached) {
        return cached;
    }
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const env = process.env.NODE_ENV || "development";
    let client;
    if (connectionString && env !== "production") {
        client = data_tables_1.TableClient.fromConnectionString(connectionString, tableName);
    }
    else {
        if (connectionString && env === "production") {
            console.warn("[TableClient] AZURE_STORAGE_CONNECTION_STRING is set but ignored in production for security.");
        }
        const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
        if (!account) {
            throw new Error("[TableClient] RUDYARD_STORAGE_ACCOUNT_NAME must be set when not using a connection string.");
        }
        const endpoint = `https://${account}.table.core.windows.net`;
        client = new data_tables_1.TableClient(endpoint, tableName, getCredential());
    }
    // Cache the client for future use
    tableClientCache.set(tableName, client);
    console.log(`[TableClient] Created and cached client for table: ${tableName}`);
    return client;
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
    const start = Date.now();
    console.log(`[Query] Starting query on ${tableName}`, { filter: filter || 'none', partitionKey: partitionKey || 'none' });
    const client = getTableClient(tableName);
    // Build query options only if filter is provided
    let queryOptions;
    if (filter && partitionKey) {
        queryOptions = { filter: `${filter} and PartitionKey eq '${partitionKey}'` };
    }
    else if (filter) {
        queryOptions = { filter };
    }
    else if (partitionKey) {
        queryOptions = { filter: `PartitionKey eq '${partitionKey}'` };
    }
    try {
        const entities = [];
        for await (const entity of client.listEntities(queryOptions ? { queryOptions } : undefined)) {
            entities.push(entity);
        }
        const duration = Date.now() - start;
        console.log(`[Query] Completed query on ${tableName}: ${entities.length} results in ${duration}ms`);
        return entities;
    }
    catch (error) {
        const duration = Date.now() - start;
        console.error(`[Query] Error querying ${tableName} after ${duration}ms:`, error.message, error.stack);
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

import {
  ManagedIdentityCredential,
  DefaultAzureCredential,
  TokenCredential
} from "@azure/identity";
import { TableClient } from "@azure/data-tables";

// Cache for table clients to avoid creating new connections on every request
const tableClientCache = new Map<string, TableClient>();

// Cached credential (reused across all table clients)
let cachedCredential: TokenCredential | null = null;

function getCredential(): TokenCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const managedClientId = process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID;
  cachedCredential = managedClientId
    ? new ManagedIdentityCredential(managedClientId)
    : new DefaultAzureCredential();

  return cachedCredential;
}

// Helper to create a client for any table (with caching).
export function getTableClient(tableName: string): TableClient {
  // Check cache first
  const cached = tableClientCache.get(tableName);
  if (cached) {
    return cached;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const env = process.env.NODE_ENV || "development";

  let client: TableClient;

  if (connectionString && env !== "production") {
    client = TableClient.fromConnectionString(connectionString, tableName);
  } else {
    if (connectionString && env === "production") {
      console.warn(
        "[TableClient] AZURE_STORAGE_CONNECTION_STRING is set but ignored in production for security."
      );
    }

    const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
    if (!account) {
      throw new Error(
        "[TableClient] RUDYARD_STORAGE_ACCOUNT_NAME must be set when not using a connection string."
      );
    }

    const endpoint = `https://${account}.table.core.windows.net`;
    client = new TableClient(endpoint, tableName, getCredential());
  }

  // Cache the client for future use
  tableClientCache.set(tableName, client);
  console.log(`[TableClient] Created and cached client for table: ${tableName}`);

  return client;
}

type RequiredTableEntity = { partitionKey: string; rowKey: string };

export const insertEntity = async <T extends RequiredTableEntity>(
  tableName: string,
  entity: T
): Promise<void> => {
  try {
    const client = getTableClient(tableName);
    await client.createEntity(entity);
  } catch (error: any) {
    console.error(`[Insert] Error inserting entity into ${tableName}:`, error.message || error);
    throw error;
  }
}

// Query entities
export const queryEntities = async <T extends object>(
  tableName: string,
  filter?: string | null,
  partitionKey?: string
): Promise<T[]> => {
  const client = getTableClient(tableName);
  
  // Build query options only if filter is provided
  let queryOptions: { filter?: string } | undefined;
  if (filter && partitionKey) {
    queryOptions = { filter: `${filter} and PartitionKey eq '${partitionKey}'` };
  } else if (filter) {
    queryOptions = { filter };
  } else if (partitionKey) {
    queryOptions = { filter: `PartitionKey eq '${partitionKey}'` };
  }

  try {
    const entities: T[] = [];
    for await (const entity of client.listEntities(queryOptions ? { queryOptions } : undefined)) {
      entities.push(entity as T);
    }
    return entities;
  } catch (error: any) {
    console.error(`[Query] Error querying ${tableName}:`, error.message || error);
    throw error;
  }
}

// Delete entity
export const deleteEntity = async (
  tableName: string,
  partitionKey: string,
  rowKey: string
): Promise<void> => {
  const client = getTableClient(tableName);
  try {
    await client.deleteEntity(partitionKey, rowKey);
    console.log(`[Delete] Entity deleted from ${tableName}: PK=${partitionKey}, RK=${rowKey}`);
  } catch (error: any) {
    console.error(`[Delete] Error deleting entity from ${tableName}:`, error.message || error);
    throw error;
  }
}

// Update entity
export const updateEntity = async <T extends RequiredTableEntity>(
  tableName: string,
  entity: T,
  merge: boolean = true
): Promise<void> => {
  try {
    const client = getTableClient(tableName);
    await client.updateEntity(entity, merge ? "Merge" : "Replace");
  } catch (error: any) {
    console.error(`[Update] Error updating entity in ${tableName}:`, error.message || error);
    throw error;
  }
}

// Optional redaction helper
const redact = (entity: any): any => {
  const clone = { ...entity };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret/i.test(key)) {
      clone[key] = "***";
    }
  }
  return clone;
}
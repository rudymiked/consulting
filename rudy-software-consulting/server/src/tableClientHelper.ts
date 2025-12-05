import {
  ManagedIdentityCredential,
  DefaultAzureCredential,
  TokenCredential
} from "@azure/identity";
import { TableClient } from "@azure/data-tables";

// Helper to create a client for any table.
export function getTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const env = process.env.NODE_ENV || "development";

  if (connectionString && env !== "production") {
    const hint = connectionString.length > 12 ? connectionString.slice(0, 8) + "..." : "present";
    return TableClient.fromConnectionString(connectionString, tableName);
  }

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

  const managedClientId = process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID;
  let credential: TokenCredential;

  try {
    credential = managedClientId
      ? new ManagedIdentityCredential(managedClientId)
      : new DefaultAzureCredential();
  } catch (err) {
    console.error("[TableClient] Failed to initialize credential:", err);
    throw err;
  }

  const endpoint = `https://${account}.table.core.windows.net`;
  return new TableClient(endpoint, tableName, credential);
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
  filter: string,
  partitionKey?: string
): Promise<T[]> => {
  const client = getTableClient(tableName);
  const queryOptions = partitionKey
    ? { filter: `${filter} and PartitionKey eq '${partitionKey}'` }
    : { filter };

  try {
    const entities: T[] = [];
    for await (const entity of client.listEntities({ queryOptions })) {
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
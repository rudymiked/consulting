import { ManagedIdentityCredential, DefaultAzureCredential } from "@azure/identity";
import { TableClient } from "@azure/data-tables";

// Helper to create a client for any table.
// Behavior:
// - If AZURE_STORAGE_CONNECTION_STRING is set, use TableClient.fromConnectionString (local/dev convenience).
// - Otherwise, prefer DefaultAzureCredential (supports system-assigned MI, user-assigned MI via env, Azure CLI, VS Code).
// - If RUDYARD_MANAGED_IDENTITY_CLIENT_ID is set, construct a ManagedIdentityCredential for that client id.
export function getTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  // Only allow a connection string in non-production (local dev). In production prefer managed identity / DefaultAzureCredential.
  if (connectionString && process.env.NODE_ENV !== 'production') {
    // log a short masked hint for debugging (do not print full secret)
    const hint = connectionString.length > 12 ? connectionString.slice(0, 8) + '...' : 'present';
    console.log(`Using AZURE_STORAGE_CONNECTION_STRING for TableClient (local): ${hint}`);
    return TableClient.fromConnectionString(connectionString, tableName);
  }
  if (connectionString && process.env.NODE_ENV === 'production') {
    console.warn('AZURE_STORAGE_CONNECTION_STRING is set but NODE_ENV=production — ignoring the connection string and using managed identity for security.');
  }

  const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
  if (!account) {
    throw new Error('RUDYARD_STORAGE_ACCOUNT_NAME must be set when not using AZURE_STORAGE_CONNECTION_STRING');
  }

  const managedClientId = process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID;
  const credential = managedClientId
    ? new ManagedIdentityCredential(managedClientId)
    : new DefaultAzureCredential();

  const endpoint = `https://${account}.table.core.windows.net`;
  return new TableClient(endpoint, tableName, credential);
}

export async function insertEntity(tableName: string, entity: any): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.createEntity(entity);
    console.log(`Entity inserted into ${tableName}:`, entity);
  } catch (error) {
    console.error(`Error inserting entity into ${tableName}:`, error);
    throw error;
  }
}

export async function queryEntities(tableName: string, filter: string): Promise<any[]> {
  const client = getTableClient(tableName);
  try {
    const entities = [];
    for await (const entity of client.listEntities({ queryOptions: { filter } })) {
      entities.push(entity);
    }
    return entities;
  } catch (error) {
    console.error(`Error querying entities from ${tableName}:`, error);
    throw error;
  }
}

export async function deleteEntity(tableName: string, partitionKey: string, rowKey: string): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.deleteEntity(partitionKey, rowKey);
    console.log(`Entity with PartitionKey: ${partitionKey}, RowKey: ${rowKey} deleted from ${tableName}.`);
  } catch (error) {
    console.error(`Error deleting entity from ${tableName}:`, error);
    throw error;
  }
}

export async function updateEntity(tableName: string, entity: any): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.updateEntity(entity, "Merge");
    console.log(`Entity updated in ${tableName}:`, entity);
  } catch (error) {
    console.error(`Error updating entity in ${tableName}:`, error);
    throw error;
  }
}
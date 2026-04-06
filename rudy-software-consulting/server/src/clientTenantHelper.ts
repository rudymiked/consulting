import { deleteEntity, insertEntity, queryEntities, updateEntity } from './tableClientHelper';
import { IClientTenant, TableNames } from './models';

const sanitize = (value: string): string => value.replace(/'/g, "''");

const ensureValidId = (value: string, name: string): void => {
  if (!value || typeof value !== 'string') {
    throw new Error(`${name} is required`);
  }
  if (!/^[a-zA-Z0-9\-_.]{1,120}$/.test(value)) {
    throw new Error(`${name} has invalid characters`);
  }
};



export const getAllClientTenants = async (): Promise<IClientTenant[]> => {
  const tenants = await queryEntities<IClientTenant>(TableNames.ClientTenants, null);
  return tenants;
};

export const getClientTenants = async (clientId: string): Promise<IClientTenant[]> => {
  ensureValidId(clientId, 'clientId');
  const filter = `PartitionKey eq '${sanitize(clientId)}'`;
  const tenants = await queryEntities<IClientTenant>(TableNames.ClientTenants, filter);
  return tenants;
};

export const addOrUpdateClientTenant = async (
  clientId: string,
  tenantId: string,
  tenantName: string | undefined,
  graphClientId: string,
  clientName?: string,
  active: boolean = true,
): Promise<IClientTenant> => {
  ensureValidId(clientId, 'clientId');
  ensureValidId(tenantId, 'tenantId');
  ensureValidId(graphClientId, 'graphClientId');

  const nowIso = new Date().toISOString();

  const entity: IClientTenant = {
    partitionKey: clientId,
    rowKey: tenantId,
    clientId,
    clientName,
    tenantId,
    tenantName,
    graphClientId,
    active,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const existing = await queryEntities<IClientTenant>(
    TableNames.ClientTenants,
    `PartitionKey eq '${sanitize(clientId)}' and RowKey eq '${sanitize(tenantId)}'`,
  );

  if (existing.length > 0) {
    entity.createdAt = existing[0].createdAt || nowIso;
    await updateEntity(TableNames.ClientTenants, entity, false);
  } else {
    await insertEntity(TableNames.ClientTenants, entity);
  }

  return entity;
};

export const deleteClientTenant = async (clientId: string, tenantId: string): Promise<void> => {
  ensureValidId(clientId, 'clientId');
  ensureValidId(tenantId, 'tenantId');
  await deleteEntity(TableNames.ClientTenants, clientId, tenantId);
};

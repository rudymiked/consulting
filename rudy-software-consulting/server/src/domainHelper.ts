import { TableNames, IDomain } from './models';
import { insertEntity, queryEntities, deleteEntity } from './tableClientHelper';
import { v4 as uuidv4 } from 'uuid';

export async function addDomainToClient(clientId: string, domain: string): Promise<IDomain> {
  const id = uuidv4();
  const domainEntity: IDomain = {
    partitionKey: clientId,
    rowKey: id,
    clientId,
    domain: domain.toLowerCase().trim(),
    createdAt: new Date(),
  };

  await insertEntity(TableNames.Domains, domainEntity);
  return domainEntity;
}

export async function getClientDomains(clientId: string): Promise<IDomain[]> {
  try {
    const results: any[] = await queryEntities(
      TableNames.Domains,
      `PartitionKey eq '${clientId}'`
    );
    return results as IDomain[];
  } catch (err) {
    console.error('Error fetching client domains:', err);
    return [];
  }
}

export async function removeDomain(clientId: string, rowKey: string): Promise<void> {
  await deleteEntity(TableNames.Domains, clientId, rowKey);
}

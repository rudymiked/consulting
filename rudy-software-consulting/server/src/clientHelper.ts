import { deleteEntity, insertEntity, queryEntities } from './tableClientHelper';
import { getEntity } from './authHelper';
import { IClient, IInvoice, TableNames } from './models';

export const addClient = async (clientId: string, clientName: string, contactEmail: string, address: string, phone: string) => {
    const client: IClient = {
        id: clientId,
        name: clientName,
        contactEmail: contactEmail,
        address: address,
        phone: phone,
        partitionKey: clientId,
        rowKey: contactEmail,
    };

    await insertEntity(TableNames.Clients, client);
    return client;
};

export const getClientById = async (clientId: string): Promise<IClient | null> => {
    try {
        const query = `PartitionKey eq '${clientId.replace(/'/g, "''")}'`;
        const clients: IClient[] = await queryEntities(TableNames.Clients, query);
        return clients.length > 0 ? clients[0] : null;
    } catch (error) {
        console.error('Error fetching client:', error);
        return null;
    }
};

export const getClientByEmail = async (email: string): Promise<IClient | null> => {
    const query = `RowKey eq '${email.replace(/'/g, "''")}'`;
    const clients: IClient[] = await queryEntities(TableNames.Clients, query);
    return clients.length > 0 ? clients[0] : null;
};

export const getClientsByName = async (name: string): Promise<IClient[]> => {
    const query = `name eq '${name.replace(/'/g, "''")}'`;
    const clients: IClient[] = await queryEntities(TableNames.Clients, query);
    return clients;
};

export const deleteClient = async (clientId: string, contactEmail: string): Promise<void> => {
    const client = await getEntity(TableNames.Clients, clientId, contactEmail);
    if (client) {
        await deleteEntity(TableNames.Clients, client.partitionKey, client.rowKey);
    }
};

export const getAllClients = async (): Promise<IClient[]> => {
    const clients: IClient[] = await queryEntities(TableNames.Clients, null);
    return clients;
};

export const getInvoicesByClientId = async (clientId: string): Promise<IInvoice[]> => {
    const query = `PartitionKey eq '${clientId.replace(/'/g, "''")}'`;
    const invoices: IInvoice[] = await queryEntities(TableNames.Invoices, query);
    return invoices;
};

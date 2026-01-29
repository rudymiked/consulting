"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoicesByClientId = exports.getAllClients = exports.deleteClient = exports.getClientsByName = exports.getClientByEmail = exports.getClientById = exports.addClient = void 0;
const tableClientHelper_1 = require("./tableClientHelper");
const authHelper_1 = require("./authHelper");
const models_1 = require("./models");
const addClient = async (clientId, clientName, contactEmail, address, phone) => {
    const client = {
        id: clientId,
        name: clientName,
        contactEmail: contactEmail,
        address: address,
        phone: phone,
        partitionKey: clientId,
        rowKey: contactEmail,
    };
    await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.Clients, client);
    return client;
};
exports.addClient = addClient;
const getClientById = async (clientId) => {
    try {
        const query = `PartitionKey eq '${clientId.replace(/'/g, "''")}'`;
        const clients = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Clients, query);
        return clients.length > 0 ? clients[0] : null;
    }
    catch (error) {
        console.error('Error fetching client:', error);
        return null;
    }
};
exports.getClientById = getClientById;
const getClientByEmail = async (email) => {
    const query = `RowKey eq '${email.replace(/'/g, "''")}'`;
    const clients = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Clients, query);
    return clients.length > 0 ? clients[0] : null;
};
exports.getClientByEmail = getClientByEmail;
const getClientsByName = async (name) => {
    const query = `name eq '${name.replace(/'/g, "''")}'`;
    const clients = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Clients, query);
    return clients;
};
exports.getClientsByName = getClientsByName;
const deleteClient = async (clientId, contactEmail) => {
    const client = await (0, authHelper_1.getEntity)(models_1.TableNames.Clients, clientId, contactEmail);
    if (client) {
        await (0, tableClientHelper_1.deleteEntity)(models_1.TableNames.Clients, client.partitionKey, client.rowKey);
    }
};
exports.deleteClient = deleteClient;
const getAllClients = async () => {
    const clients = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Clients, null);
    return clients;
};
exports.getAllClients = getAllClients;
const getInvoicesByClientId = async (clientId) => {
    const query = `PartitionKey eq '${clientId.replace(/'/g, "''")}'`;
    const invoices = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Invoices, query);
    return invoices;
};
exports.getInvoicesByClientId = getInvoicesByClientId;

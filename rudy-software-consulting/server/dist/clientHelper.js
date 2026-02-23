"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoicesByClientId = exports.getAllClients = exports.deleteClient = exports.getClientsByName = exports.getClientByEmail = exports.getClientById = exports.addClient = void 0;
const tableClientHelper_1 = require("./tableClientHelper");
const authHelper_1 = require("./authHelper");
const models_1 = require("./models");
/**
 * Validate clientId format to prevent OData injection
 * Allows alphanumeric, hyphens, underscores, and GUIDs
 */
const validateClientId = (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid clientId: must be a non-empty string');
    }
    // Allow alphanumeric, hyphens, underscores, and GUID format
    if (!/^[a-zA-Z0-9\-_]{1,100}$/.test(id)) {
        throw new Error('Invalid clientId format: only alphanumeric, hyphens, and underscores allowed');
    }
};
/**
 * Validate email format
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        throw new Error('Invalid email: must be a non-empty string');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
};
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
    validateClientId(clientId);
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
    validateEmail(email);
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
    validateClientId(clientId);
    const query = `PartitionKey eq '${clientId.replace(/'/g, "''")}'`;
    const invoices = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Invoices, query);
    return invoices;
};
exports.getInvoicesByClientId = getInvoicesByClientId;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClientTenant = exports.addOrUpdateClientTenant = exports.getClientTenants = exports.getAllClientTenants = void 0;
const tableClientHelper_1 = require("./tableClientHelper");
const models_1 = require("./models");
const sanitize = (value) => value.replace(/'/g, "''");
const ensureValidId = (value, name) => {
    if (!value || typeof value !== 'string') {
        throw new Error(`${name} is required`);
    }
    if (!/^[a-zA-Z0-9\-_.]{1,120}$/.test(value)) {
        throw new Error(`${name} has invalid characters`);
    }
};
const ensureSecretSettingName = (value) => {
    if (!value || typeof value !== 'string') {
        throw new Error('graphClientSecretSettingName is required');
    }
    if (!/^[A-Z0-9_]{3,120}$/.test(value)) {
        throw new Error('graphClientSecretSettingName must be uppercase letters, numbers, and underscores');
    }
};
const getAllClientTenants = async () => {
    const tenants = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.ClientTenants, null);
    return tenants;
};
exports.getAllClientTenants = getAllClientTenants;
const getClientTenants = async (clientId) => {
    ensureValidId(clientId, 'clientId');
    const filter = `PartitionKey eq '${sanitize(clientId)}'`;
    const tenants = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.ClientTenants, filter);
    return tenants;
};
exports.getClientTenants = getClientTenants;
const addOrUpdateClientTenant = async (clientId, tenantId, tenantName, graphClientId, graphClientSecretSettingName, clientName, active = true) => {
    ensureValidId(clientId, 'clientId');
    ensureValidId(tenantId, 'tenantId');
    ensureValidId(graphClientId, 'graphClientId');
    ensureSecretSettingName(graphClientSecretSettingName);
    const nowIso = new Date().toISOString();
    const entity = {
        partitionKey: clientId,
        rowKey: tenantId,
        clientId,
        clientName,
        tenantId,
        tenantName,
        graphClientId,
        graphClientSecretSettingName,
        active,
        createdAt: nowIso,
        updatedAt: nowIso,
    };
    const existing = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.ClientTenants, `PartitionKey eq '${sanitize(clientId)}' and RowKey eq '${sanitize(tenantId)}'`);
    if (existing.length > 0) {
        entity.createdAt = existing[0].createdAt || nowIso;
        await (0, tableClientHelper_1.updateEntity)(models_1.TableNames.ClientTenants, entity, false);
    }
    else {
        await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.ClientTenants, entity);
    }
    return entity;
};
exports.addOrUpdateClientTenant = addOrUpdateClientTenant;
const deleteClientTenant = async (clientId, tenantId) => {
    ensureValidId(clientId, 'clientId');
    ensureValidId(tenantId, 'tenantId');
    await (0, tableClientHelper_1.deleteEntity)(models_1.TableNames.ClientTenants, clientId, tenantId);
};
exports.deleteClientTenant = deleteClientTenant;

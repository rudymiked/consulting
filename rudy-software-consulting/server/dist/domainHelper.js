"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDomainToClient = addDomainToClient;
exports.getClientDomains = getClientDomains;
exports.removeDomain = removeDomain;
const models_1 = require("./models");
const tableClientHelper_1 = require("./tableClientHelper");
const domainHealthHelper_1 = require("./domainHealthHelper");
const uuid_1 = require("uuid");
async function addDomainToClient(clientId, domain) {
    const id = (0, uuid_1.v4)();
    // Normalize domain to extract hostname (e.g., https://example.com/ -> example.com)
    const normalizedDomain = (0, domainHealthHelper_1.normalizeDomain)(domain);
    const domainEntity = {
        partitionKey: clientId,
        rowKey: id,
        clientId,
        domain: normalizedDomain,
        createdAt: new Date(),
    };
    await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.Domains, domainEntity);
    return domainEntity;
}
async function getClientDomains(clientId) {
    try {
        const results = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Domains, `PartitionKey eq '${clientId}'`);
        return results;
    }
    catch (err) {
        console.error('Error fetching client domains:', err);
        return [];
    }
}
async function removeDomain(clientId, rowKey) {
    await (0, tableClientHelper_1.deleteEntity)(models_1.TableNames.Domains, clientId, rowKey);
}

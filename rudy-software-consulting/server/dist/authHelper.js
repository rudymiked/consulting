"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.approveUser = approveUser;
exports.loginUser = loginUser;
exports.getEntity = getEntity;
exports.verifyToken = verifyToken;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tableClientHelper_1 = require("./tableClientHelper");
const telemetry_1 = require("./telemetry");
const models_1 = require("./models");
const guid_ts_1 = require("guid-ts");
async function registerUser(email, password, clientId) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getEntity(models_1.TableNames.Users, 'user', normalizedEmail).catch(() => null);
    if (existing)
        throw new Error('User already exists');
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const emptyGuid = guid_ts_1.Guid.empty();
    clientId = clientId || emptyGuid.toString();
    const user = {
        email: normalizedEmail,
        salt,
        hash,
        createdAt: new Date().toISOString(),
        approved: false,
        clientId: clientId,
        partitionKey: 'user',
        rowKey: normalizedEmail,
        siteAdmin: false,
    };
    await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.Users, user);
    return { success: true };
}
async function approveUser(email, adminToken) {
    const adminPayload = verifyToken(adminToken);
    if (!adminPayload || adminPayload.email !== process.env.ADMIN_EMAIL) {
        throw new Error('Unauthorized');
    }
    const user = await getEntity(models_1.TableNames.Users, 'user', email);
    if (!user)
        throw new Error('User not found');
    user.approved = true;
    await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.Users, user);
    return { success: true };
}
async function loginUser(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await getEntity(models_1.TableNames.Users, 'user', normalizedEmail).catch(() => null);
    (0, telemetry_1.trackEvent)('Login_Attempt', { email: normalizedEmail });
    if (!user || !user.salt || !user.hash) {
        console.error('User not found or missing credentials:', user);
        throw new Error('Invalid credentials');
    }
    if (!user.approved) {
        throw new Error('Account not approved');
    }
    const computedHash = crypto_1.default.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
    if (computedHash !== user.hash)
        throw new Error('Invalid credentials');
    const token = jsonwebtoken_1.default.sign({
        email: normalizedEmail,
        clientId: user.clientId,
        siteAdmin: user.siteAdmin || false
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { token };
}
async function getEntity(tableName, partitionKey, rowKey) {
    const user = await (0, tableClientHelper_1.queryEntities)(tableName, `PartitionKey eq '${partitionKey}' and RowKey eq '${rowKey}'`);
    return user.length > 0 ? user[0] : null;
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (typeof decoded === 'string')
            return null; // unexpected
        return decoded;
    }
    catch {
        return null;
    }
}

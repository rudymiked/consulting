import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';
import { trackEvent } from './telemetry';
import { IUser, TableNames } from './models';
import { Guid } from 'guid-ts';

export async function registerUser(email: string, password: string, clientId?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getEntity(TableNames.Users, 'user', normalizedEmail).catch(() => null);
  if (existing) throw new Error('User already exists');

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

  const emptyGuid: Guid = Guid.empty();

  clientId = clientId || emptyGuid.toString();

  const user: IUser = {
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

  await insertEntity(TableNames.Users, user);

  return { success: true };
}

export async function approveUser(email: string, adminToken: string) {
  const adminPayload = verifyToken(adminToken);

  if (!adminPayload || adminPayload.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }

  const user = await getEntity(TableNames.Users, 'user', email);
  if (!user) throw new Error('User not found');
  user.approved = true;

  await updateEntity(TableNames.Users, user);

  return { success: true };
}

export async function unapproveUser(email: string, adminToken: string) {
  const adminPayload = verifyToken(adminToken);

  if (!adminPayload || adminPayload.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }

  const user = await getEntity(TableNames.Users, 'user', email);
  if (!user) throw new Error('User not found');
  
  // Prevent unapproving site admins
  if (user.siteAdmin) {
    throw new Error('Cannot revoke approval for site administrators');
  }
  
  user.approved = false;

  await updateEntity(TableNames.Users, user);

  return { success: true };
}

export async function toggleAdmin(email: string, adminToken: string) {
  const adminPayload = verifyToken(adminToken);

  if (!adminPayload || adminPayload.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }

  // Prevent modifying your own admin status
  if (email.trim().toLowerCase() === adminPayload.email.trim().toLowerCase()) {
    throw new Error('Cannot modify your own admin status');
  }

  const user = await getEntity(TableNames.Users, 'user', email);
  if (!user) throw new Error('User not found');
  
  user.siteAdmin = !user.siteAdmin;

  await updateEntity(TableNames.Users, user);

  return { success: true, isAdmin: user.siteAdmin };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getEntity(TableNames.Users, 'user', normalizedEmail).catch(() => null);

  trackEvent('Login_Attempt', { email: normalizedEmail });

  if (!user || !user.salt || !user.hash) {
    console.error('User not found or missing credentials:', user);
    throw new Error('Invalid credentials');
  }

  if (!user.approved) {
    throw new Error('Account not approved');
  }

  const computedHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');

  if (computedHash !== user.hash) throw new Error('Invalid credentials');

  const token = jwt.sign({ 
    email: normalizedEmail, 
    clientId: user.clientId,
    siteAdmin: user.siteAdmin || false 
  }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { token };
}

export async function getEntity(tableName: string, partitionKey: string, rowKey: string): Promise<any> {
  const user = await queryEntities(tableName, `PartitionKey eq '${partitionKey}' and RowKey eq '${rowKey}'`);

  return user.length > 0 ? user[0] : null;
}

export function verifyToken(token: string): { email: string; clientId: string; siteAdmin: boolean } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'string') return null; // unexpected
    return decoded as { email: string; clientId: string; siteAdmin: boolean };
  } catch {
    return null;
  }
}
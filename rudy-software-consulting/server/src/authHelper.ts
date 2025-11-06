import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { insertEntity, queryEntities } from './tableClientHelper';
import { trackEvent } from './telemetry';

const TABLE_NAME = 'Users';

export async function registerUser(email: string, password: string) {
  const existing = await getEntity(TABLE_NAME, 'user', email).catch(() => null);
  if (existing) throw new Error('User already exists');

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

  await insertEntity(TABLE_NAME,{
    partitionKey: 'user',
    rowKey: email,
    salt,
    hash,
    createdAt: new Date().toISOString(),
    approved: false,
  });

  return { success: true };
}

export async function approveUser(email: string, adminToken: string) {
  const adminPayload = verifyToken(adminToken);
  
  if (!adminPayload || adminPayload.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }

  const user = await getEntity(TABLE_NAME, 'user', email);
  if (!user) throw new Error('User not found');
  user.approved = true;

  await insertEntity(TABLE_NAME, user);

  return { success: true };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getEntity(TABLE_NAME, 'user', normalizedEmail).catch(() => null);

  trackEvent('Login_Attempt', { email: normalizedEmail });

  if (!user || !user.salt || !user.hash) {
    console.error('User not found or missing credentials:', user);
    throw new Error('Invalid credentials');
  }

  const computedHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');

  if (computedHash !== user.hash) throw new Error('Invalid credentials');

  const token = jwt.sign({ email: normalizedEmail }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { token };
}

export async function getEntity(tableName: string, partitionKey: string, rowKey: string): Promise<any> {
    const user = await queryEntities(tableName, `PartitionKey eq '${partitionKey}' and RowKey eq '${rowKey}'`);
    
    return user.length > 0 ? user[0] : null;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'string') return null; // unexpected
    return decoded;
  } catch {
    return null;
  }
}
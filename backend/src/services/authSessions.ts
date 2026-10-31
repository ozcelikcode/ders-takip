import { fail } from '@study-tracker/contracts';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Op, Transaction, type Transaction as DatabaseTransaction } from 'sequelize';
import { sequelize } from '../config/database';
import { durationInSeconds, getEnvironment } from '../config/environment';
import { AuthSession, RefreshCredential } from '../models/AuthSession';
import { User } from '../models/User';
import { readSiteSettings } from './siteSettings';
import { generateAccessToken } from '../utils/jwt';

const hashCredential = (value: string) => createHash('sha256').update(value).digest('hex');
const newCredential = () => randomBytes(32).toString('hex');
const tokensFor = (user: User, session: AuthSession) => ({
  accessToken: generateAccessToken({ id: String(user.id), sid: session.id }),
  expiresIn: getEnvironment().JWT_EXPIRE,
});

export const createAuthSession = async (user: User) => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
  const currentUser = await User.findByPk(user.id, { attributes: { include: ['password'] }, transaction });
  if (!currentUser?.isActive || (user.password && user.password !== currentUser.password)) fail(401, 'credentialsChanged');
  const session = await AuthSession.create({ id: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + getEnvironment().SESSION_TTL_DAYS * 86400000) }, { transaction });
  const credential = newCredential();
  await RefreshCredential.create({ hash: hashCredential(credential), sessionId: session.id }, { transaction });
  return { user, session, credential, tokens: tokensFor(user, session) };
});

export const rotateAuthSession = async (credential: string) => {
  if (!/^[a-f0-9]{64}$/.test(credential)) return null;
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const previous = await RefreshCredential.findByPk(hashCredential(credential), { transaction });
    if (!previous) return null;
    const session = await AuthSession.findByPk(previous.sessionId, { transaction });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
    if (previous.consumedAt) {
      // Commit the family revocation even though the refresh request is rejected.
      session.revokedAt = new Date();
      await session.save({ transaction });
      return null;
    }
    // Idle timeout: refresh is lazy, so the effective limit never drops below the access token lifetime.
    const idleLimitMs = Math.max((await readSiteSettings()).sessionTimeout * 60000, durationInSeconds(getEnvironment().JWT_EXPIRE) * 1000);
    if (Date.now() - previous.createdAt.getTime() > idleLimitMs) {
      session.revokedAt = new Date();
      await session.save({ transaction });
      return null;
    }
    const user = await User.findByPk(session.userId, { transaction });
    if (!user?.isActive) return null;
    previous.consumedAt = new Date();
    await previous.save({ transaction });
    const replacement = newCredential();
    await RefreshCredential.create({ hash: hashCredential(replacement), sessionId: session.id }, { transaction });
    return { user, session, credential: replacement, tokens: tokensFor(user, session) };
  });
};

export const revokeCredential = async (credential: string): Promise<void> => {
  const previous = await RefreshCredential.findByPk(hashCredential(credential));
  if (previous) await AuthSession.update({ revokedAt: new Date() }, { where: { id: previous.sessionId } });
};

export const revokeUserSessions = async (userId: number, transaction?: DatabaseTransaction): Promise<void> => {
  await AuthSession.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null }, ...(transaction ? { transaction } : {}) });
};

const otherLiveSessions = (userId: number, currentSessionId: string) => ({
  userId, id: { [Op.ne]: currentSessionId }, revokedAt: null, expiresAt: { [Op.gt]: new Date() },
});

export const countOtherSessions = (userId: number, currentSessionId: string): Promise<number> =>
  AuthSession.count({ where: otherLiveSessions(userId, currentSessionId) });

/** Ends every other signed-in session of the account; the one making the request stays signed in. */
export const revokeOtherSessions = async (userId: number, currentSessionId: string): Promise<number> => {
  const [count] = await AuthSession.update({ revokedAt: new Date() }, { where: otherLiveSessions(userId, currentSessionId) });
  return count;
};

export const purgeExpiredSessions = async (): Promise<void> => {
  await AuthSession.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } });
};

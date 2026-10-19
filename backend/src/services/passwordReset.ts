import { createHash, randomBytes } from 'node:crypto';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { getEnvironment } from '../config/environment';
import { PasswordResetToken, User } from '../models';
import { revokeUserSessions } from './authSessions';
import { mailer } from './mailer';
import { readSiteSettings } from './siteSettings';

const lifetimeMs = 30 * 60 * 1000;
/** A user cannot trigger more than one reset mail in this window. */
const resendCooldownMs = 2 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const fail = (statusCode: number, message: string): never => {
  throw Object.assign(new Error(message), { statusCode });
};

/** Issues a fresh token for the user and invalidates every earlier unused one. */
async function issueToken(userId: number, issuedBy: 'self' | 'admin', transaction: Transaction) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + lifetimeMs);
  await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId, usedAt: null }, transaction });
  await PasswordResetToken.create({ userId, tokenHash: hashToken(token), issuedBy, expiresAt }, { transaction });
  const url = new URL('/reset-password', getEnvironment().FRONTEND_URL);
  url.searchParams.set('token', token);
  return { url: url.toString(), expiresAt };
}

/**
 * Sends a reset link when the address belongs to an active account. The caller learns only how
 * links are delivered, never whether the account exists.
 */
export async function requestPasswordReset(email: string): Promise<'email' | 'admin'> {
  if (!mailer.enabled()) return 'admin';
  const user = await User.findOne({ where: { email, isActive: true } });
  if (!user) return 'email';
  const recent = await PasswordResetToken.findOne({
    where: { userId: user.id, issuedBy: 'self', createdAt: { [Op.gt]: new Date(Date.now() - resendCooldownMs) } },
  });
  if (recent) return 'email';
  const link = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, (transaction) =>
    issueToken(user.id, 'self', transaction),
  );
  const { siteName } = await readSiteSettings();
  // Not awaited: the response must not reveal, by timing or by an SMTP error, that the account exists.
  void mailer.send({
    to: user.email,
    subject: `${siteName} şifre sıfırlama`,
    text: `Şifrenizi sıfırlamak için bağlantıyı 30 dakika içinde açın:\n${link.url}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.`,
    html: `<p>Şifrenizi sıfırlamak için bağlantıyı 30 dakika içinde açın:</p><p><a href="${link.url}">Şifremi sıfırla</a></p><p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.</p>`,
  }).catch((error: unknown) => {
    console.error('Password reset mail failed:', error instanceof Error ? error.name : 'UnknownError');
  });
  return 'email';
}

/** Lets an administrator hand a one-time link to an active user out of band. */
export async function createAdminResetLink(targetId: number) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const user = await User.findByPk(targetId, { transaction });
    if (!user) return fail(404, 'Kullanıcı bulunamadı');
    if (!user.isActive) return fail(409, 'Pasif hesap için sıfırlama bağlantısı oluşturulamaz');
    const link = await issueToken(user.id, 'admin', transaction);
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  });
}

/** Consumes a valid token, sets the new password and signs the user out everywhere. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const record = await PasswordResetToken.findOne({ where: { tokenHash: hashToken(token) }, transaction });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now())
      return fail(400, 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin');
    const user = await User.findByPk(record.userId, { transaction });
    if (!user?.isActive) return fail(400, 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin');
    user.password = password;
    await user.save({ transaction });
    await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null }, transaction });
    await revokeUserSessions(user.id, transaction);
  });
}

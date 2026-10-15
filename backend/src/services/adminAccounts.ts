import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { revokeUserSessions } from './authSessions';

export const manageAdminAccount = async (mode: 'create' | 'recover', email: string, username: string, password: string): Promise<void> => {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must contain at least 12 characters and at most 72 UTF-8 bytes');
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const user = await User.findOne({ where: { email }, attributes: { include: ['password'] }, transaction });
    if (mode === 'create') {
      if (user || await User.count({ where: { role: 'admin' }, transaction })) throw new Error('An administrator already exists; use recover with the exact account email');
      await User.create({ username, email, password, firstName: 'Local', lastName: 'Administrator', role: 'admin' }, { transaction });
    } else {
      if (!user || user.role !== 'admin' || !user.isActive) throw new Error('The active administrator account was not found');
      user.password = password;
      await user.save({ transaction });
      await revokeUserSessions(user.id, transaction);
    }
  });
};

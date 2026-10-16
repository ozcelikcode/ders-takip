import { DataTypes, Model } from 'sequelize';
import type { TopicProgressStatus } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import type { Topic } from './Topic';

/** Per-user learning state for a catalog topic. A missing row means `not_started`. */
export class UserTopicProgress extends Model {
  declare userId: number;
  declare topicId: number;
  declare status: TopicProgressStatus;
  declare updatedAt: Date;
  declare topic?: Topic;
}
UserTopicProgress.init({
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  topicId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'topics', key: 'id' }, onDelete: 'CASCADE' },
  status: { type: DataTypes.ENUM('in_progress', 'completed'), allowNull: false },
}, { sequelize, tableName: 'user_topic_progress', createdAt: false, indexes: [{ fields: ['topicId'] }] });

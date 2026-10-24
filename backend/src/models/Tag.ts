import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** A person's own label. `nameKey` is the folded name that keeps names unique per person. */
export class Tag extends Model {
  declare id: number;
  declare userId: number;
  declare name: string;
  declare nameKey: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}
Tag.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  name: { type: DataTypes.STRING(40), allowNull: false },
  nameKey: { type: DataTypes.STRING(40), allowNull: false },
}, { sequelize, tableName: 'tags', indexes: [{ unique: true, fields: ['userId', 'nameKey'] }] });

/** A tag on a record; the tag's owner decides, so tagging a shared record changes only their own view. */
export class CourseTag extends Model {
  declare tagId: number;
  declare courseId: number;
}
CourseTag.init({
  tagId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'tags', key: 'id' }, onDelete: 'CASCADE' },
  courseId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
}, { sequelize, tableName: 'course_tags', timestamps: false, indexes: [{ fields: ['courseId'] }] });

/** A tag on one of the person's sessions. */
export class SessionTag extends Model {
  declare tagId: number;
  declare sessionId: number;
}
SessionTag.init({
  tagId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'tags', key: 'id' }, onDelete: 'CASCADE' },
  sessionId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'study_sessions', key: 'id' }, onDelete: 'CASCADE' },
}, { sequelize, tableName: 'session_tags', timestamps: false, indexes: [{ fields: ['sessionId'] }] });

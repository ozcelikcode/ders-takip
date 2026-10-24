import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** A person's own weekly target for a record (shared or their own), in measured minutes. */
export class CourseGoal extends Model {
  declare userId: number;
  declare courseId: number;
  declare weeklyMinutes: number;
  declare updatedAt: Date;
}
CourseGoal.init({
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  courseId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
  weeklyMinutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 7 * 24 * 60 } },
}, { sequelize, tableName: 'course_goals', createdAt: false, indexes: [{ fields: ['courseId'] }] });

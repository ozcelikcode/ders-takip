import { User } from './User';
import { Course } from './Course';
import { Category } from './Category';
import { Topic } from './Topic';
import { Plan } from './Plan';
import { StudySession } from './StudySession';
import { Settings } from './Settings';

// Define associations
// Category - Course associations
Category.hasMany(Course, {
  foreignKey: 'categoryId',
  as: 'courses',
  onDelete: 'RESTRICT',
});

Course.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

// Course - Topic associations
Course.hasMany(Topic, {
  foreignKey: 'courseId',
  as: 'topics',
  onDelete: 'CASCADE',
});

Topic.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course',
});

// User associations
User.hasMany(Plan, {
  foreignKey: 'userId',
  as: 'plans',
  onDelete: 'CASCADE',
});

Plan.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(StudySession, {
  foreignKey: 'userId',
  as: 'studySessions',
  onDelete: 'CASCADE',
});

StudySession.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Course, {
  foreignKey: 'userId',
  as: 'courses',
  onDelete: 'SET NULL',
});

Course.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Plan associations
Plan.hasMany(StudySession, {
  foreignKey: 'planId',
  as: 'studySessions',
  onDelete: 'SET NULL',
});

StudySession.belongsTo(Plan, {
  foreignKey: 'planId',
  as: 'plan',
});

// Course and Topic associations with StudySession
Course.hasMany(StudySession, {
  foreignKey: 'courseId',
  as: 'studySessions',
  onDelete: 'SET NULL',
});

StudySession.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course',
});

Topic.hasMany(StudySession, {
  foreignKey: 'topicId',
  as: 'studySessions',
  onDelete: 'SET NULL',
});

StudySession.belongsTo(Topic, {
  foreignKey: 'topicId',
  as: 'topic',
});

export { User, Course, Category, Topic, Plan, StudySession, Settings };
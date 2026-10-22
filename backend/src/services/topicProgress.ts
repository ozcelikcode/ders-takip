import { fail } from '@study-tracker/contracts';
import { Transaction } from 'sequelize';
import type { TopicProgressEntry, TopicProgressStatus } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Course, Topic, UserTopicProgress } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';

interface Actor { id: number; role: string }

/** Lists the actor's own non-default topic states for topics that are still active and visible. */
export async function listTopicProgress(actor: Actor): Promise<TopicProgressEntry[]> {
  const rows = await UserTopicProgress.findAll({
    where: { userId: actor.id },
    include: [{ model: Topic, as: 'topic', required: true, where: { isActive: true }, include: [{ model: Course, as: 'course', required: true, where: visibleCourseWhere(actor), attributes: [] }] }],
    order: [['topicId', 'ASC']],
  });
  return rows.map(row => ({ topicId: row.topicId, courseId: row.topic!.courseId, status: row.status as TopicProgressEntry['status'] }));
}

/** Stores the actor's own state for one visible, active topic; `not_started` removes the row. */
export async function setTopicProgress(actor: Actor, topicId: number, status: TopicProgressStatus): Promise<{ topicId: number; courseId: number; status: TopicProgressStatus }> {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const topic = await Topic.findOne({
      where: { id: topicId, isActive: true },
      include: [{ model: Course, as: 'course', required: true, where: visibleCourseWhere(actor), attributes: [] }],
      transaction,
    });
    if (!topic) fail(404, 'recordNotFound');
    if (status === 'not_started') await UserTopicProgress.destroy({ where: { userId: actor.id, topicId }, transaction });
    else await UserTopicProgress.upsert({ userId: actor.id, topicId, status }, { transaction });
    return { topicId, courseId: topic.courseId, status };
  });
}

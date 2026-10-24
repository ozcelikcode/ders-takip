import { Op, UniqueConstraintError, type WhereOptions } from 'sequelize';
import { fail, foldSearchText, type Tag as TagRecord, type TagAssignments } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Course, CourseTag, SessionTag, StudySession, Tag } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';

interface Actor { id: number; role: string }

export const tagDTO = (tag: Tag): TagRecord => ({ id: tag.id, name: tag.name });

/** The person's tags and where they are attached. */
export async function listTags(actor: Actor): Promise<TagAssignments> {
  const tags = await Tag.findAll({ where: { userId: actor.id }, order: [['id', 'ASC']] });
  const tagIds = tags.map((tag) => tag.id);
  const [courseTags, sessionTags] = tagIds.length
    ? await Promise.all([CourseTag.findAll({ where: { tagId: tagIds } }), SessionTag.findAll({ where: { tagId: tagIds } })])
    : [[], []];
  return {
    tags: tags.map(tagDTO),
    courseTags: courseTags.map(({ courseId, tagId }) => ({ courseId, tagId })),
    sessionTags: sessionTags.map(({ sessionId, tagId }) => ({ sessionId, tagId })),
  };
}

const uniqueName = async <T>(write: () => Promise<T>) => {
  try {
    return await write();
  } catch (error) {
    if (error instanceof UniqueConstraintError) fail(409, 'tagExists');
    throw error;
  }
};

export const createTag = (actor: Actor, name: string) =>
  uniqueName(() => Tag.create({ userId: actor.id, name, nameKey: foldSearchText(name) }));

export async function renameTag(actor: Actor, id: number, name: string) {
  const tag = await Tag.findOne({ where: { id, userId: actor.id } });
  if (!tag) fail(404, 'recordNotFound');
  return uniqueName(() => tag.update({ name, nameKey: foldSearchText(name) }));
}

export async function deleteTag(actor: Actor, id: number) {
  if (!await Tag.destroy({ where: { id, userId: actor.id } })) fail(404, 'recordNotFound');
}

async function ownTagIds(actor: Actor, tagIds: number[]) {
  if (!tagIds.length) return [];
  const own = await Tag.findAll({ where: { id: tagIds, userId: actor.id }, attributes: ['id'] });
  if (own.length !== tagIds.length) fail(404, 'recordNotFound');
  return tagIds;
}

/** Replaces the person's tags on a record they can see; other people's tags on a shared record stay. */
export async function setCourseTags(actor: Actor, courseId: number, tagIds: number[]) {
  if (!await Course.findOne({ where: { ...visibleCourseWhere(actor), id: courseId }, attributes: ['id'] })) fail(404, 'recordNotFound');
  const ids = await ownTagIds(actor, tagIds);
  const mine = (await Tag.findAll({ where: { userId: actor.id }, attributes: ['id'] })).map((tag) => tag.id);
  await sequelize.transaction(async (transaction) => {
    await CourseTag.destroy({ where: { courseId, tagId: mine }, transaction });
    await CourseTag.bulkCreate(ids.map((tagId) => ({ courseId, tagId })), { transaction });
  });
}

/** Replaces the tags on one of the person's sessions. */
export async function setSessionTags(actor: Actor, sessionId: number, tagIds: number[]) {
  if (!await StudySession.findOne({ where: { id: sessionId, userId: actor.id }, attributes: ['id'] })) fail(404, 'recordNotFound');
  const ids = await ownTagIds(actor, tagIds);
  await sequelize.transaction(async (transaction) => {
    await SessionTag.destroy({ where: { sessionId }, transaction });
    await SessionTag.bulkCreate(ids.map((tagId) => ({ sessionId, tagId })), { transaction });
  });
}

/** Sessions that carry the tag themselves or through their record. */
export async function sessionsWithTag(actor: { id: number }, tagId: number): Promise<WhereOptions> {
  if (!await Tag.findOne({ where: { id: tagId, userId: actor.id }, attributes: ['id'] })) fail(404, 'recordNotFound');
  const [sessions, courses] = await Promise.all([
    SessionTag.findAll({ where: { tagId }, attributes: ['sessionId'] }),
    CourseTag.findAll({ where: { tagId }, attributes: ['courseId'] }),
  ]);
  return {
    [Op.or]: [
      { id: { [Op.in]: sessions.map((row) => row.sessionId) } },
      { courseId: { [Op.in]: courses.map((row) => row.courseId) } },
    ],
  };
}

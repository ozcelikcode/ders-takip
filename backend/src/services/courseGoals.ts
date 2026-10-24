import { fail, type CourseGoal as CourseGoalRecord } from '@study-tracker/contracts';
import { Course, CourseGoal } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';

interface Actor { id: number; role: string }

export const courseGoalDTO = (goal: CourseGoal): CourseGoalRecord => ({ courseId: goal.courseId, weeklyMinutes: goal.weeklyMinutes });

export const listCourseGoals = (actor: Actor) => CourseGoal.findAll({ where: { userId: actor.id }, order: [['courseId', 'ASC']] });

/** Sets the person's weekly target for a record they can see; the record itself is never changed. */
export async function setCourseGoal(actor: Actor, courseId: number, weeklyMinutes: number) {
  if (!await Course.findOne({ where: { ...visibleCourseWhere(actor), id: courseId }, attributes: ['id'] })) fail(404, 'recordNotFound');
  const [goal] = await CourseGoal.upsert({ userId: actor.id, courseId, weeklyMinutes });
  return goal;
}

export const clearCourseGoal = (actor: Actor, courseId: number) => CourseGoal.destroy({ where: { userId: actor.id, courseId } });

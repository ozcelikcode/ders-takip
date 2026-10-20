import { matchesSearch, searchLimit, type SearchResult } from '@study-tracker/contracts';
import { Op, type WhereOptions } from 'sequelize';
import { Category, Course, StudySession, Topic } from '../models';
import { visibleCourseWhere } from '../policies/courseAccess';
import { columnContains as contains } from '../utils/textSearch';

interface Actor {
  id: number;
  role: string;
}

/** Searches the actor's visible catalog and their own sessions by title, description and notes. */
export async function search(actor: Actor, query: string): Promise<SearchResult> {
  const needle = query.trim();
  const [courses, topics, sessions] = await Promise.all([
    Course.findAll({
      where: { [Op.and]: [visibleCourseWhere(actor), contains('Course.name', needle)] } as WhereOptions,
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      order: [['isActive', 'DESC'], ['name', 'ASC']],
      limit: searchLimit,
    }),
    Topic.findAll({
      where: { [Op.and]: [{ isActive: true }, contains('Topic.name', needle)] } as WhereOptions,
      include: [{ model: Course, as: 'course', required: true, where: visibleCourseWhere(actor), attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
      limit: searchLimit,
    }),
    StudySession.findAll({
      where: {
        [Op.and]: [
          { userId: actor.id },
          { [Op.or]: [contains('title', needle), contains('description', needle), contains('notes', needle)] },
        ],
      } as WhereOptions,
      order: [['startTime', 'DESC']],
      limit: searchLimit,
    }),
  ]);
  return {
    courses: courses.map((course) => ({
      id: course.id,
      name: course.name,
      categoryName: (course as Course & { category?: Category }).category?.name ?? null,
      isActive: course.isActive,
    })),
    topics: topics.map((topic) => {
      const parent = (topic as Topic & { course: Course }).course;
      return { id: topic.id, name: topic.name, courseId: parent.id, courseName: parent.name };
    }),
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      startTime: session.startTime.toISOString(),
      status: session.status,
      matchedIn: matchesSearch(session.title, needle) ? 'title' : matchesSearch(session.description, needle) ? 'description' : 'notes',
    })),
  };
}

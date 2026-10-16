import { Op, Transaction, type Includeable } from 'sequelize';
import type { CreateCategoryInput, UpdateCategoryInput, DeleteCategoryInput, CreateCourseInput, UpdateCourseInput, CreateTopicInput, UpdateTopicInput, ReorderTopicsInput } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Category, Course, Topic, StudySession } from '../models';

interface Actor { id: number; role: string }
const categoryInclude: Includeable = { model: Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'] };
const topicIncludes: Includeable[] = [{ model: Course, as: 'course', attributes: ['id', 'name', 'color', 'icon'], include: [categoryInclude] }];
const write = <T>(operation: (transaction: Transaction) => Promise<T>) => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, operation);
function fail(statusCode: number, message: string): never { throw Object.assign(new Error(message), { statusCode }); }
function requireAdmin(actor: Actor) { if (actor.role !== 'admin') fail(403, 'Bu işlem için yönetici yetkisi gereklidir'); }
async function writableCourse(actor: Actor, id: number, transaction: Transaction) {
  const course = await Course.findByPk(id, { transaction });
  if (!course) fail(404, 'Ders bulunamadı');
  if (actor.role !== 'admin' && (course.isGlobal || course.userId !== actor.id)) fail(403, 'Bu dersi değiştirme yetkiniz yok');
  return course;
}
async function categoryById(id: number, transaction: Transaction) {
  const category = await Category.findByPk(id, { transaction });
  if (!category) fail(404, 'Kategori bulunamadı');
  return category;
}
async function writableTopic(actor: Actor, id: number, transaction: Transaction) {
  const topic = await Topic.findByPk(id, { transaction });
  if (!topic) fail(404, 'Konu bulunamadı');
  await writableCourse(actor, topic.courseId, transaction);
  return topic;
}
async function assertCourseName(values: { id?: number; name: string; categoryId: number; userId?: number | null | undefined; isGlobal: boolean }, transaction: Transaction) {
  const conflict = await Course.findOne({ where: {
    categoryId: values.categoryId, name: values.name,
    ...(values.id === undefined ? {} : { id: { [Op.ne]: values.id } }),
    ...(values.isGlobal ? {} : { [Op.or]: [{ userId: values.userId ?? null }, { isGlobal: true }] }),
  }, transaction });
  if (conflict) fail(409, 'Bu kategoride aynı isimde erişilebilir bir ders zaten mevcut');
}
async function assertTopicName(courseId: number, name: string, transaction: Transaction, excludeId?: number) {
  if (await Topic.findOne({ where: { courseId, name, isActive: true, ...(excludeId === undefined ? {} : { id: { [Op.ne]: excludeId } }) }, transaction })) {
    fail(409, 'Bu derste aynı isimde bir konu zaten mevcut');
  }
}
async function appendTopicOrder(courseId: number, transaction: Transaction) {
  const maximum = await Topic.max<number, Topic>('order', { where: { courseId, isActive: true }, transaction });
  const order = (maximum || 0) + 1;
  if (!Number.isSafeInteger(order)) fail(409, 'Konu sıra numarası sınırı aşıldı');
  return order;
}

export async function createCategory(actor: Actor, input: CreateCategoryInput) {
  requireAdmin(actor);
  return write(async transaction => {
    const category = Category.build({ name: input.name, color: input.color ?? '#3b82f6', order: input.order ?? 1 });
    for (const field of ['description', 'icon', 'isActive'] as const) {
      if (input[field] !== undefined) category.set(field, input[field]);
    }
    return category.save({ transaction });
  });
}
export async function updateCategory(actor: Actor, id: number, input: UpdateCategoryInput) {
  requireAdmin(actor);
  return write(async transaction => {
    const category = await categoryById(id, transaction);
    for (const field of ['name', 'description', 'color', 'icon', 'order', 'isActive'] as const) {
      if (input[field] !== undefined) category.set(field, input[field]);
    }
    if (category.changed()) await category.save({ transaction });
    return category;
  });
}
export async function deleteCategory(actor: Actor, id: number, input: DeleteCategoryInput) {
  requireAdmin(actor);
  return write(async transaction => {
    const category = await categoryById(id, transaction);
    if (input.migrateToCategoryId === id) fail(400, 'Hedef kategori silinen kategoriyle aynı olamaz');
    if (input.migrateToCategoryId !== undefined) await categoryById(input.migrateToCategoryId, transaction);
    const courses = await Course.findAll({ where: { categoryId: id }, transaction });
    if (courses.length && input.migrateToCategoryId === undefined) fail(409, 'Bu kategoride dersler var. Önce bir hedef kategori seçin');
    for (const course of courses) {
      const categoryId = input.migrateToCategoryId!;
      await assertCourseName({ id: course.id, name: course.name, categoryId, userId: course.userId, isGlobal: course.isGlobal }, transaction);
      await course.update({ categoryId }, { transaction });
    }
    await category.destroy({ transaction });
    return courses.length;
  });
}
export async function createCourse(actor: Actor, input: CreateCourseInput) {
  return write(async transaction => {
    if (input.isGlobal && actor.role !== 'admin') fail(403, 'Ortak ders oluşturma yetkiniz yok');
    await categoryById(input.categoryId, transaction);
    await assertCourseName({ name: input.name, categoryId: input.categoryId, userId: actor.id, isGlobal: input.isGlobal ?? false }, transaction);
    const course = Course.build({ name: input.name, categoryId: input.categoryId, userId: actor.id, isGlobal: input.isGlobal ?? false, color: input.color ?? '#3b82f6', order: input.order ?? 1 });
    for (const field of ['description', 'icon', 'isActive'] as const) {
      if (input[field] !== undefined) course.set(field, input[field]);
    }
    await course.save({ transaction });
    return course.reload({ include: [categoryInclude], transaction });
  });
}
export async function updateCourse(actor: Actor, id: number, input: UpdateCourseInput) {
  return write(async transaction => {
    const course = await writableCourse(actor, id, transaction);
    if (input.isGlobal !== undefined && input.isGlobal !== course.isGlobal && actor.role !== 'admin') fail(403, 'Ortak ders ayarını değiştirme yetkiniz yok');
    if (input.categoryId !== undefined) await categoryById(input.categoryId, transaction);
    for (const field of ['name', 'description', 'color', 'icon', 'order', 'isActive', 'categoryId', 'isGlobal'] as const) {
      if (input[field] !== undefined) course.set(field, input[field]);
    }
    await assertCourseName(course, transaction);
    if (course.changed()) await course.save({ transaction });
    return course.reload({ include: [categoryInclude], transaction });
  });
}
export async function deleteCourse(actor: Actor, id: number) {
  return write(async transaction => {
    const course = await writableCourse(actor, id, transaction);
    const topics = await Topic.findAll({ where: { courseId: id }, attributes: ['id'], transaction });
    const topicIds = topics.map(topic => topic.id);
    const sessions = await StudySession.findAll({ where: { [Op.or]: [{ courseId: id }, { topicId: { [Op.in]: topicIds } }] }, transaction });
    // Explicitly detach references so session optimistic versions change with the relation snapshot.
    for (const session of sessions) {
      if (session.courseId === id) session.courseId = null;
      if (session.topicId != null && topicIds.includes(session.topicId)) session.topicId = null;
      await session.save({ transaction });
    }
    // The database cascades topics; sessions and measured intervals survive.
    await course.destroy({ transaction });
  });
}
export async function createTopic(actor: Actor, input: CreateTopicInput) {
  return write(async transaction => {
    await writableCourse(actor, input.courseId, transaction);
    await assertTopicName(input.courseId, input.name, transaction);
    let order = input.order;
    if (order === undefined || await Topic.findOne({ where: { courseId: input.courseId, isActive: true, order }, transaction })) order = await appendTopicOrder(input.courseId, transaction);
    const topic = Topic.build({ name: input.name, courseId: input.courseId, estimatedTime: input.estimatedTime, difficulty: input.difficulty, order });
    if (input.description !== undefined) topic.description = input.description;
    await topic.save({ transaction });
    return topic.reload({ include: topicIncludes, transaction });
  });
}
export async function updateTopic(actor: Actor, id: number, input: UpdateTopicInput) {
  return write(async transaction => {
    const topic = await writableTopic(actor, id, transaction);
    const reactivating = !topic.isActive && input.isActive === true;
    if (reactivating || (input.name !== undefined && input.name !== topic.name)) {
      await assertTopicName(topic.courseId, input.name ?? topic.name, transaction, id);
    }
    for (const field of ['name', 'description', 'order', 'estimatedTime', 'difficulty', 'isActive'] as const) {
      if (input[field] !== undefined) topic.set(field, input[field]);
    }
    if (topic.isActive && (input.order !== undefined || reactivating) && await Topic.findOne({ where: { courseId: topic.courseId, isActive: true, order: topic.order, id: { [Op.ne]: id } }, transaction })) {
      if (!reactivating || input.order !== undefined) fail(409, 'Bu sıra numarası başka bir aktif konu tarafından kullanılıyor');
      topic.order = await appendTopicOrder(topic.courseId, transaction);
    }
    if (topic.changed()) await topic.save({ transaction });
    return topic.reload({ include: topicIncludes, transaction });
  });
}
export async function deleteTopic(actor: Actor, id: number) {
  return write(async transaction => {
    const topic = await writableTopic(actor, id, transaction);
    if (topic.isActive) await topic.update({ isActive: false }, { transaction });
  });
}
export async function reorderTopics(actor: Actor, courseId: number, input: ReorderTopicsInput) {
  return write(async transaction => {
    await writableCourse(actor, courseId, transaction);
    const topics = await Topic.findAll({ where: { courseId, isActive: true }, transaction });
    const expected = new Map(input.expectedTopics.map(topic => [topic.id, new Date(topic.updatedAt).getTime()]));
    if (topics.length !== expected.size || topics.some(topic => expected.get(topic.id) !== topic.updatedAt.getTime())) {
      fail(409, 'Konu listesi değişti. Güncel listeyi yükleyip tekrar sıralayın');
    }
    const orders = new Map(input.topicOrders.map(topic => [topic.id, topic.order]));
    for (const topic of topics) {
      const order = orders.get(topic.id)!;
      if (order !== topic.order) await topic.update({ order }, { transaction });
    }
    return Topic.findAll({ where: { courseId, isActive: true }, order: [['order', 'ASC'], ['id', 'ASC']], include: topicIncludes, transaction });
  });
}

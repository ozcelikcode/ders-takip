import { Op, Transaction } from 'sequelize';
import {
  defaultPlanGoals,
  planGoalsSchema,
  planRecordSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Plan, StudySession } from '../models';

function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}
async function loadOwned(userId: number, id: number, transaction: Transaction) {
  const plan = await Plan.findOne({ where: { id, userId }, transaction });
  if (!plan) fail(404, 'Plan bulunamadı');
  return plan;
}
async function assertRange(
  userId: number,
  startDate: Date,
  endDate: Date,
  isActive: boolean,
  transaction: Transaction,
  excludeId?: number,
) {
  if (endDate <= startDate)
    fail(400, 'Bitiş tarihi başlangıçtan sonra olmalıdır');
  if (!isActive) return;
  // Goal periods retain their inclusive boundary contract.
  const conflict = await Plan.findOne({
    where: {
      userId,
      isActive: true,
      ...(excludeId === undefined ? {} : { id: { [Op.ne]: excludeId } }),
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    },
    transaction,
  });
  if (conflict) fail(409, 'Bu tarih aralığında aktif bir plan zaten mevcut');
}
export async function createPlan(userId: number, input: CreatePlanInput) {
  return sequelize.transaction(
    { type: Transaction.TYPES.IMMEDIATE },
    async (transaction) => {
      const startDate = new Date(input.startDate),
        endDate = new Date(input.endDate);
      await assertRange(userId, startDate, endDate, true, transaction);
      const plan = await Plan.create(
        {
          title: input.title,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          userId,
          startDate,
          endDate,
          goals: input.goals ?? { ...defaultPlanGoals },
        },
        { transaction },
      );
      return planRecordSchema.parse(plan.toJSON());
    },
  );
}
export async function updatePlan(
  userId: number,
  id: number,
  input: UpdatePlanInput,
) {
  return sequelize.transaction(
    { type: Transaction.TYPES.IMMEDIATE },
    async (transaction) => {
      const plan = await loadOwned(userId, id, transaction);
      const startDate =
        input.startDate === undefined
          ? plan.startDate
          : new Date(input.startDate);
      const endDate =
        input.endDate === undefined ? plan.endDate : new Date(input.endDate);
      await assertRange(
        userId,
        startDate,
        endDate,
        input.isActive ?? plan.isActive,
        transaction,
        id,
      );
      if (input.title !== undefined) plan.title = input.title;
      if (input.description !== undefined) plan.description = input.description;
      if (input.isActive !== undefined) plan.isActive = input.isActive;
      plan.startDate = startDate;
      plan.endDate = endDate;
      if (input.goals !== undefined)
        plan.goals = planGoalsSchema.parse({ ...plan.goals, ...input.goals });
      await plan.save({ transaction });
      return planRecordSchema.parse(plan.toJSON());
    },
  );
}
export async function deletePlan(userId: number, id: number) {
  return sequelize.transaction(
    { type: Transaction.TYPES.IMMEDIATE },
    async (transaction) => {
      const plan = await loadOwned(userId, id, transaction);
      // Detach with instance hooks so open session editors observe a new version.
      const sessions = await StudySession.findAll({
        where: { planId: id },
        transaction,
      });
      for (const session of sessions) {
        session.planId = null;
        await session.save({ transaction });
      }
      await plan.destroy({ transaction });
    },
  );
}

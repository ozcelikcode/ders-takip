import { Op, type WhereOptions } from 'sequelize';

interface Actor {
  id: number;
  role: string;
}

export const visibleCourseWhere = (actor: Actor): WhereOptions => actor.role === 'admin'
  ? {}
  : { [Op.or]: [{ userId: actor.id }, { isGlobal: true }] };

import { foldSearchText, searchFoldPairs } from '@study-tracker/contracts';
import { Op, Sequelize } from 'sequelize';

type SqlExpression = ReturnType<typeof Sequelize.fn> | ReturnType<typeof Sequelize.col>;

// The same fold as `foldSearchText`: Turkish letter pairs via replace(), then SQLite's ASCII-only lower().
const folded = (column: string) =>
  Sequelize.fn('lower', searchFoldPairs.reduce<SqlExpression>((expression, [from, to]) => Sequelize.fn('replace', expression, from, to), Sequelize.col(column)));

/** SQL condition: `column` contains `query` under the shared search fold. instr() has no wildcards, so "%" and "_" stay literal. */
export const columnContains = (column: string, query: string) =>
  Sequelize.where(Sequelize.fn('instr', folded(column), foldSearchText(query.trim())), Op.gt, 0);

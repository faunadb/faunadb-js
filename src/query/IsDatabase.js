import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a database.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdatabase">IsDatabase</a>
 */
export default function IsDatabase(expr) {
  arity.exact(1, arguments, IsDatabase.name)
  return new Expr({ is_database: wrap(expr) })
}

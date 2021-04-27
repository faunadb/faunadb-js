import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is an index.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isindex">IsIndex</a>
 */
export default function IsIndex(expr) {
  arity.exact(1, arguments, IsIndex.name)
  return new Expr({ is_index: wrap(expr) })
}

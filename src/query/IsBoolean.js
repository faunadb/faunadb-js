import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a boolean.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isboolean">IsBoolean</a>
 */
export default function IsBoolean(expr) {
  arity.exact(1, arguments, IsBoolean.name)
  return new Expr({ is_boolean: wrap(expr) })
}

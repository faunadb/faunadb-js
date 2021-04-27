import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a function.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isfunction">IsFunction</a>
 */
export default function IsFunction(expr) {
  arity.exact(1, arguments, IsFunction.name)
  return new Expr({ is_function: wrap(expr) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is an object.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isobject">IsObject</a>
 */
export default function IsObject(expr) {
  arity.exact(1, arguments, IsObject.name)
  return new Expr({ is_object: wrap(expr) })
}

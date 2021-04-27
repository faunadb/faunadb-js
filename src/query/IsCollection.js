import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a collection.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/iscollection">IsCollection</a>
 */
export default function IsCollection(expr) {
  arity.exact(1, arguments, IsCollection.name)
  return new Expr({ is_collection: wrap(expr) })
}

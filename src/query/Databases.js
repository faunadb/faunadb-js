import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `databases` functions that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the database set's scope.
 * @return {Expr}
 */
export default function Databases(scope) {
  arity.max(1, arguments, Databases.name)
  scope = defaults(scope, null)
  return new Expr({ databases: wrap(scope) })
}

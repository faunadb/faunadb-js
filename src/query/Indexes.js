import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs an `indexes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the index set's scope.
 * @return {Expr}
 */
export default function Indexes(scope) {
  arity.max(1, arguments, Indexes.name)
  scope = defaults(scope, null)
  return new Expr({ indexes: wrap(scope) })
}

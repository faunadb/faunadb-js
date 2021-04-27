import deprecate from 'util-deprecate'
import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `classes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the class set's scope.
 * @return {Expr}
 */
export default deprecate(function(scope) {
  arity.max(1, arguments, 'Classes')
  scope = defaults(scope, null)
  return new Expr({ classes: wrap(scope) })
}, 'Classes() is deprecated, use Collections() instead')

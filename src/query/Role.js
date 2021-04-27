import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the role.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the role's scope.
 * @return {Expr}
 */
export default function Role(name, scope) {
  arity.between(1, 2, arguments, Role.name)
  scope = defaults(scope, null)
  return new Expr(params({ role: wrap(name) }, { scope: wrap(scope) }))
}

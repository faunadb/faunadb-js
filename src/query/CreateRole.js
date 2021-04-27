import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new role.
 *     - name: The name of the role
 *     - privileges: An array of privileges
 *     - membership: An array of membership bindings
 * @return {Expr}
 */
export default function CreateRole(params) {
  arity.exact(1, arguments, CreateRole.name)
  return new Expr({ create_role: wrap(params) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new access provider.
 *     - name: A valid schema name
 *     - issuer: A unique string
 *     - jwks_uri: A valid HTTPS URI
 *     - roles: An array of role/predicate pairs where the predicate returns a boolean.
 *                   The array can also contain Role references.
 * @return {Expr}
 */
export default function CreateAccessProvider(params) {
  arity.exact(1, arguments, CreateAccessProvider.name)
  return new Expr({ create_access_provider: wrap(params) })
}

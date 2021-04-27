import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref with credentials to authenticate against
 * @param {module:query~ExprArg} params
 *   An object of parameters to pass to the login function
 *     - password: The password used to login
 * @return {Expr}
 * */
export default function Login(ref, params) {
  arity.exact(2, arguments, Login.name)
  return new Expr({ login: wrap(ref), params: wrap(params) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to check the password against.
 * @param {module:query~ExprArg} password
 *   The credentials password to check.
 * @return {Expr}
 */
export default function Identify(ref, password) {
  arity.exact(2, arguments, Identify.name)
  return new Expr({ identify: wrap(ref), password: wrap(password) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} secret
 *   The key or token secret to lookup.
 * @return {Expr}
 */
export default function KeyFromSecret(secret) {
  arity.exact(1, arguments, KeyFromSecret.name)
  return new Expr({ key_from_secret: wrap(secret) })
}

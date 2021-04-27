import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} delete_tokens
 *   If true, log out all tokens associated with the current session.
 * @return {Expr}
 */
export default function Logout(delete_tokens) {
  arity.exact(1, arguments, Logout.name)
  return new Expr({ logout: wrap(delete_tokens) })
}

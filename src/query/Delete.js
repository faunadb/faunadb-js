import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to delete.
 * @return {Expr}
 */
export default function Delete(ref) {
  arity.exact(1, arguments, Delete.name)
  return new Expr({ delete: wrap(ref) })
}

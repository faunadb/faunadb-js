import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to update.
 * @param {module:query~ExprArg} params
 *   An object representing the parameters of the document.
 * @return {Expr}
 */
export default function Update(ref, params) {
  arity.exact(2, arguments, Update.name)
  return new Expr({ update: wrap(ref), params: wrap(params) })
}

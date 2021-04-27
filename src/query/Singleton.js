import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref of the document for which to retrieve the singleton set.
 * @return {Expr}
 */
export default function Singleton(ref) {
  arity.exact(1, arguments, Singleton.name)
  return new Expr({ singleton: wrap(ref) })
}

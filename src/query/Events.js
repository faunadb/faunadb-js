import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref or SetRef to retrieve an event set from.
 * @return {Expr}
 */
export default function Events(ref_set) {
  arity.exact(1, arguments, Events.name)
  return new Expr({ events: wrap(ref_set) })
}

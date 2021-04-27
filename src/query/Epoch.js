import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} number
 *   The number of `unit`s from Epoch
 * @param {module:query~ExprArg} unit
 *   The unit of `number`. One of second, millisecond, microsecond, nanosecond.
 * @return {Expr}
 */
export default function Epoch(number, unit) {
  arity.exact(2, arguments, Epoch.name)
  return new Expr({ epoch: wrap(number), unit: wrap(unit) })
}

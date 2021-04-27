import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to converted to a time object.
 * @return {Expr}
 */
export default function Time(string) {
  arity.exact(1, arguments, Time.name)
  return new Expr({ time: wrap(string) })
}

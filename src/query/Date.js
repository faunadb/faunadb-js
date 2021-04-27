import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to convert to a Date object
 * @return {Expr}
 */
export default function Date(string) {
  arity.exact(1, arguments, Date.name)
  return new Expr({ date: wrap(string) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to Trim.
 * @return {string} a string with leading and trailing whitespace removed
 */
export default function Trim(value) {
  arity.exact(1, arguments, Trim.name)
  return new Expr({ trim: wrap(value) })
}

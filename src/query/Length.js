import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to calculate the length in codepoints.
 * @return {int} the length of the string in codepoints
 */
export default function Length(value) {
  arity.exact(1, arguments, Length.name)
  return new Expr({ length: wrap(value) })
}

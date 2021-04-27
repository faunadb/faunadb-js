import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to LowerCase.
 * @return {string} the string converted to lowercase
 */
export default function LowerCase(value) {
  arity.exact(1, arguments, LowerCase.name)
  return new Expr({ lowercase: wrap(value) })
}

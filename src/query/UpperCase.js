import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to Uppercase.
 * @return {string} An uppercase string
 */
export default function UpperCase(value) {
  arity.exact(1, arguments, UpperCase.name)
  return new Expr({ uppercase: wrap(value) })
}

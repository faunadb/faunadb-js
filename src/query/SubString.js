import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value  The string to SubString.
 * @param {int} start  The position the first character of the return string begins at
 * @param {int} length  An optional length, if omitted then returns to the end of string
 * @return {string}
 */
export default function SubString(value, start, length) {
  arity.between(1, 3, arguments, SubString.name)
  start = defaults(start, null)
  length = defaults(length, null)
  return new Expr(
    params(
      { substring: wrap(value) },
      { start: wrap(start), length: wrap(length) }
    )
  )
}

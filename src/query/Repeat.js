import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to repeat.
 * @param {int} number - The number of times to repeat the string
 * @return {string} a string which was repeated
 */
export default function Repeat(value, number) {
  arity.between(1, 2, arguments, Repeat.name)
  number = defaults(number, null)
  return new Expr(params({ repeat: wrap(value) }, { number: wrap(number) }))
}

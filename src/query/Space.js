import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {int} num - The string of N Space(s).
 * @return {string} a string with spaces
 */
export default function Space(num) {
  arity.exact(1, arguments, Space.name)
  return new Expr({ space: wrap(num) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to trim leading white space.
 * @return {string} the string with leading white space removed
 */
export default function LTrim(value) {
  arity.exact(1, arguments, LTrim.name)
  return new Expr({ ltrim: wrap(value) })
}

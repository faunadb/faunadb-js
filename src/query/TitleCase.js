import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to TitleCase.
 * @return {string}  A string converted to titlecase
 */
export default function TitleCase(value) {
  arity.exact(1, arguments, TitleCase.name)
  return new Expr({ titlecase: wrap(value) })
}

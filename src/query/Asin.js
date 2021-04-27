import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The arc sine of the number
 * @return {Expr}
 */
export default function Asin(expr) {
  arity.exact(1, arguments, Asin.name)
  return new Expr({ asin: wrap(expr) })
}

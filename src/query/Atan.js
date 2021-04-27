import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The arc tangent of the number
 * @return {Expr}
 */
export default function Atan(expr) {
  arity.exact(1, arguments, Atan.name)
  return new Expr({ atan: wrap(expr) })
}

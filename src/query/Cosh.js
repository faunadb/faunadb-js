import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyperbolic cosine of the number
 * @return {Expr}
 */
export default function Cosh(expr) {
  arity.exact(1, arguments, Cosh.name)
  return new Expr({ cosh: wrap(expr) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyperbolic sine of a number
 * @return {Expr}
 */
export default function Sinh(expr) {
  arity.exact(1, arguments, Sinh.name)
  return new Expr({ sinh: wrap(expr) })
}

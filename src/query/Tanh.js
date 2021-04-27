import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyberbolic tangent of a number
 * @return {Expr}
 */
export default function Tanh(expr) {
  arity.exact(1, arguments, Tanh.name)
  return new Expr({ tanh: wrap(expr) })
}

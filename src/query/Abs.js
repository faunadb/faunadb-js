import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to provide the absolute value.
 * @return {Expr}
 */
export default function Abs(expr) {
  arity.exact(1, arguments, Abs.name)
  return new Expr({ abs: wrap(expr) })
}

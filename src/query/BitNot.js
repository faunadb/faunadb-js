import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to provide the bitwise not.
 * @return {Expr}
 */
export default function BitNot(expr) {
  arity.exact(1, arguments, BitNot.name)
  return new Expr({ bitnot: wrap(expr) })
}

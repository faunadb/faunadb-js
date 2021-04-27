import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The least integer that is greater than or equal to the number
 * @return {Expr}
 */
export default function Ceil(expr) {
  arity.exact(1, arguments, Ceil.name)
  return new Expr({ ceil: wrap(expr) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The cosine of a number
 * @return {Expr}
 */
export default function Cos(expr) {
  arity.exact(1, arguments, Cos.name)
  return new Expr({ cos: wrap(expr) })
}

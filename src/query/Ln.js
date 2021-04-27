import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The natural log of the number
 * @return {Expr}
 */
export default function Ln(expr) {
  arity.exact(1, arguments, Ln.name)
  return new Expr({ ln: wrap(expr) })
}

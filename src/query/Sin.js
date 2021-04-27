import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The sine of a number
 * @return {Expr}
 */
export default function Sin(expr) {
  arity.exact(1, arguments, Sin.name)
  return new Expr({ sin: wrap(expr) })
}

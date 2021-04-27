import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   Take degrees and convert the number to radians 2 * pi = 360 degrees
 * @return {Expr}
 */
export default function Radians(expr) {
  arity.exact(1, arguments, Radians.name)
  return new Expr({ radians: wrap(expr) })
}

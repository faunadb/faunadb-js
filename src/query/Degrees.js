import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   Take radians and convert it to degrees 360 degrees = 2 * pi radians
 * @return {Expr}
 */
export default function Degrees(expr) {
  arity.exact(1, arguments, Degrees.name)
  return new Expr({ degrees: wrap(expr) })
}

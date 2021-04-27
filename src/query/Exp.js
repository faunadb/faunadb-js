import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The e raised to an exponent number
 * @return {Expr}
 */
export default function Exp(expr) {
  arity.exact(1, arguments, Exp.name)
  return new Expr({ exp: wrap(expr) })
}

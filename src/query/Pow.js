import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to raise to the power.
 * @param {...module:query~ExprArg} terms
 *   An optional exponent
 * @return {Expr}
 */
export default function Pow(value, exponent) {
  arity.min(1, arguments, Pow.name)
  exponent = defaults(exponent, null)
  return new Expr(params({ pow: wrap(value) }, { exp: wrap(exponent) }))
}

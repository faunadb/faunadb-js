import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to truncate.
 * @param {...module:query~ExprArg} terms
 *   An optional precision
 * @return {Expr}
 */
export default function Trunc(value, precision) {
  arity.min(1, arguments, Trunc.name)
  precision = defaults(precision, null)
  return new Expr(
    params({ trunc: wrap(value) }, { precision: wrap(precision) })
  )
}

import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, wrap, wrapValues } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 * You may want to utilize {@link Client#paginate} to obtain a {@link PageHelper},
 * rather than using this query function directly.
 *
 * @param {module:query~ExprArg} set
 *   An expression resulting in a SetRef to page over.
 * @param {?Object} opts
 *  An object representing options for pagination.
 *    - size: Maximum number of results to return.
 *    - after: Return the next page of results after this cursor (inclusive).
 *    - before: Return the previous page of results before this cursor (exclusive).
 *    - sources: If true, include the source sets along with each element.
 * @return {Expr}
 */
export default function Paginate(set, opts) {
  arity.between(1, 2, arguments, Paginate.name)
  opts = defaults(opts, {})

  return new Expr(Object.assign({ paginate: wrap(set) }, wrapValues(opts)))
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} set
 *   A SetRef to remove duplicates from.
 * @return {Expr}
 * */
export default function Distinct(set) {
  arity.exact(1, arguments, Distinct.name)
  return new Expr({ distinct: wrap(set) })
}

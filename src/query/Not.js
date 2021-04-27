import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {module:query~ExprArg} boolean
 *   A boolean to produce the negation of.
 * @return {Expr}
 */
export default function Not(boolean) {
  arity.exact(1, arguments, Not.name)
  return new Expr({ not: wrap(boolean) })
}

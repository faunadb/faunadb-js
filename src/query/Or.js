import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the disjunction of.
 * @return {Expr}
 */
export default function Or() {
  arity.min(1, arguments, Or.name)
  return new Expr({ or: wrap(varargs(arguments)) })
}

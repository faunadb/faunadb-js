import Expr from '../Expr'
import { wrap, arity, varargs } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the conjunction of.
 * @return {Expr}
 */
export default function And() {
  arity.min(1, arguments, And.name)
  return new Expr({ and: wrap(varargs(arguments)) })
}

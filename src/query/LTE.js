import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export default function LTE() {
  arity.min(1, arguments, LTE.name)
  return new Expr({ lte: wrap(varargs(arguments)) })
}

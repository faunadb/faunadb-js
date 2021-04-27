import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export default function GT() {
  arity.min(1, arguments, GT.name)
  return new Expr({ gt: wrap(varargs(arguments)) })
}

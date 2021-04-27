import Expr from '../Expr'
import { wrap, arity, varargs } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise Or'd together.
 * @return {Expr}
 */
export default function BitOr() {
  arity.min(1, arguments, BitOr.name)
  return new Expr({ bitor: wrap(varargs(arguments)) })
}

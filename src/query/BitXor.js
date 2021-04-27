import Expr from '../Expr'
import { wrap, arity, varargs } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise Xor'd together.
 * @return {Expr}
 */
export default function BitXor() {
  arity.min(1, arguments, BitXor.name)
  return new Expr({ bitxor: wrap(varargs(arguments)) })
}

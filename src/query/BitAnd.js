import Expr from '../Expr'
import { wrap, arity, varargs } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise and together.
 * @return {Expr}
 */
export default function BitAnd() {
  arity.min(1, arguments, BitAnd.name)
  return new Expr({ bitand: wrap(varargs(arguments)) })
}

import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to multiply together.
 * @return {Expr}
 */
export default function Multiply() {
  arity.min(1, arguments, Multiply.name)
  return new Expr({ multiply: wrap(varargs(arguments)) })
}

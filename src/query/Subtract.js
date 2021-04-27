import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the difference of.
 * @return {Expr}
 */
export default function Subtract() {
  arity.min(1, arguments, Subtract.name)
  return new Expr({ subtract: wrap(varargs(arguments)) })
}

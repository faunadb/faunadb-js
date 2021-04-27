import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of.
 * @return {Expr}
 */
export default function Divide() {
  arity.min(1, arguments, Divide.name)
  return new Expr({ divide: wrap(varargs(arguments)) })
}

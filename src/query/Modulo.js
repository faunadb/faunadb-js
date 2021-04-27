import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of. The remainder will be returned.
 * @return {Expr}
 */
export default function Modulo() {
  arity.min(1, arguments, Modulo.name)
  return new Expr({ modulo: wrap(varargs(arguments)) })
}

import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to diff.
 * @return {Expr}
 * */
export default function Difference() {
  arity.min(1, arguments, Difference.name)
  return new Expr({ difference: wrap(varargs(arguments)) })
}

import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to intersect.
 * @return {Expr}
 * */
export default function Intersection() {
  arity.min(1, arguments, Intersection.name)
  return new Expr({ intersection: wrap(varargs(arguments)) })
}

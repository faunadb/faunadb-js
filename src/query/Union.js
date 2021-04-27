import Expr from '../Expr'
import { arity, varargs, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to union together.
 * @return {Expr}
 */
export default function Union() {
  arity.min(1, arguments, Union.name)
  return new Expr({ union: wrap(varargs(arguments)) })
}

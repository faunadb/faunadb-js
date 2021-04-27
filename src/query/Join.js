import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} source
 *   A SetRef of the source set
 * @param {module:query~ExprArg|function} target
 *   A Lambda that will accept each element of the source Set and return a Set
 * @return {Expr}
 */
export default function Join(source, target) {
  arity.exact(2, arguments, Join.name)
  return new Expr({ join: wrap(source), with: wrap(target) })
}

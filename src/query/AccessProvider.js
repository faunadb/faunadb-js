import Expr from '../Expr'
import { wrap, arity } from './common'
/**
 *
 * @param {module:query~ExprArg} name
 * A string representing an AccessProvider's name
 * @return {Expr}
 */
export default function AccessProvider(name) {
  arity.exact(1, arguments, AccessProvider.name)
  return new Expr({ access_provider: wrap(name) })
}

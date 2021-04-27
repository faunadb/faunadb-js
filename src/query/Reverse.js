import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 *
 * @param {module:query~ExprArg} expr
 *  An expression (i.e. Set, Page, or Array) to reverse
 * @return {Expr}
 */
export default function Reverse(expr) {
  arity.exact(1, arguments, Reverse.name)
  return new Expr({ reverse: wrap(expr) })
}

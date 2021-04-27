import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to a string literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a string.
 * @return {Expr}
 */
export default function ToString(expr) {
  arity.exact(1, arguments, ToString.name)
  return new Expr({ to_string: wrap(expr) })
}

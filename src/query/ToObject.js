import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to an Object.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an Object.
 * @return {Expr}
 */
export default function ToObject(expr) {
  arity.exact(1, arguments, ToObject.name)
  return new Expr({ to_object: wrap(expr) })
}

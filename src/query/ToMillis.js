import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts a time expression to milliseconds since the UNIX epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to millisecond numeric value.
 * @return {Expr}
 */
export default function ToMillis(expr) {
  arity.exact(1, arguments, ToMillis.name)
  return new Expr({ to_millis: wrap(expr) })
}

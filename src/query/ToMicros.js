import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts a time expression to microseconds since the UNIX epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to microsecond numeric value.
 * @return {Expr}
 */
export default function ToMicros(expr) {
  arity.exact(1, arguments, ToMicros.name)
  return new Expr({ to_micros: wrap(expr) })
}

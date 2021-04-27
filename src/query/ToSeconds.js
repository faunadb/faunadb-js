import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression evaluating to a time to seconds since epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to seconds numeric value.
 * @return {Expr}
 */
export default function ToSeconds(expr) {
  arity.exact(1, arguments, ToSeconds.name)
  return new Expr({ to_seconds: wrap(expr) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a token.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/istoken">IsToken</a>
 */
export default function IsToken(expr) {
  arity.exact(1, arguments, IsToken.name)
  return new Expr({ is_token: wrap(expr) })
}

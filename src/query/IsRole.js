import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a role.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isrole">IsRole</a>
 */
export default function IsRole(expr) {
  arity.exact(1, arguments, IsRole.name)
  return new Expr({ is_role: wrap(expr) })
}

// Read functions

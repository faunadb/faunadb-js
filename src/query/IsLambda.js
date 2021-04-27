import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a lambda.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/islambda">IsLambda</a>
 */
export default function IsLambda(expr) {
  arity.exact(1, arguments, IsLambda.name)
  return new Expr({ is_lambda: wrap(expr) })
}

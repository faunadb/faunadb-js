import Expr from '../Expr'
import { arity, wrap } from './common'
/**
 * Check if the expression is a document (either a reference or an instance).
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdoc">IsDoc</a>
 */
export default function IsDoc(expr) {
  arity.exact(1, arguments, IsDoc.name)
  return new Expr({ is_doc: wrap(expr) })
}

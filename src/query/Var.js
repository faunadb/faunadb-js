import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} varName
 *   The name of the bound var.
 * @return {Expr}
 * */
export default function Var(varName) {
  arity.exact(1, arguments, Var.name)
  return new Expr({ var: wrap(varName) })
}

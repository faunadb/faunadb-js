import Expr from '../Expr'
import { argsToArray, arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} args
 *   A series of expressions to run.
 * @return {Expr}
 * */
export default function Do() {
  arity.min(1, arguments, Do.name)
  var args = argsToArray(arguments)
  return new Expr({ do: wrap(args) })
}

import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} msg
 *   The message to send back to the client.
 * @return {Expr}
 * */
export default function Abort(msg) {
  arity.exact(1, arguments, Abort.name)
  return new Expr({ abort: wrap(msg) })
}

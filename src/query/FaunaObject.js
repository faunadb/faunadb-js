import Expr from '../Expr'
import { arity, wrapValues } from './common'

/**
 See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} fields
 *   The object to be escaped.
 * @return {Expr}
 * */
const FaunaObject = function(fields) {
  arity.exact(1, arguments, FaunaObject.name)
  return new Expr({ object: wrapValues(fields) })
}

export default FaunaObject

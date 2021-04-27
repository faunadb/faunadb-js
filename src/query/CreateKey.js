import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new key
 *     - database: Ref of the database the key will be scoped to. Optional.
 *     - role: The role of the new key
 * @return {Expr}
 */
export default function CreateKey(params) {
  arity.exact(1, arguments, CreateKey.name)
  return new Expr({ create_key: wrap(params) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a database.
 *     - name (required): the name of the database to create
 * @return {Expr}
 */
export default function CreateDatabase(params) {
  arity.exact(1, arguments, CreateDatabase.name)
  return new Expr({ create_database: wrap(params) })
}

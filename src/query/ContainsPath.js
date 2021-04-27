import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to check for the existence of.
 * @param {module:query~ExprArg} in
 *   An object to search against.
 * @return {Expr}
 */
export default function ContainsPath(path, _in) {
  arity.exact(2, arguments, ContainsPath.name)
  return new Expr({ contains_path: wrap(path), in: wrap(_in) })
}

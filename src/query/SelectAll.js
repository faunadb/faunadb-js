import deprecate from 'util-deprecate'
import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to pull from an object.
 * @param {module:query~ExprArg} from
 *   The object to select from
 * @return {Expr}
 *
 * @deprecated avoid using
 */
export default deprecate(function(path, from) {
  arity.exact(2, arguments, 'SelectAll')
  return new Expr({ select_all: wrap(path), from: wrap(from) })
}, 'SelectAll() is deprecated. Avoid use.')

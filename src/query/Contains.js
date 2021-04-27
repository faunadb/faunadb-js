import deprecate from 'util-deprecate'
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
 *
 * @deprecated use ContainsPath instead
 */
export default deprecate(function(path, _in) {
  arity.exact(2, arguments, 'Contains')
  return new Expr({ contains: wrap(path), in: wrap(_in) })
}, 'Contains() is deprecated, use ContainsPath() instead')

import deprecate from 'util-deprecate'
import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */

export default deprecate(function() {
  arity.exact(0, arguments, 'HasIdentity')
  return new Expr({ has_identity: null })
}, 'HasIdentity() is deprecated, use HasCurrentIdentity() instead')

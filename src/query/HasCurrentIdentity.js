import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */

export default function HasCurrentIdentity() {
  arity.exact(0, arguments, HasCurrentIdentity.name)
  return new Expr({ has_current_identity: null })
}

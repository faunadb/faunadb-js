import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
export default function CurrentIdentity() {
  arity.exact(0, arguments, CurrentIdentity.name)
  return new Expr({ current_identity: null })
}

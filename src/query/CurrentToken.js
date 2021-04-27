import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
export default function CurrentToken() {
  arity.exact(0, arguments, CurrentToken.name)
  return new Expr({ current_token: null })
}

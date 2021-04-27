import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
export default function HasCurrentToken() {
  arity.exact(0, arguments, HasCurrentToken.name)
  return new Expr({ has_current_token: null })
}

// String functions

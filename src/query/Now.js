import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns the current snapshot time.
 *
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/now">Now function</a>
 */
export default function Now() {
  arity.exact(0, arguments, Now.name)
  return new Expr({ now: wrap(null) })
}

// Miscellaneous functions

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns true if the string ends with the given suffix value, or false if otherwise
 *
 * @param {string} value   - the string to evaluate
 * @param {string} search  - the suffix to search for
 * @return {boolean}       - does `value` end with `search`
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/endswith">FaunaDB EndsWith Function</a>
 */
export default function EndsWith(value, search) {
  arity.exact(2, arguments, EndsWith.name)
  return new Expr({ endswith: wrap(value), search: wrap(search) })
}

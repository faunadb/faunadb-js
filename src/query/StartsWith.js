import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns true if the string starts with the given prefix value, or false if otherwise
 *
 * @param {string} value   - the string to evaluate
 * @param {string} search  - the prefix to search for
 * @return {boolean}       - does `value` start with `search`
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/startswith">FaunaDB StartsWith Function</a>
 */
export default function StartsWith(value, search) {
  arity.exact(2, arguments, StartsWith.name)
  return new Expr({ startswith: wrap(value), search: wrap(search) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * It takes a string and returns a regex which matches the input string verbatim.
 *
 * @param value      - the string to analyze
 * @return {string}  - a regex which matches the input string verbatim
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/regexescape">FaunaDB RegexEscape Function</a>
 */
export default function RegexEscape(value) {
  arity.exact(1, arguments, RegexEscape.name)
  return new Expr({ regexescape: wrap(value) })
}

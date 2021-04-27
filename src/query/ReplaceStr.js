import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to search.
 * @param {string} find - The string to find in the search string
 * @param {string} replace - The string to replace in the search string
 * @return {String} all the occurrences of find substituted with replace string
 */
export default function ReplaceStr(value, find, replace) {
  arity.exact(3, arguments, ReplaceStr.name)
  return new Expr({
    replacestr: wrap(value),
    find: wrap(find),
    replace: wrap(replace),
  })
}

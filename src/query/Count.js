import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 *
 * Count the number of elements in the collection.
 *
 * @param {array}    - array of items
 * @return {integer} - number of items in the collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/count">Count function</a>
 */
export default function Count(collection) {
  arity.exact(1, arguments, Count.name)
  return new Expr({ count: wrap(collection) })
}

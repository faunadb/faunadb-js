import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 *
 * Sum the elements in the collection.
 *
 * @param {array} - collection of numbers
 * @return {integer} - total of all numbers in collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/sum">Sum function</a>
 */
export default function Sum(collection) {
  arity.exact(1, arguments, Sum.name)
  return new Expr({ sum: wrap(collection) })
}

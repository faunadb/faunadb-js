import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 *
 * Returns the mean of all elements in the collection.
 *
 * @param {array} - collection the numbers
 * @return {float} - the mean of all numbers in the collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/mean">Mean function</a>
 */
export default function Mean(collection) {
  arity.exact(1, arguments, Mean.name)
  return new Expr({ mean: wrap(collection) })
}

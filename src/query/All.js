import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 *
 * Evaluates to true if all elements of the collection are true.
 *
 * @param {array} - collection the collection
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/all">All function</a>
 */
export default function All(collection) {
  arity.exact(1, arguments, All.name)
  return new Expr({ all: wrap(collection) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} number
 *   An expression resulting in the number of elements to drop from the collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 * */
export default function Drop(number, collection) {
  arity.exact(2, arguments, Drop.name)
  return new Expr({ drop: wrap(number), collection: wrap(collection) })
}

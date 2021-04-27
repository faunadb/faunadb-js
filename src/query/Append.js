import Expr from '../Expr'
import { wrap, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} elements
 *   An expression resulting in a collection of elements to append to the given collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export default function Append(elements, collection) {
  arity.exact(2, arguments, Append.name)
  return new Expr({ append: wrap(elements), collection: wrap(collection) })
}

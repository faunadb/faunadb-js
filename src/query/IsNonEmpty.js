import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export default function IsNonEmpty(collection) {
  arity.exact(1, arguments, IsNonEmpty.name)
  return new Expr({ is_nonempty: wrap(collection) })
}

// Type check functions

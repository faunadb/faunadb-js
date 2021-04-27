import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be mapped over.
 * @param {module:query~ExprArg|function} lambda
 *   A function to be called for each element of the collection.
 * @return {Expr}
 * */
export default function Map(collection, lambda_expr) {
  arity.exact(2, arguments, Map.name)
  return new Expr({ map: wrap(lambda_expr), collection: wrap(collection) })
}

import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be filtered.
 * @param {module:query~ExprArg|function} lambda
 *   A function that returns a boolean used to filter unwanted values.
 * @return {Expr}
 * */
export default function Filter(collection, lambda_expr) {
  arity.exact(2, arguments, Filter.name)
  return new Expr({ filter: wrap(lambda_expr), collection: wrap(collection) })
}

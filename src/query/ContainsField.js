import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * @param {string} field
 *   A field name we want to confirm exists.
 * @param {module:query~ExprArg} obj
 *   An object to search against.
 * @return {Expr}
 */
export default function ContainsField(field, obj) {
  arity.exact(2, arguments, ContainsField.name)
  return new Expr({ contains_field: wrap(field), in: wrap(obj) })
}

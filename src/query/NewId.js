import Expr from '../Expr'
import { arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @return {Expr}
 */
export default function NewId() {
  arity.exact(0, arguments, NewId.name)
  return new Expr({ new_id: null })
}

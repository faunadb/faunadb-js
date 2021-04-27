import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the user defined function.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the user defined function's scope.
 * @return {Expr}
 */
export default function FaunaFunction(name, scope) {
  arity.between(1, 2, arguments, FaunaFunction.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ function: wrap(name) })
    case 2:
      return new Expr({ function: wrap(name), scope: wrap(scope) })
  }
}

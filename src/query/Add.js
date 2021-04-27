import Expr from '../Expr'
import { wrap, varargs, arity } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to sum together.
 * @return {Expr}
 */
export default function Add() {
  arity.min(1, arguments, Add.name)
  return new Expr({ add: wrap(varargs(arguments)) })
}

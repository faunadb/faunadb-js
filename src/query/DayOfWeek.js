import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns a time expression's day of the week following ISO-8601 convention, from 1 (Monday) to 7 (Sunday).
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to day of week.
 * @return {Expr}
 */
export default function DayOfWeek(expr) {
  arity.exact(1, arguments, DayOfWeek.name)
  return new Expr({ day_of_week: wrap(expr) })
}

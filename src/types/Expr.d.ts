import { values, Page as PageData, SetRef, Ref } from './values'
import { JsonObject } from './json'

export default Expr

export class Expr<T = any> {
  constructor(obj: JsonObject)

  readonly _isFaunaExpr?: boolean
  static toString(expr: Expr): string

  /** This enforces type nominality. */
  private _type: T
}

/** Materialize an `Expr` type into its result type. */
export type Materialize<T> = T extends ExprVal<Lambda>
  ? never
  : T extends Ref | SetRef
  ? T
  : T extends Expr<infer U>
  ? { [P in keyof U]: Materialize<U> }[keyof U]
  : T extends object
  ? { [P in keyof T]: Materialize<T[P]> }
  : T

/**
 * Evaluate the given type as an expression. Since nominal subtypes
 * of `Expr` (like `Ref`) are handled by `ToExpr`, they are omitted.
 * Use `Materialize` if you need them too.
 */
type Eval<T> = T extends Expr<infer U>
  ? (Expr extends T ? U : never)
  : T extends Lambda
  ? T
  : T extends object
  ? { [P in keyof T]: Eval<T[P]> | NominalExpr<T[P]> }
  : T

/** Extract nominal subtypes of `Expr` */
type NominalExpr<T> = T extends infer U
  ? (Expr extends U ? never : Extract<U, Expr>)
  : never

/** Convert all non-`Expr` types into `Expr` types */
export type ToExpr<T> =
  // Preserve nominal subtypes of `Expr`
  | NominalExpr<T>
  // Merge plain `Expr` types with primitive types
  | (Eval<T> extends infer U ? ([U] extends [void] ? never : Expr<U>) : never)

/** Add support for `Expr` types to any type. */
export type ExprVal<T = unknown> =
  | ToExpr<T>
  | (T extends Expr
      ? never
      : T extends Lambda
      ? T
      : T extends object
      ? { [P in keyof T]: ExprVal<T[P]> }
      : T)

export type Lambda<In extends any[] = any[], Out = any> = (
  ...args: { [P in keyof In]: ToExpr<In[P]> }
) => ToExpr<Out>

export namespace Expr {
  /** The expression type for a timestamp (nanosecond precision) */
  export class Time extends Expr<values.FaunaTime> {}

  /** The expression type for a page from a paginated set returned by `q.Paginate` */
  export class Page<T = any> extends Expr<PageData<T>> {}

  /** The expression type for an iterable collection of values */
  export type Iterable<T = any> = ExprVal<T[]> | SetRef<T> | Page<T>

  /** The expression type for a single value from an iterable */
  export type IterableVal<T extends Iterable> = T extends Iterable<infer U>
    ? ToExpr<U>
    : unknown

  /** The expression type for the `path` argument of `q.Select` */
  export type KeyPath = ExprVal<string | number | (number | string)[]>

  /** The expression type for the `lambda` argument of `q.Filter` */
  export type Filter<T> = ExprVal<Lambda<[T], boolean>>

  /** The expression type that can be mapped with `q.Map` */
  export type Mappable<T = any> = Exclude<Iterable<T>, SetRef>

  /** The expression type returned by `q.Map` */
  export type MapResult<T extends Mappable, Out> = T extends Page
    ? Page<Out>
    : Expr<Out[]>
}

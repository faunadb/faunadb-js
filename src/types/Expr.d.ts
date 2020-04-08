import { values } from './values'

export default Expr

export class Expr<T = any> {
  constructor(obj: object)

  readonly _isFaunaExpr?: boolean
  static toString(expr: Expr): string

  // This prevents structural type equality with empty objects.
  private _exprType: T
}

/** Materialize an `Expr` type into its result type. */
export type Materialize<T> = T extends ExprVal<Lambda>
  ? never
  : T extends Expr<infer U>
  ? U
  : T extends object
  ? { [P in keyof T]: Materialize<T[P]> }
  : T

/**
 * Evaluate the given type as an expression. Since nominal subtypes
 * of `Expr` (like `Expr.Ref`) are handled by `ToExpr`, they are
 * omitted. Use `Materialize` if you need them too.
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
  | (Eval<T> extends infer U ? ([U] extends [never] ? never : Expr<U>) : never)

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

export interface Collection<T extends object, Meta extends object = any> {
  ref: Expr.CollectionRef<T, Meta>
  ts: number
  name: string
  data: Meta
  permissions?: object
  history_days: number | null
  ttl_days?: number
}

export interface Document<T extends object> {
  data: T
  ref: Expr.DocumentRef<T>
  ts: number
}

export interface Index<T extends object, Meta extends object = any> {
  ref: Expr.IndexRef<T, Meta>
  ts: number
  name: string
  data: Meta
  source: Expr.CollectionRef<any> | any[]
  partitions: number
  active: boolean
  serialized?: boolean
  unique?: boolean
  terms?: any[]
  values?: any[]
  permissions?: object
}

export interface Function<Return, Meta extends object = any> {
  ref: Expr.FunctionRef<Return, Meta>
  ts: number
  name: string
  data: Meta
  body: object
  role?: any
}

export namespace Expr {
  export class Ref<T = any> extends Expr<values.Ref> {
    // This prevents structural type equality.
    protected _type: 'Ref' & T
  }

  export class SetRef<T = any> extends Expr<values.SetRef> {
    // This prevents structural type equality.
    protected _type: 'SetRef' & T
  }

  export class DocumentRef<T extends object> extends Ref<Document<T>> {
    // This prevents structural type equality.
    protected _data: T
  }

  export class CollectionRef<
    T extends object,
    Meta extends object = any
  > extends Ref<Collection<T, Meta>> {
    // This prevents structural type equality.
    protected _data: T
    protected _meta: Meta
  }

  export class IndexRef<
    T extends object,
    Meta extends object = any
  > extends Ref<Index<T, Meta>> {
    // This prevents structural type equality.
    protected _data: T
    protected _meta: Meta
  }

  export class FunctionRef<Return, Meta extends object = any> extends Ref<
    Function<Return, Meta>
  > {
    // This prevents structural type equality.
    protected _return: Return
    protected _meta: Meta
  }

  /** The expression type for a timestamp (nanosecond precision) */
  export class Time extends Expr<values.FaunaTime> {
    // This prevents structural type equality.
    protected _type: 'Time'
  }

  /** The expression type for a page from a paginated set returned by `q.Paginate` */
  export class Page<T = any> extends Expr<values.Page<T>> {
    // This prevents structural type equality.
    protected _type: 'Page' & T
  }

  /** The expression type for an iterable collection of values */
  export type Iterable<T = any> = ExprVal<T[]> | SetRef<T> | Page<T>

  /** The expression type for a single value from an iterable */
  export type IterableVal<T extends Iterable> = T extends SetRef<infer U>
    ? Ref<U>
    : T extends Iterable<infer U>
    ? ToExpr<U>
    : unknown

  /** The expression type for the `path` argument of `q.Select` */
  export type KeyPath = ExprVal<(number | string)[]>

  /** The expression type for the `lambda` argument of `q.Filter` */
  export type Filter<T> = ExprVal<Lambda<[T], boolean>>

  /** The expression type that can be mapped with `q.Map` */
  export type Mappable<T = any> = Exclude<Iterable<T>, SetRef>

  /** The expression type returned by `q.Map` */
  export type MapResult<T extends Expr.Mappable, Out> = T extends Expr.Page
    ? Expr.Page<Out>
    : Expr<Out[]>
}

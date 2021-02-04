import Expr, { ExprVal, Lambda, ToExpr } from './Expr'
import { JsonObject } from './json'
import {
  Ref,
  SetRef,
  Document,
  DocumentRef,
  Collection,
  CollectionRef,
  Index,
  IndexRef,
  Function,
  FunctionRef,
} from './values'

export type ExprArg<T = unknown> = ExprVal<T> | Array<ExprVal<T>>

export type CreateParams<T extends object> = {
  data: T
  credentials?: JsonObject
  delegates?: JsonObject
  ttl?: Expr.Time
}

type Updatable<T extends object = any> =
  | DocumentRef<T>
  | CollectionRef<any, T>
  | IndexRef<any, T>
  | FunctionRef<any, T>

export type UpdateParams<T extends Updatable> = unknown & T extends DocumentRef<
  infer U
>
  ? {
      data?: Partial<U>
      credentials?: JsonObject
      delegates?: JsonObject
    }
  : T extends Ref<infer U>
  ? Omit<Partial<U>, 'ref' | 'ts'>
  : never

export type CreateCollectionParams<Meta extends object = any> = {
  name: string
  data?: Meta
  permissions?: JsonObject
  history_days?: number
  ttl_days?: number
}

export type CreateIndexParams<Meta extends object = any> = {
  name: string
  source: CollectionRef | any[]
  terms?: any[]
  values?: any[]
  unique?: boolean
  serialized?: boolean
  permissions?: JsonObject
  data?: Meta
}

export type PaginateParams = {
  ts?: number | Expr.Time
  size?: number
  before?: string
  after?: string
  events?: boolean
  sources?: boolean
}

export type FunctionParams<Meta extends object = any> = {
  name: string
  body: JsonObject
  data?: Meta
  role?: any
}

export module query {
  export function Ref<T extends object>(
    ref: CollectionRef<T>,
    id?: ExprVal<number | string>
  ): DocumentRef<T>

  // TODO
  export function Bytes(bytes: ExprArg | ArrayBuffer | Uint8Array): Expr
  export function Abort(msg: ExprArg): Expr
  export function At(timestamp: ExprArg, expr: ExprArg): Expr

  export function Let<T>(vars: ExprVal<object>, in_expr: Expr<T>): Expr<T>

  // TODO
  export function Var(varName: ExprArg): Expr

  export function If<T, U>(
    condition: ExprVal<boolean>,
    then: ExprVal<T>,
    _else: ExprVal<U>
  ): ToExpr<T | U>

  export function If<T>(
    condition: ExprVal<boolean>,
    then: ExprVal<T>,
    _else: ExprVal<T>
  ): ToExpr<T>

  export function Do<T>(arg1: ExprVal<T>): ToExpr<T>
  export function Do<T>(arg1: ExprVal, arg2: ExprVal<T>): ToExpr<T>
  export function Do<T>(
    arg1: ExprVal,
    arg2: ExprVal,
    arg3: ExprVal<T>
  ): ToExpr<T>
  export function Do<T>(
    arg1: ExprVal,
    arg2: ExprVal,
    arg3: ExprVal,
    arg4: ExprVal<T>
  ): ToExpr<T>
  export function Do<T>(
    arg1: ExprVal,
    arg2: ExprVal,
    arg3: ExprVal,
    arg4: ExprVal,
    arg5: ExprVal<T>
  ): ToExpr<T>
  export function Do<T>(...args: ExprVal[]): ToExpr<T>

  // TODO
  export function Object(fields: ExprArg): Expr

  export function Lambda<In extends any[], Out>(
    f: (...args: In) => Out
  ): Expr<Lambda<In, Out>>

  export function Lambda<In extends any[], Out>(
    var_name: ExprArg<string>,
    expr: ExprArg<Out>
  ): Expr<Lambda<In, Out>>

  export function Call<T>(ref: string | FunctionRef<T>, ...args: any[]): Expr<T>

  // TODO
  export function Query(lambda: ExprArg | Lambda): Expr

  export function Map<T extends Expr.Mappable, Out>(
    collection: T,
    lambda_expr: ExprVal<Lambda<[Expr.IterableVal<T>], Out>>
  ): Expr.MapResult<T, Out>

  // TODO
  export function Merge(
    object: ExprArg,
    values: ExprArg,
    resolver?: Expr | Lambda
  ): Expr

  export function Foreach<T extends Expr.Iterable>(
    collection: T,
    lambda_expr: ExprVal<Lambda<[Expr.IterableVal<T>]>>
  ): T

  export function Filter<T extends Expr.Iterable>(
    collection: T,
    lambda_expr: Expr.Filter<Expr.IterableVal<T>>
  ): T

  // TODO
  export function Take(number: ExprArg, collection: ExprArg): Expr
  export function Drop(number: ExprArg, collection: ExprArg): Expr
  export function Prepend(elements: ExprArg, collection: ExprArg): Expr
  export function Append(elements: ExprArg, collection: ExprArg): Expr
  export function Reverse(expr: ExprArg): Expr

  export function IsEmpty(collection: Expr.Iterable): Expr<boolean>

  // TODO
  export function IsNonEmpty(collection: ExprArg): Expr
  export function IsNumber(expr: ExprArg): Expr
  export function IsDouble(expr: ExprArg): Expr
  export function IsInteger(expr: ExprArg): Expr
  export function IsBoolean(expr: ExprArg): Expr
  export function IsNull(expr: ExprArg): Expr
  export function IsBytes(expr: ExprArg): Expr
  export function IsTimestamp(expr: ExprArg): Expr
  export function IsDate(expr: ExprArg): Expr
  export function IsString(expr: ExprArg): Expr
  export function IsArray(expr: ExprArg): Expr
  export function IsObject(expr: ExprArg): Expr
  export function IsRef(expr: ExprArg): Expr
  export function IsSet(expr: ExprArg): Expr
  export function IsDoc(expr: ExprArg): Expr
  export function IsLambda(expr: ExprArg): Expr
  export function IsCollection(expr: ExprArg): Expr
  export function IsDatabase(expr: ExprArg): Expr
  export function IsIndex(expr: ExprArg): Expr
  export function IsFunction(expr: ExprArg): Expr
  export function IsKey(expr: ExprArg): Expr
  export function IsToken(expr: ExprArg): Expr
  export function IsCredentials(expr: ExprArg): Expr
  export function IsRole(expr: ExprArg): Expr

  export function Get<T extends object>(
    ref: Ref<T> | SetRef<Ref<T>>,
    ts?: ExprVal<number | Expr.Time>
  ): Expr<T>

  // TODO
  export function KeyFromSecret(secret: ExprArg): Expr
  export function Reduce(
    lambda: ExprArg,
    initial: ExprArg,
    collection: ExprArg
  ): Expr

  export function Paginate<T>(
    set: SetRef<T>,
    params?: ExprVal<PaginateParams>
  ): Expr.Page<T>

  export function Exists(ref: Ref, ts?: ExprVal<number>): Expr<boolean>

  export function Create<T extends object>(
    collection_ref: CollectionRef<T>,
    params: ExprVal<CreateParams<T>>
  ): Expr<Document<T>>

  export function Update<T extends Updatable>(
    ref: T,
    params: ExprVal<UpdateParams<T>>
  ): Expr<T extends Ref<infer U> ? U : never>

  // TODO
  export function Replace(ref: ExprArg, params: ExprArg): Expr

  export function Delete<T extends object>(
    ref: Ref<T>
  ): Expr<{
    data?: T
    role?: string
    database?: string
    priority?: number
  }>

  // TODO
  export function Insert(
    ref: ExprArg,
    ts: ExprArg,
    action: ExprArg,
    params: ExprArg
  ): Expr
  export function Remove(ref: ExprArg, ts: ExprArg, action: ExprArg): Expr
  export function CreateClass(params: ExprArg): Expr

  export function CreateCollection<T extends object, Meta extends object = any>(
    params: ExprVal<CreateCollectionParams<Meta>>
  ): Expr<Collection<T, Meta>>

  // TODO
  export function CreateDatabase(params: ExprArg): Expr

  export function CreateIndex<T extends object, Meta extends object = any>(
    params: ExprVal<CreateIndexParams<Meta>>
  ): Expr<Index<T, Meta>>

  // TODO
  export function CreateKey(params: ExprArg): Expr

  export function CreateFunction<Return, Meta extends object = any>(
    params: ExprVal<FunctionParams<Meta>>
  ): Expr<Function<Return>>

  // TODO
  export function CreateRole(params: ExprArg): Expr
  export function CreateAccessProvider(params: ExprArg): Expr

  // TODO
  export function Singleton(ref: ExprArg): Expr
  export function Events(ref_set: ExprArg): Expr

  export function Match<T extends object>(
    index: IndexRef<T>,
    ...terms: any[]
  ): SetRef<DocumentRef<T>>

  // TODO
  export function Union(...sets: ExprArg[]): Expr
  export function Intersection(...sets: ExprArg[]): Expr
  export function Difference(...sets: ExprArg[]): Expr
  export function Distinct(set: ExprArg): Expr
  export function Join(source: ExprArg, target: ExprArg | Lambda): Expr

  // TODO
  export function Range(set: ExprArg, from: ExprArg, to: ExprArg): Expr
  export function Login(ref: ExprArg, params: ExprArg): Expr
  export function Logout(delete_tokens: ExprArg): Expr
  export function Identify(ref: ExprArg, password: ExprArg): Expr
  export function Identity(): Expr
  export function CurrentIdentity(): Expr
  export function HasIdentity(): Expr
  export function HasCurrentIdentity(): Expr
  export function CurrentToken(): Expr
  export function HasCurrentToken(): Expr

  // TODO
  export function Concat(strings: ExprArg, separator?: ExprArg): Expr
  export function Casefold(string: ExprArg, normalizer?: ExprArg): Expr
  export function ContainsStr(value: ExprArg, search: ExprArg): Expr
  export function ContainsStrRegex(value: ExprArg, pattern: ExprArg): Expr
  export function StartsWith(value: ExprArg, search: ExprArg): Expr
  export function EndsWith(value: ExprArg, search: ExprArg): Expr
  export function RegexEscape(value: ExprArg): Expr
  export function FindStr(value: ExprArg, find: ExprArg, start?: ExprArg): Expr
  export function FindStrRegex(
    value: ExprArg,
    find: ExprArg,
    start?: ExprArg,
    numResults?: ExprArg
  ): Expr
  export function Length(expr: ExprArg): Expr
  export function LowerCase(expr: ExprArg): Expr
  export function LTrim(expr: ExprArg): Expr
  export function NGram(terms: ExprArg, min?: ExprArg, max?: ExprArg): Expr
  export function Repeat(expr: ExprArg, number?: ExprArg): Expr
  export function ReplaceStr(
    expr: ExprArg,
    find: ExprArg,
    replace: ExprArg
  ): Expr
  export function ReplaceStrRegex(
    expr: ExprArg,
    find: ExprArg,
    replace: ExprArg,
    first?: ExprArg
  ): Expr
  export function RTrim(expr: ExprArg): Expr
  export function Space(expr: ExprArg): Expr
  export function SubString(
    expr: ExprArg,
    start?: ExprArg,
    length?: ExprArg
  ): Expr
  export function TitleCase(value: ExprArg): Expr
  export function Trim(expr: ExprArg): Expr
  export function UpperCase(expr: ExprArg): Expr
  export function Format(string: ExprArg, values: ExprArg): Expr

  export function Time(string: ExprVal<string>): Expr.Time

  // TODO
  export function Epoch(number: ExprArg, unit: ExprArg): Expr
  export function TimeAdd(base: ExprArg, offset: ExprArg, unit: ExprArg): Expr
  export function TimeSubtract(
    base: ExprArg,
    offset: ExprArg,
    unit: ExprArg
  ): Expr
  export function TimeDiff(start: ExprArg, finish: ExprArg, unit: ExprArg): Expr
  export function Date(string: ExprArg): Expr
  export function Now(): Expr
  export function DayOfWeek(expr: ExprArg): Expr
  export function DayOfYear(expr: ExprArg): Expr
  export function DayOfMonth(expr: ExprArg): Expr
  export function Hour(expr: ExprArg): Expr
  export function Minute(expr: ExprArg): Expr
  export function Second(expr: ExprArg): Expr
  export function Year(expr: ExprArg): Expr
  export function Month(expr: ExprArg): Expr

  // TODO
  export function NextId(): Expr
  export function NewId(): Expr
  export function Database(name: ExprArg, scope?: ExprArg): Expr

  // TODO: "scope" argument
  export function Index<T extends object, Meta extends object = any>(
    name: ExprVal<string>,
    scope?: ExprArg
  ): IndexRef<T, Meta>

  // TODO: "scope" argument
  export function Collection<T extends object, Meta extends object = any>(
    name: ExprVal<string>,
    scope?: ExprArg
  ): CollectionRef<T, Meta>

  // TODO: "scope" argument
  export function Function<Return, Meta extends object = any>(
    name: ExprVal<string>,
    scope?: ExprArg
  ): FunctionRef<Return, Meta>

  // TODO
  export function Role(name: ExprArg, scope?: ExprArg): Expr
  export function AccessProvider(name: ExprArg): Expr
  export function AccessProviders(scope?: ExprArg): Expr
  export function Databases(scope?: ExprArg): Expr

  // TODO: "scope" argument
  export function Collections(scope?: ExprArg): SetRef<CollectionRef>

  // TODO: "scope" argument
  export function Indexes(scope?: ExprArg): SetRef<IndexRef>

  // TODO: "scope" argument
  export function Functions(scope?: ExprArg): SetRef<FunctionRef>

  // TODO
  export function Roles(scope?: ExprArg): Expr
  export function Keys(scope?: ExprArg): Expr
  export function Tokens(scope?: ExprArg): Expr
  export function Credentials(scope?: ExprArg): Expr

  export function Equals(...args: any[]): Expr<boolean>

  export function ContainsPath(
    path: Expr.KeyPath,
    _in: ExprVal<object>
  ): Expr<boolean>

  // TODO
  export function ContainsField(field: string, _in: ExprArg): Expr
  export function ContainsValue(value: ExprArg, _in: ExprArg): Expr

  export function Select<T>(
    index: number,
    from: Expr.Page<T>,
    _default?: ExprVal<T>
  ): ToExpr<T>
  export function Select<T = any>(
    path: Expr.KeyPath,
    from: ExprVal<object>,
    _default?: ExprVal<T>
  ): ToExpr<T>

  // TODO
  export function SelectAll(path: ExprArg, from: ExprArg): Expr
  export function Abs(expr: ExprArg): Expr

  export function Add(...args: ExprVal<number>[]): Expr<number>

  // TODO
  export function BitAnd(...args: ExprArg[]): Expr
  export function BitNot(expr: ExprArg): Expr
  export function BitOr(...args: ExprArg[]): Expr
  export function BitXor(...args: ExprArg[]): Expr
  export function Ceil(expr: ExprArg): Expr
  export function Divide(...args: ExprArg[]): Expr
  export function Floor(expr: ExprArg): Expr
  export function Max(...args: ExprArg[]): Expr
  export function Min(...args: ExprArg[]): Expr
  export function Modulo(...args: ExprArg[]): Expr
  export function Multiply(...args: ExprArg[]): Expr
  export function Round(value: ExprArg, precision?: ExprArg): Expr
  export function Subtract(...args: ExprArg[]): Expr
  export function Sign(expr: ExprArg): Expr
  export function Sqrt(expr: ExprArg): Expr
  export function Trunc(value: ExprArg, precision?: ExprArg): Expr
  export function Count(expr: ExprArg): Expr
  export function Sum(expr: ExprArg): Expr
  export function Mean(expr: ExprArg): Expr
  export function Any(expr: ExprArg): Expr
  export function All(expr: ExprArg): Expr
  export function Acos(expr: ExprArg): Expr
  export function Asin(expr: ExprArg): Expr
  export function Atan(expr: ExprArg): Expr
  export function Cos(expr: ExprArg): Expr
  export function Cosh(expr: ExprArg): Expr
  export function Degrees(expr: ExprArg): Expr
  export function Exp(expr: ExprArg): Expr
  export function Hypot(value: ExprArg, exp?: ExprArg): Expr
  export function Ln(expr: ExprArg): Expr
  export function Log(expr: ExprArg): Expr
  export function Pow(value: ExprArg, exp?: ExprArg): Expr
  export function Radians(expr: ExprArg): Expr
  export function Sin(expr: ExprArg): Expr
  export function Sinh(expr: ExprArg): Expr
  export function Tan(expr: ExprArg): Expr
  export function Tanh(expr: ExprArg): Expr
  export function LT(...args: ExprArg[]): Expr
  export function LTE(...args: ExprArg[]): Expr
  export function GT(...args: ExprArg[]): Expr
  export function GTE(...args: ExprArg[]): Expr
  export function And(...args: ExprArg[]): Expr
  export function Or(...args: ExprArg[]): Expr

  export function Not(bool: ExprVal<boolean>): Expr<boolean>

  // TODO
  export function ToString(expr: ExprArg): Expr
  export function ToNumber(expr: ExprArg): Expr
  export function ToObject(expr: ExprArg): Expr
  export function ToArray(expr: ExprArg): Expr
  export function ToDouble(expr: ExprArg): Expr
  export function ToInteger(expr: ExprArg): Expr
  export function ToTime(expr: ExprArg): Expr
  export function ToDate(expr: ExprArg): Expr
  export function ToSeconds(expr: ExprArg): Expr
  export function ToMillis(expr: ExprArg): Expr
  export function ToMicros(expr: ExprArg): Expr

  // TODO
  export function MoveDatabase(from: ExprArg, to: ExprArg): Expr

  export function Documents<T extends object>(
    collection: CollectionRef<T>
  ): SetRef<DocumentRef<T>>

  // TODO
  export function ContainsPath(path: ExprArg, _in: ExprArg): Expr
  export function ContainsField(field: string, _in: ExprArg): Expr
  export function ContainsValue(value: ExprArg, _in: ExprArg): Expr
  export function Reverse(expr: ExprArg): Expr

  export function AccessProvider(name: ExprArg): Expr
}

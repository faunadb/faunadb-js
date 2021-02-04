import Expr, { Materialize } from './Expr'
import { ExprArg } from './query'
import PageHelper from './PageHelper'
import RequestResult from './RequestResult'
import { Subscription } from './Stream'

type StreamEventFields = ['action', 'document', 'diff', 'prev']

export interface ClientConfig {
  secret: string
  domain?: string
  scheme?: 'http' | 'https'
  port?: number
  timeout?: number
  queryTimeout?: number
  observer?: (res: RequestResult, client: Client) => void
  keepAlive?: boolean
  headers?: { [key: string]: string | number }
  fetch?: typeof fetch
}

export interface QueryOptions {
  secret?: string
  queryTimeout?: number
}

export default class Client {
  constructor(opts?: ClientConfig)
  query<T>(expr: ExprArg<T>, options?: QueryOptions): Promise<Materialize<T>>
  paginate(expr: Expr, params?: object, options?: QueryOptions): PageHelper
  ping(scope?: string, timeout?: number): Promise<string>
  stream(expr: Expr, options?: { fields?: StreamEventFields[] }): Subscription
}

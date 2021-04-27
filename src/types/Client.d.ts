import { fetch } from 'cross-fetch'
import { errors } from './errors'
import Expr from './Expr'
import PageHelper from './PageHelper'
import { ExprArg } from './query'
import RequestResult from './RequestResult'
import { Subscription } from './Stream'

export interface ClientConfig {
  secret: string
  domain?: string
  scheme?: 'http' | 'https'
  port?: number
  timeout?: number
  queryTimeout?: number
  observer?: <T extends object = object>(
    res: RequestResult<T | errors.FaunaHTTPError>,
    client: Client
  ) => void
  keepAlive?: boolean
  headers?: { [key: string]: string | number }
  fetch?: typeof fetch
}

export interface QueryOptions
  extends Partial<
    Pick<ClientConfig, 'secret' | 'queryTimeout' | 'fetch' | 'observer'>
  > {}

export default class Client {
  constructor(opts?: ClientConfig)
  query<T = object>(expr: ExprArg, options?: QueryOptions): Promise<T>
  paginate(expr: Expr, params?: object, options?: QueryOptions): PageHelper
  ping(scope?: string, timeout?: number): Promise<string>
}

import Expr from './Expr'

type StreamEventFields = ['action', 'document', 'diff', 'prev']

type StreamFn = (
  expr: Expr,
  options?: {
    fields?: StreamEventFields[]
  }
) => Subscription

export interface StreamApi extends StreamFn {
  document: StreamFn
}

export interface Subscription {
  on: <T extends keyof SubscriptionEventHandlers>(
    type: T,
    callback: SubscriptionEventHandlers[T]
  ) => this
  start: () => this
  close: () => void
}

type SubscriptionEventHandlers = {
  start: (type: 'start', txn: number, event: number) => void
  error: (
    type: 'error',
    txn: number,
    event: {
      code: string
      description: string
    }
  ) => void
  version: (
    type: 'version',
    txn: number,
    event: {
      action: 'create' | 'update' | 'delete'
      document: object
      diff: object
      prev: object
    }
  ) => void
  history_rewrite: (
    type: 'history_rewrite',
    txn: number,
    event: {
      action: 'history_rewrite'
      document: object
    }
  ) => void
  snapshot: (type: 'snapshot', txn: number, event: object) => void
}

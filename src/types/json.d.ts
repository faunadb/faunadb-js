import { values } from './values'

export type Json =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray
  | values.Value

export interface JsonObject {
  readonly [property: string]: Json | undefined
}

export interface JsonArray extends ReadonlyArray<Json> {}

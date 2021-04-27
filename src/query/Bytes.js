import { Bytes as BytesValue } from '../values'
import { arity } from './common'

/**
 * @param {Uint8Array|ArrayBuffer|module:query~ExprArg} bytes
 *   A base64 encoded string or a byte array
 * @return {Expr}
 */
export default function Bytes(bytes) {
  arity.exact(1, arguments, Bytes.name)
  return new BytesValue(bytes)
}

import Expr from '../Expr'
import { defaults } from '../_util'
import { arity, params, wrap } from './common'

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {module:query~ExprArg} terms
 *   A document from which to produce ngrams.
 * @param {?Object} opts
 *   An object of options
 *     - min: The minimum ngram size.
 *     - max: The maximum ngram size.
 * @return {Array|Value}
 */
export default function NGram(terms, min, max) {
  arity.between(1, 3, arguments, NGram.name)
  min = defaults(min, null)
  max = defaults(max, null)

  return new Expr(
    params({ ngram: wrap(terms) }, { min: wrap(min), max: wrap(max) })
  )
}

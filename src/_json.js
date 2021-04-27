'use strict'

import {
  Bytes,
  FaunaDate,
  FaunaTime,
  Native,
  Query,
  Ref,
  SetRef,
} from './values'

export function toJSON(object, pretty) {
  pretty = typeof pretty !== 'undefined' ? pretty : false

  if (pretty) {
    return JSON.stringify(object, null, '  ')
  } else {
    return JSON.stringify(object)
  }
}

export function parseJSON(json) {
  return JSON.parse(json, json_parse)
}

/*
 * Parses a line-separated JSON stream. For backwards compatibility with
 * concatenated JSON objects, it attempts to parse the received content as a
 * JSON object. Failures should occur when partial or multiple line-separated
 * JSON objects are received. Upon a parsing failure, attempt paring the
 * received content as line-separated JSON objects.
 *
 * See https://en.wikipedia.org/wiki/JSON_streaming#Line-delimited_JSON
 * See https://en.wikipedia.org/wiki/JSON_streaming#Concatenated_JSON
 *
 * @private
 */
export function parseJSONStreaming(content) {
  var values = []

  try {
    values.push(parseJSON(content))
    content = '' // whole content parsed
  } catch (err) {
    while (true) {
      var pos = content.indexOf('\n') + 1 // include \n
      if (pos <= 0) {
        break
      }
      var slice = content.slice(0, pos).trim()
      if (slice.length > 0) {
        // discards empty slices due to leading \n
        values.push(parseJSON(slice))
      }
      content = content.slice(pos)
    }
  }

  return {
    values: values,
    buffer: content,
  }
}

function json_parse(_, val) {
  if (typeof val !== 'object' || val === null) {
    return val
  } else if ('@ref' in val) {
    var ref = val['@ref']

    if (!('collection' in ref) && !('database' in ref)) {
      return Native.fromName(ref['id'])
    }

    var col = json_parse('collection', ref['collection'])
    var db = json_parse('database', ref['database'])

    return new Ref(ref['id'], col, db)
  } else if ('@obj' in val) {
    return val['@obj']
  } else if ('@set' in val) {
    return new SetRef(val['@set'])
  } else if ('@ts' in val) {
    return new FaunaTime(val['@ts'])
  } else if ('@date' in val) {
    return new FaunaDate(val['@date'])
  } else if ('@bytes' in val) {
    return new Bytes(val['@bytes'])
  } else if ('@query' in val) {
    return new Query(val['@query'])
  } else {
    return val
  }
}

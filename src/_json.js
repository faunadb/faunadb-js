'use strict'

var values = require('./values')

function toJSON(object, pretty) {
  pretty = typeof pretty !== 'undefined' ? pretty : false

  if (pretty) {
    return JSON.stringify(object, null, '  ')
  } else {
    return JSON.stringify(object)
  }
}

function parseJSON(json) {
  return JSON.parse(json, json_parse)
}

function parseJSONStreaming(json) {
  var results = []

  try {
    results.push(parseJSON(json))
  } catch (error) {
    var position

    /** JSON parse error message is throw by the browser */
    if (error.message.match(/JSON.parse/g)) {
      var matchResult = error.message.match(/column ([0-9+]*)/)
      position = matchResult[1] - 1
      /** Unexpected token message is throw by NodeJS */
    } else if (error.message.match(/Unexpected token/g)) {
      var matchResult = error.message.match(/at position ([0-9+]*)$/)
      position = matchResult[1]
    } else {
      throw error
    }

    var left = json.slice(0, position)
    var right = json.slice(position)

    results.push(parseJSONStreaming(left))
    results.push(parseJSONStreaming(right))
  }

  return results.flat()
}

function json_parse(_, val) {
  if (typeof val !== 'object' || val === null) {
    return val
  } else if ('@ref' in val) {
    var ref = val['@ref']

    if (!('collection' in ref) && !('database' in ref)) {
      return values.Native.fromName(ref['id'])
    }

    var col = json_parse('collection', ref['collection'])
    var db = json_parse('database', ref['database'])

    return new values.Ref(ref['id'], col, db)
  } else if ('@obj' in val) {
    return val['@obj']
  } else if ('@set' in val) {
    return new values.SetRef(val['@set'])
  } else if ('@ts' in val) {
    return new values.FaunaTime(val['@ts'])
  } else if ('@date' in val) {
    return new values.FaunaDate(val['@date'])
  } else if ('@bytes' in val) {
    return new values.Bytes(val['@bytes'])
  } else if ('@query' in val) {
    return new values.Query(val['@query'])
  } else {
    return val
  }
}

module.exports = {
  toJSON: toJSON,
  parseJSON: parseJSON,
  parseJSONStreaming: parseJSONStreaming,
}

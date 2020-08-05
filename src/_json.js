'use strict'

var values = require('./values')
var Expr = require('./Expr')

function faunaTypes(key, value) {
  if (key === '') {
    value = this[key]
  }

  if (
    key !== '' &&
    typeof value === 'undefined' &&
    typeof this !== 'undefined'
  ) {
    value = this[key]
  }

  if (value && value.constructor === Expr) {
    return value.raw
  }

  if (value instanceof values.Ref) {
    var ref = {
      id: value.id,
      collection: value.collection,
      database: value.database,
    }
    return { '@ref': ref }
  }

  if (value instanceof values.SetRef) {
    return { '@set': value.set }
  }

  if (value instanceof values.Query) {
    return { '@query': value.query }
  }

  if (value instanceof values.FaunaDate) {
    return { '@date': value.isoDate }
  }

  if (value instanceof values.FaunaTime) {
    return { '@ts': value.isoTime }
  }

  if (value instanceof values.Bytes) {
    return { '@bytes': value.bytes }
  }

  return value
}

function toJSON(object, pretty) {
  pretty = typeof pretty !== 'undefined' ? pretty : false

  if (pretty) {
    return JSON.stringify(object, faunaTypes, '  ')
  } else {
    return JSON.stringify(object, faunaTypes)
  }
}

function parseJSON(json) {
  return JSON.parse(json, json_parse)
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
}

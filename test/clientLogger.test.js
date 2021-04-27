'use strict'

import { logger } from '../src/clientLogger'
import * as query from '../src/query'
import * as util from './util'

var client
var collectionRef

// Polyfill for startsWith, which IE11 does not support
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0
    return this.indexOf(searchString, position) === position
  }
}

describe('clientLogger', () => {
  beforeAll(() => {
    // Hideous way to ensure the client is initialized.
    client = util.client()
    return client
      .query(query.CreateCollection({ name: 'logging_tests' }))
      .then(function(res) {
        collectionRef = res['ref']
      })
  })

  test('logging', () => {
    return captureLogged(function(loggingClient) {
      return loggingClient.ping()
    }).then(function(res) {
      var readLine = lineReader(res)
      expect(readLine()).toEqual('Fauna GET /ping')
      expect(readLine()).toEqual('  Response headers: {')

      // Skip through headers
      while (true) {
        var line = readLine()
        if (!line.startsWith('    ')) {
          expect(line).toEqual('  }')
          break
        }
      }

      expect(readLine()).toEqual('  Response JSON: {')
      expect(readLine()).toEqual('    "resource": "Scope write is OK"')
      expect(readLine()).toEqual('  }')
      expect(readLine()).toMatch(/^  Response \(200\): Network latency \d+ms$/)
    })
  })

  test('request content', () => {
    return captureLogged(function(client) {
      return client.query(query.Create(collectionRef, { data: {} }))
    }).then(function(res) {
      var readLine = lineReader(res)
      expect(readLine()).toEqual('Fauna POST /')
      expect(readLine()).toEqual('  Request JSON: {')
      expect(readLine()).toEqual('    "create": {')
      expect(readLine()).toEqual('      "@ref": {')
      expect(readLine()).toEqual('        "id": "logging_tests",')
      expect(readLine()).toEqual('        "collection": {')
      expect(readLine()).toEqual('          "@ref": {')
      expect(readLine()).toEqual('            "id": "collections"')
      expect(readLine()).toEqual('          }')
      expect(readLine()).toEqual('        }')
      expect(readLine()).toEqual('      }')
      expect(readLine()).toEqual('    },')
      expect(readLine()).toEqual('    "params": {')
      expect(readLine()).toEqual('      "object": {')
      expect(readLine()).toEqual('        "data": {')
      expect(readLine()).toEqual('          "object": {}')
      expect(readLine()).toEqual('        }')
      expect(readLine()).toEqual('      }')
      expect(readLine()).toEqual('    }')
      expect(readLine()).toEqual('  }')
      // Ignore the rest
    })
  })
})

function captureLogged(clientAction, clientParams) {
  if (typeof clientParams === 'undefined') {
    clientParams = {}
  }

  var logged
  var loggedClient = util.getClient(
    Object.assign(
      {
        observer: logger(function(str, client) {
          logged = str
        }),
      },
      clientParams
    )
  )

  return clientAction(loggedClient).then(function() {
    return logged
  })
}

function lineReader(str) {
  var lines = str.split('\n')
  return function() {
    return lines.shift()
  }
}

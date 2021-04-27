'use strict'
import dotenv from 'dotenv'
import Client from '../src/Client'
import Expr from '../src/Expr'
import * as query from '../src/query'
import * as values from '../src/values'
import * as util from '../src/_util'
dotenv.config()

var Database = query.Database
var Value = values.Value

var env = process.env

var testConfig
try {
  testConfig = require('../testConfig.json')
} catch (err) {
  testConfig = {
    domain: env.FAUNA_DOMAIN,
    scheme: env.FAUNA_SCHEME,
    port: env.FAUNA_PORT,
    auth: env.FAUNA_ROOT_KEY,
    auth0uri: env.AUTH_0_URI,
    auth0clientId: env.AUTH_0_CLIENT_ID,
    auth0clientSecret: env.AUTH_0_CLIENT_SECRET,
  }
}

var requiredConfigFields = [
  'domain',
  'scheme',
  'auth',
  'auth0uri',
  'auth0clientId',
  'auth0clientSecret',
]
var missedFields = requiredConfigFields.filter(key => !testConfig[key])
if (missedFields.length) {
  console.log(
    `Environment variables (${missedFields}) not defined. Please create a config file or set env vars.`
  )
  process.exit()
}

function takeObjectKeys(object) {
  var out = {}
  for (var i = 0; i < arguments.length; ++i) {
    var key = arguments[i]
    out[key] = object[key]
  }
  return out
}

function getCfg() {
  return util.removeUndefinedValues(
    takeObjectKeys(testConfig, 'domain', 'scheme', 'port')
  )
}

function getClient(opts) {
  return new Client(Object.assign({ secret: clientSecret }, getCfg(), opts))
}

function assertRejected(promise, errorType) {
  var succeeded = false

  return promise.then(
    function() {
      succeeded = true
      expect(!succeeded).toBeTruthy()
    },
    function(error) {
      if (!(error instanceof errorType)) {
        throw error
      }
    }
  )
}

// Set in before hook, so won't be null during tests
var _client = null
var clientSecret = null

function client() {
  return _client
}

function randomString(prefix) {
  var rand = ((Math.random() * 0xffffff) << 0).toString(16)
  return (prefix || '') + rand
}

function unwrapExpr(obj) {
  if (
    obj instanceof Value ||
    util.checkInstanceHasProperty(obj, '_isFaunaValue')
  ) {
    return obj
  } else if (
    obj instanceof Expr ||
    util.checkInstanceHasProperty(obj, '_isFaunaExpr')
  ) {
    return unwrapExprValues(obj.raw)
  } else {
    return obj
  }
}

function unwrapExprValues(obj) {
  if (Array.isArray(obj)) {
    return obj.map(function(elem) {
      return unwrapExpr(elem)
    })
  } else if (typeof obj === 'object') {
    var rv = {}

    Object.keys(obj).forEach(function(key) {
      rv[key] = unwrapExpr(obj[key])
    })

    return rv
  } else {
    return obj
  }
}

var rootClient = getClient({ secret: testConfig.auth })
var dbName = randomString('faunadb-js-test-')
var dbRef = query.Database(dbName)

// global before/after for every test

beforeAll(() => {
  return rootClient
    .query(query.CreateDatabase({ name: dbName }))
    .then(function() {
      return rootClient.query(
        query.CreateKey({ database: Database(dbName), role: 'admin' })
      )
    })
    .then(function(key) {
      clientSecret = key.secret
      _client = getClient()
    })
    .catch(function(exception) {
      console.log('failed: ' + exception)
    })
})

afterAll(() => {
  // disable line below to prevent db cleanup after the test
  return rootClient.query(query.Delete(dbRef))
})

function simulateBrowser() {
  global.window = {} // deceive util.isNodeEnv()
  global.navigator = { userAgent: '' } // mock browser navigator
}

function delay(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

module.exports = {
  testConfig: testConfig,
  getCfg: getCfg,
  getClient: getClient,
  assertRejected: assertRejected,
  client: client,
  clientSecret: clientSecret,
  rootClient: rootClient,
  dbRef: dbRef,
  unwrapExpr: unwrapExpr,
  randomString: randomString,
  simulateBrowser: simulateBrowser,
  delay: delay,
}

'use strict'

import Client from '../src/Client'
import * as errors from '../src/errors'
import * as query from '../src/query'
import * as json from '../src/_json'
import * as util from './util'

var client

describe('Client', () => {
  beforeAll(() => {
    // Hideous way to ensure that the client is initialized.
    client = util.client()

    return client.query(query.CreateCollection({ name: 'my_collection' }))
  })

  test('invalid key', () => {
    var badClient = util.getClient({ secret: { user: 'bad_key' } })
    return util.assertRejected(badClient.query(util.dbRef), errors.Unauthorized)
  })

  test('ping', () => {
    return client.ping('node').then(function(res) {
      expect(res).toEqual('Scope node is OK')
    })
  })

  test("omits the port value if it's falsy", () => {
    const client = new Client({
      secret: 'FAKED',
      port: 0,
    })

    expect(client._http._baseUrl.endsWith(':0')).toBeFalsy()
  })

  test('paginates', () => {
    return createDocument().then(function(document) {
      return client.paginate(document.ref).each(function(page) {
        page.forEach(function(i) {
          expect(document.ref).toEqual(i)
        })
      })
    })
  })

  test('updates the last txntime for a query', () => {
    var firstSeen = client.getLastTxnTime()

    var pEcho = client.query(42).then(function() {
      expect(client.getLastTxnTime()).toBeGreaterThanOrEqual(firstSeen)
    })

    var pCreate = client
      .query(query.CreateCollection({ name: 'foo_collection' }))
      .then(function(res) {
        expect(client.getLastTxnTime()).toBeGreaterThan(firstSeen)
      })

    return Promise.all([pEcho, pCreate])
  })

  test('manually updates the last txntime for a bigger time', () => {
    var firstSeen = client.getLastTxnTime()

    client.syncLastTxnTime(firstSeen - 1200)
    expect(firstSeen).toEqual(client.getLastTxnTime())

    var lastSeen = firstSeen + 1200
    client.syncLastTxnTime(lastSeen)
    expect(lastSeen).toEqual(client.getLastTxnTime())
  })

  test('extract response headers from observer', () => {
    var assertResults = function(result) {
      assertHeader(result.responseHeaders, 'x-read-ops')
      assertHeader(result.responseHeaders, 'x-write-ops')
      assertHeader(result.responseHeaders, 'x-storage-bytes-read')
      assertHeader(result.responseHeaders, 'x-storage-bytes-write')
      assertHeader(result.responseHeaders, 'x-query-bytes-in')
      assertHeader(result.responseHeaders, 'x-query-bytes-out')

      expect(result.endTime).toBeGreaterThan(result.startTime)
    }

    var observedClient = util.getClient({ observer: assertResults })

    return observedClient.query(
      query.CreateCollection({ name: 'bar_collection' })
    )
  })

  test('query observer', async () => {
    var clientObserver = jest.fn()
    var queryObserver = jest.fn()
    var client = util.getClient({ observer: clientObserver })

    await client.query(query.Now(), {
      observer: queryObserver,
    })
    expect(clientObserver).toBeCalled()
    expect(queryObserver).toBeCalled()
  })

  test('keeps connection alive', () => {
    var aliveClient = util.getClient({ keepAlive: true })

    // Keep alive agent is only applicable for fetch-backed HttpClient
    if (aliveClient._http.type !== 'fetch') {
      return
    }

    var notAliveClient = util.getClient({ keepAlive: false })

    expect(aliveClient._http._adapter._keepAliveEnabledAgent).not.toEqual(
      undefined
    )
    expect(notAliveClient._http._adapter._keepAliveEnabledAgent).toEqual(
      undefined
    )
  })

  test('sets authorization header per query', async function() {
    const resultWithoutOptions = await client.query(query.Do(1))
    const resultWithOptions = await client.query(query.Do(1), {
      secret: util.clientSecret,
    })

    return expect(resultWithoutOptions).toEqual(resultWithOptions)
  })

  test('sets authorization header per paginate', async function() {
    const resultWithoutOptions = await client
      .paginate(query.Collections())
      .nextPage()
    const resultWithOptions = await client
      .paginate(query.Collections(), null, {
        secret: util.clientSecret,
      })
      .nextPage()

    return expect(resultWithoutOptions).toEqual(resultWithOptions)
  })

  test('uses custom fetch', async function() {
    const fetch = jest.fn(() =>
      Promise.resolve({
        headers: new Set(),
        text: () => Promise.resolve('{ "success": "Ok" }'),
      })
    )
    const client = util.getClient({ fetch })
    await client.ping()
    expect(fetch).toBeCalled()
  })

  test('instantiate client using custom http timeout', async () => {
    const customTimeout = 3
    const mockedFetch = mockFetch({}, true)
    const clientWithTimeout = new Client({
      queryTimeout: customTimeout,
      fetch: mockedFetch,
    })

    return expect(clientWithTimeout.query(query.Databases())).rejects.toThrow(
      'Request aborted due to timeout'
    )
  })

  test('instantiate client using default queryTimeout', async () => {
    const mockedFetch = mockFetch()
    const clientWithDefaultTimeout = new Client({
      fetch: mockedFetch,
    })

    await clientWithDefaultTimeout.query(query.Databases())

    expect(mockedFetch).toBeCalledTimes(1)
    expect(mockedFetch.mock.calls[0][1].headers['X-Query-Timeout']).toEqual(
      60000
    )
  })

  test('instantiate client using custom queryTimeout', async () => {
    const mockedFetch = mockFetch()
    const clientWithCustomTimeout = new Client({
      fetch: mockedFetch,
      queryTimeout: 3000,
    })

    await clientWithCustomTimeout.query(query.Databases())

    expect(mockedFetch).toBeCalledTimes(1)
    expect(mockedFetch.mock.calls[0][1].headers['X-Query-Timeout']).toEqual(
      3000
    )
  })

  test('set query timeout using client.query()', async () => {
    const overrideQueryTimeout = 5000
    const mockedFetch = mockFetch()
    const client = new Client({ fetch: mockedFetch })

    await client.query(query.Databases(), {
      queryTimeout: overrideQueryTimeout,
    })

    expect(mockedFetch).toBeCalledTimes(1)
    expect(mockedFetch.mock.calls[0][1].headers['X-Query-Timeout']).toEqual(
      overrideQueryTimeout
    )
  })

  test('http2 session released', async () => {
    const http2SessionIdleTime = 500
    const client = util.getClient({
      http2SessionIdleTime: http2SessionIdleTime,
    })

    await client.query(query.Now())

    const internalSessionMap = client._http._adapter._sessionMap

    expect(Object.keys(internalSessionMap).length).toBe(1)

    await new Promise(resolve => setTimeout(resolve, http2SessionIdleTime + 1))

    expect(Object.keys(internalSessionMap).length).toBe(0)
  })

  test('Unauthorized error has the proper fields', async () => {
    const client = new Client({ secret: 'bad-key' })

    const request = client.query(query.Divide(1, 2))
    const response = await request.then(res => res).catch(err => err)
    const rawRes = response.requestResult.responseRaw
    const jsonRes = json.parseJSON(rawRes)
    const { errors } = jsonRes

    expect(response.name).toBeDefined()
    expect(response.message).toBeDefined()
    expect(response.description).toBeDefined()

    expect(response.name).toEqual('Unauthorized')
    expect(response.message).toEqual(errors[0].code)
    expect(response.description).toEqual(errors[0].description)
  })

  test('BadRequest error has the proper fields', async () => {
    const request = client.query(query.Divide(null, 2))
    const response = await request.then(res => res).catch(err => err)
    const rawRes = response.requestResult.responseRaw
    const jsonRes = json.parseJSON(rawRes)
    const { errors } = jsonRes

    expect(response.name).toBeDefined()
    expect(response.message).toBeDefined()
    expect(response.description).toBeDefined()

    expect(response.name).toEqual('BadRequest')
    expect(response.message).toEqual(errors[0].code)
    expect(response.description).toEqual(errors[0].description)
  })

  test('default headers has been applied', async () => {
    const mockedFetch = mockFetch()
    const clientWithDefaultTimeout = new Client({
      fetch: mockedFetch,
    })

    await clientWithDefaultTimeout.query(query.Databases())

    expect(mockedFetch).toBeCalledTimes(1)
    expect(
      mockedFetch.mock.calls[0][1].headers['X-FaunaDB-API-Version']
    ).toBeDefined()

    const driverEnvHeader = mockedFetch.mock.calls[0][1].headers['X-Driver-Env']
    const requiredKeys = [
      'driver',
      'driverVersion',
      'languageVersion',
      'env',
      'os',
    ]
    expect(
      requiredKeys.every(key => driverEnvHeader.includes(key))
    ).toBeDefined()
  })
})

function assertHeader(headers, name) {
  expect(headers[name]).not.toBeNull()
  expect(parseInt(headers[name])).toBeGreaterThanOrEqual(0)
}

function createDocument() {
  return client.query(query.Create(query.Collection('my_collection'), {}))
}

function mockFetch(content = {}, simulateTimeout) {
  return jest.fn().mockImplementation((_, opts) => {
    return new Promise((resolve, reject) => {
      if (!simulateTimeout) {
        return resolve({
          headers: new Set(),
          text: () => Promise.resolve(JSON.stringify(content)),
        })
      }

      if (!opts || !opts.signal) {
        return
      }

      const onAbort = () => {
        opts.signal.removeEventListener('abort', onAbort)

        // Fake AbortError emitted by fetch when the signal is provided
        // and AbortController#abort is called.
        const abortError = new (class extends Error {
          constructor() {
            super()
            this.name = 'AbortError'
          }
        })()

        reject(abortError)
      }

      opts.signal.addEventListener('abort', onAbort)
    })
  })
}

'use strict'

import PageHelper from '../src/PageHelper'
import * as query from '../src/query'
import * as util from './util'

var client

var NUM_INSTANCES = 100

var collectionRef,
  indexRef,
  instanceRefs = {},
  refsToIndex = {}
var tsCollectionRef, tsIndexRef, tsInstance1Ref, tsInstance1Ts

describe('page', () => {
  beforeAll(() => {
    client = util.client()

    var p1 = client
      .query(query.CreateCollection({ name: 'timestamped_things' }))
      .then(function(resp) {
        tsCollectionRef = resp.ref

        return client
          .query(
            query.CreateIndex({
              name: 'timestamped_things_by_collection',
              active: true,
              source: tsCollectionRef,
            })
          )
          .then(function(resp) {
            tsIndexRef = resp.ref
            return client.query(query.Create(tsCollectionRef))
          })
          .then(function(resp) {
            tsInstance1Ref = resp.ref
            tsInstance1Ts = resp.ts

            return client.query(query.Create(tsCollectionRef))
          })
      })

    var p2 = client
      .query(query.CreateCollection({ name: 'paged_things' }))
      .then(function(resp) {
        collectionRef = resp.ref
        return client
          .query(
            query.CreateIndex({
              name: 'things_by_collection',
              active: true,
              source: collectionRef,
              values: [{ field: ['data', 'i'] }, { field: 'ref' }],
            })
          )
          .then(function(resp) {
            indexRef = resp.ref

            var promises = []
            for (var i = 0; i < NUM_INSTANCES; ++i) {
              var p = client
                .query(query.Create(collectionRef, { data: { i: i } }))
                .then(function(resp) {
                  instanceRefs[resp.data.i] = resp.ref
                  refsToIndex[resp.ref] = resp.data.i
                })
              promises.push(p)
            }

            return Promise.all(promises)
          })
      })

    return Promise.all([p1, p2])
  })

  test('pages', () => {
    var page = new PageHelper(client, query.Match(indexRef))
    return page.each(function(p) {
      p.forEach(function(item) {
        var i = item[0]
        var ref = item[1]
        expect(ref).toEqual(instanceRefs[i])
      })
    })
  })

  test('maps pagination', () => {
    var i = 0
    var page = new PageHelper(client, query.Match(indexRef))
    return page
      .map(function(i) {
        return query.Select([1], i)
      })
      .each(function(p) {
        p.forEach(function(item) {
          expect(i).toEqual(refsToIndex[item])
          i += 1
        })
      })
      .then(function() {
        expect(i).toEqual(NUM_INSTANCES)
      })
  })

  test('filters pagination', () => {
    var i = 0
    var page = new PageHelper(client, query.Match(indexRef))
    return page
      .filter(function(i) {
        return query.Equals(query.Modulo([query.Select(0, i), 2]), 0)
      })
      .each(function(p) {
        p.forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i += 2
        })
      })
      .then(function() {
        expect(i).toEqual(NUM_INSTANCES)
      })
  })

  test('reverses pagination', () => {
    var i = NUM_INSTANCES - 1
    var page = new PageHelper(client, query.Match(indexRef), { before: null })
    return page
      .eachReverse(function(p) {
        p.reverse().forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i -= 1
        })
      })
      .then(function() {
        expect(i).toEqual(-1) // ensure we made it to the end of the set
      })
  })

  test('honors passed in cursor', () => {
    var i = 50
    var page = new PageHelper(client, query.Match(indexRef), { after: 50 })
    return page
      .each(function(p) {
        p.forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i += 1
        })
      })
      .then(function() {
        expect(i).toEqual(NUM_INSTANCES)
      })
  })

  test('honors passed in cursor in the reverse direction', () => {
    var i = 50
    var page = new PageHelper(client, query.Match(indexRef), { before: 51 })
    return page
      .eachReverse(function(p) {
        p.reverse().forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i -= 1
        })
      })
      .then(function() {
        expect(i).toEqual(-1)
      })
  })

  test('honors passed in cursor via the cursor option', () => {
    var i = 50
    var page = new PageHelper(client, query.Match(indexRef), {
      cursor: { after: 50 },
    })
    return page
      .each(function(p) {
        p.forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i += 1
        })
      })
      .then(function() {
        expect(i).toEqual(NUM_INSTANCES)
      })
  })

  test('honors passed in cursor in the reverse direction via the cursor option', () => {
    var i = 50
    var page = new PageHelper(client, query.Match(indexRef), {
      cursor: { before: 51 },
    })
    return page
      .eachReverse(function(p) {
        p.reverse().forEach(function(item) {
          expect(i).toEqual(refsToIndex[item[1]])
          i -= 1
        })
      })
      .then(function() {
        expect(i).toEqual(-1)
      })
  })

  test('honors size', () => {
    var i = 0
    var numPages = 20
    var pageSize = NUM_INSTANCES / numPages

    var page = new PageHelper(client, query.Match(indexRef), { size: pageSize })
    return page
      .each(function(item) {
        // Note that this relies on numPages being a factor of NUM_INSTANCES
        expect(item.length).toEqual(pageSize)
        i += 1
      })
      .then(function() {
        expect(i).toEqual(numPages)
      })
  })

  test('honors ts', () => {
    var page = new PageHelper(client, query.Match(tsIndexRef))
    var p1 = page.each(function(item) {
      expect(item.length).toEqual(2)
    })

    var page2 = new PageHelper(client, query.Match(tsIndexRef), {
      ts: tsInstance1Ts,
    })
    var p2 = page2.each(function(item) {
      expect(item.length).toEqual(1)
      expect(item[0]).toEqual(tsInstance1Ref)
    })

    return Promise.all([p1, p2])
  })

  test('honors events', () => {
    var page = new PageHelper(client, query.Match(indexRef), { events: true })
    return page.each(function(p) {
      p.forEach(function(item) {
        expect('ts' in item).toBeTruthy()
        expect('action' in item).toBeTruthy()
        expect('document' in item).toBeTruthy()
        expect('instance' in item).toBeTruthy()
        expect('data' in item).toBeTruthy()
      })
    })
  })

  test('honors sources', () => {
    var page = new PageHelper(client, query.Match(indexRef), { sources: true })
    return page.each(function(p) {
      p.forEach(function(item) {
        expect('sources' in item).toBeTruthy()
      })
    })
  })

  test('honors a combination of parameters', () => {
    var page = new PageHelper(client, query.Match(indexRef), {
      before: null,
      events: true,
      sources: true,
    })
    return page.each(function(p) {
      p.forEach(function(item) {
        expect('value' in item).toBeTruthy()
        expect('sources' in item).toBeTruthy()

        var value = item.value
        expect('ts' in value).toBeTruthy()
        expect('action' in value).toBeTruthy()
        expect('document' in value).toBeTruthy()
        expect('instance' in value).toBeTruthy()
        expect('data' in value).toBeTruthy()
      })
    })
  })

  test('iteratively paginates pages', () => {
    var page = new PageHelper(client, query.Match(indexRef), { size: 2 })

    return page
      .nextPage()
      .then(function(p) {
        expect(p.length).toEqual(2)
        expect(0).toEqual(refsToIndex[p[0][1]])
        expect(1).toEqual(refsToIndex[p[1][1]])
        return page.nextPage()
      })
      .then(function(p) {
        expect(p.length).toEqual(2)
        expect(2).toEqual(refsToIndex[p[0][1]])
        expect(3).toEqual(refsToIndex[p[1][1]])
      })
  })

  test('iteratively paginates pages in the reverse direction', () => {
    var page = new PageHelper(client, query.Match(indexRef), {
      before: null,
      size: 2,
    })

    return page
      .previousPage()
      .then(function(p) {
        expect(p.length).toEqual(2)
        expect(98).toEqual(refsToIndex[p[0][1]])
        expect(99).toEqual(refsToIndex[p[1][1]])
        return page.previousPage()
      })
      .then(function(p) {
        expect(p.length).toEqual(2)
        expect(96).toEqual(refsToIndex[p[0][1]])
        expect(97).toEqual(refsToIndex[p[1][1]])
      })
  })
}, 10000)

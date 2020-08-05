'use strict'

var errors = require('../src/errors')
var values = require('../src/values')
var query = require('../src/query')
var util = require('./util')
var Client = require('../src/Client')

var Ref = query.Ref

var FaunaDate = values.FaunaDate,
  FaunaTime = values.FaunaTime,
  SetRef = values.SetRef,
  Bytes = values.Bytes,
  Native = values.Native

var client
var serverClient
var adminClient

var collectionRef,
  nIndexRef,
  mIndexRef,
  nCoveredIndexRef,
  refN1,
  refM1,
  refN1M1,
  thimbleCollectionRef

describe('query', () => {
  beforeAll(async () => {
    // Hideous way to ensure that the client is initialized.
    client = util.client()

    const rootClient = util.rootClient
    const cfg = util.getCfg()
    const dbRef = await rootClient.query(util.dbRef).then(pluckRef)
    const serverKey = await rootClient.query(
      query.CreateKey({ database: dbRef, role: 'server' })
    )
    const adminKey = await rootClient.query(
      query.CreateKey({ database: dbRef, role: 'admin' })
    )

    serverClient = new Client({ ...cfg, secret: serverKey.secret })
    adminClient = new Client({ ...cfg, secret: adminKey.secret })

    return client
      .query(query.CreateCollection({ name: 'widgets' }))
      .then(function(document) {
        collectionRef = document.ref
        var nIndexRefP = client
          .query(
            query.CreateIndex({
              name: 'widgets_by_n',
              active: true,
              source: collectionRef,
              terms: [{ field: ['data', 'n'] }],
            })
          )
          .then(function(i) {
            nIndexRef = i.ref
          })

        var mIndexRefP = client
          .query(
            query.CreateIndex({
              name: 'widgets_by_m',
              active: true,
              source: collectionRef,
              terms: [{ field: ['data', 'm'] }],
            })
          )
          .then(function(i) {
            mIndexRef = i.ref
          })

        var nCoveredIndexRefP = client
          .query(
            query.CreateIndex({
              name: 'widgets_cost_by_p',
              active: true,
              source: collectionRef,
              terms: [{ field: ['data', 'p'] }],
              values: [{ field: ['data', 'cost'] }],
            })
          )
          .then(function(i) {
            nCoveredIndexRef = i.ref
          })

        return Promise.all([nIndexRefP, mIndexRefP, nCoveredIndexRefP]).then(
          function() {
            var createP = create({ n: 1, p: 1, cost: 10 })
              .then(function(i) {
                refN1 = i.ref
                return create({ m: 1, p: 1, cost: 15 })
              })
              .then(function(i) {
                refM1 = i.ref
                return create({ n: 1, m: 1, p: 1, cost: 10 })
              })
              .then(function(i) {
                refN1M1 = i.ref
              })
            var thimbleCollectionRefP = client
              .query(query.CreateCollection({ name: 'thimbles' }))
              .then(function(i) {
                thimbleCollectionRef = i.ref
              })

            return Promise.all([createP, thimbleCollectionRefP])
          }
        )
      })
  })

  test('echo values', () => {
    var pInteger = client.query(10).then(function(res) {
      expect(res).toEqual(10)
    })

    var pNumber = client.query(3.14).then(function(res) {
      expect(res).toEqual(3.14)
    })

    var pString = client.query('string').then(function(res) {
      expect(res).toEqual('string')
    })

    var pObject = client
      .query({ a: 1, b: 'string', c: 3.14, d: null })
      .then(function(res) {
        expect(res).toEqual({ a: 1, b: 'string', c: 3.14, d: null })
      })

    var pArray = client.query([1, 'string', 3.14, null]).then(function(res) {
      expect(res).toEqual([1, 'string', 3.14, null])
    })

    var pNull = client.query(null).then(function(res) {
      expect(res).toEqual(null)
    })

    var pSymbol = client.query(Symbol('foo')).then(function(res) {
      expect(res).toEqual('foo')
    })

    return Promise.all([
      pInteger,
      pNumber,
      pString,
      pObject,
      pArray,
      pNull,
      pSymbol,
    ])
  })

  // Basic forms

  test('abort', () => {
    return util.assertRejected(
      client.query(query.Abort('abort message')),
      errors.BadRequest
    )
  })

  test('at', () => {
    var client = util.client()

    var paginate = query.Paginate(nSet(1000))

    return create({ n: 1000 }).then(function(inst1) {
      return create({ n: 1000 }).then(function(inst2) {
        return create({ n: 1000 }).then(function(inst3) {
          var p1 = client.query(paginate).then(function(data) {
            expect(data.data).toEqual([inst1.ref, inst2.ref, inst3.ref])
          })

          var p2 = client
            .query(query.At(inst1.ts, paginate))
            .then(function(data) {
              expect(data.data).toEqual([inst1.ref])
            })

          return Promise.all([p1, p2])
        })
      })
    })
  })

  test('let/var', () => {
    return Promise.all([
      assertQuery(query.Let({ x: 1 }, query.Var('x')), 1),
      assertQuery(
        query.Let({ x: 1, y: 2 }, function(x, y) {
          return [x, y]
        }),
        [1, 2]
      ),
      assertQuery(
        query.Let([{ x: 1 }, { y: 2 }], function(x, y) {
          return [x, y]
        }),
        [1, 2]
      ),
      assertQuery(
        query.Let({ x: 1, y: query.Var('x') }, function(x, y) {
          return { a: x, b: y }
        }),
        { a: 1, b: 1 }
      ),
      assertQuery(
        query.Query(
          query.Lambda(_ =>
            query.Let([{ x: 1 }, { y: 2 }], function(x, y) {
              return [x, y]
            })
          )
        ),
        new values.Query({
          lambda: '_',
          expr: { let: { x: 1, y: 2 }, in: [{ var: 'x' }, { var: 'y' }] },
          api_version: '3',
        })
      ),
    ])
  })

  test('if', () => {
    var p1 = assertQuery(query.If(true, 't', 'f'), 't')
    var p2 = assertQuery(query.If(false, 't', 'f'), 'f')
    var p3 = assertQuery(query.If(true, null, null), null)
    return Promise.all([p1, p2, p3])
  })

  test('do', () => {
    var p1 = create().then(function(i) {
      var ref = i.ref
      return assertQuery(query.Do(query.Delete(ref), 1), 1).then(function() {
        return assertQuery(query.Exists(ref), false)
      })
    })

    var p2 = assertQuery(query.Do(1), 1)
    var p3 = assertQuery(query.Do(1, 2), 2)
    var p4 = assertQuery(query.Do([1, 2]), [1, 2])

    return Promise.all([p1, p2, p3, p4])
  })

  test('object', () => {
    var obj = query.Object({ x: query.Let({ x: 1 }, query.Var('x')) })
    return assertQuery(obj, { x: 1 })
  })

  test('lambda', () => {
    expect(function() {
      query.Lambda(function() {
        return 0
      })
    }).toThrow()

    expect(
      util.unwrapExpr(
        query.Lambda(function(a) {
          return query.Add(a, a)
        })
      )
    ).toEqual({ lambda: 'a', expr: { add: [{ var: 'a' }, { var: 'a' }] } })

    var multi_args = query.Lambda(function(a, b) {
      return [b, a]
    })
    expect(util.unwrapExpr(multi_args)).toEqual({
      lambda: ['a', 'b'],
      expr: [{ var: 'b' }, { var: 'a' }],
    })

    // function() works too
    expect(multi_args).toEqual(
      query.Lambda(function(a, b) {
        return [b, a]
      })
    )

    return assertQuery(query.Map([[1, 2], [3, 4]], multi_args), [
      [2, 1],
      [4, 3],
    ])
  })

  test('call function', () => {
    var body = query.Query(function(a, b) {
      return query.Concat([a, b], '/')
    })

    return client
      .query(query.CreateFunction({ name: 'concat_with_slash', body: body }))
      .then(function() {
        return assertQuery(
          query.Call(query.Function('concat_with_slash'), 'a', 'b'),
          'a/b'
        )
      })
  })

  test('call with object', () => {
    var body = query.Query(function(obj) {
      return query.Let(
        { a: query.Select('a', obj), b: query.Select('b', obj) },
        function(a, b) {
          return query.Concat([a, b], '/')
        }
      )
    })

    return client
      .query(
        query.CreateFunction({ name: 'concat_with_slash_obj', body: body })
      )
      .then(function() {
        return assertQuery(
          query.Call(query.Function('concat_with_slash_obj'), {
            a: 'a',
            b: 'b',
          }),
          'a/b'
        )
      })
  })

  test('echo query', () => {
    var lambda = function(x) {
      return x
    }

    return client.query(query.Query(lambda)).then(function(body) {
      return client.query(body).then(function(bodyEchoed) {
        expect(body).toEqual(bodyEchoed)
      })
    })
  })

  // Collection functions

  test('map', () => {
    var p1 = assertQuery(
      query.Map([1, 2, 3], function(a) {
        return query.Multiply([2, a])
      }),
      [2, 4, 6]
    )
    // Should work for manually constructed lambda too.
    var p2 = assertQuery(
      query.Map(
        [1, 2, 3],
        query.Lambda('a', query.Multiply([2, query.Var('a')]))
      ),
      [2, 4, 6]
    )

    var page = query.Paginate(nSet(1))
    var ns = query.Map(page, function(a) {
      return query.Select(['data', 'n'], query.Get(a))
    })
    var p3 = assertQuery(ns, { data: [1, 1] })
    return Promise.all([p1, p2, p3])
  })

  test('foreach', () => {
    return Promise.all([create(), create()])
      .then(function(results) {
        return [results[0].ref, results[1].ref]
      })
      .then(function(refs) {
        return client.query(query.Foreach(refs, query.Delete)).then(function() {
          var rv = []
          refs.forEach(function(ref) {
            rv.push(assertQuery(query.Exists(ref), false))
          })

          return Promise.all(rv)
        })
      })
  })

  test('filter', () => {
    var p1 = assertQuery(
      query.Filter([1, 2, 3, 4], function(a) {
        return query.Equals(query.Modulo(a, 2), 0)
      }),
      [2, 4]
    )

    // Works on page too
    var page = query.Paginate(nSet(1))
    var refsWithM = query.Filter(page, function(a) {
      return query.ContainsPath(['data', 'm'], query.Get(a))
    })
    var p2 = assertQuery(refsWithM, { data: [refN1M1] })

    return Promise.all([p1, p2])
  })

  test('take', () => {
    var p1 = assertQuery(query.Take(1, [1, 2]), [1])
    var p2 = assertQuery(query.Take(3, [1, 2]), [1, 2])
    var p3 = assertQuery(query.Take(-1, [1, 2]), [])

    return Promise.all([p1, p2, p3])
  })

  test('drop', () => {
    var p1 = assertQuery(query.Drop(1, [1, 2]), [2])
    var p2 = assertQuery(query.Drop(3, [1, 2]), [])
    var p3 = assertQuery(query.Drop(-1, [1, 2]), [1, 2])

    return Promise.all([p1, p2, p3])
  })

  test('prepend', () => {
    var p1 = assertQuery(query.Prepend([1, 2, 3], [4, 5, 6]), [
      1,
      2,
      3,
      4,
      5,
      6,
    ])
    // Fails for non-array.
    var p2 = assertBadQuery(query.Prepend([1, 2], 'foo'))

    return Promise.all([p1, p2])
  })

  test('append', () => {
    var p1 = assertQuery(query.Append([4, 5, 6], [1, 2, 3]), [1, 2, 3, 4, 5, 6])
    // Fails for non-array.
    var p2 = assertBadQuery(query.Append([1, 2], 'foo'))

    return Promise.all([p1, p2])
  })

  test('is_empty', () => {
    return create({ n: 100 }).then(function() {
      var p1 = assertQuery(query.IsEmpty([]), true)
      var p2 = assertQuery(query.IsEmpty([1, 2, 3]), false)

      var p3 = assertQuery(query.IsEmpty(query.Paginate(nSet(99))), true)
      var p4 = assertQuery(query.IsEmpty(query.Paginate(nSet(100))), false)

      return Promise.all([p1, p2, p3, p4])
    })
  })

  test('is_nonempty', () => {
    return create({ n: 100 }).then(function() {
      var p1 = assertQuery(query.IsNonEmpty([]), false)
      var p2 = assertQuery(query.IsNonEmpty([1, 2, 3]), true)

      var p3 = assertQuery(query.IsNonEmpty(query.Paginate(nSet(99))), false)
      var p4 = assertQuery(query.IsNonEmpty(query.Paginate(nSet(100))), true)

      return Promise.all([p1, p2, p3, p4])
    })
  })

  // Type check functions

  test('type check', async function() {
    const coll = await serverClient
      .query(query.CreateCollection({ name: util.randomString('collection_') }))
      .then(pluckRef)
    const index = await serverClient
      .query(
        query.CreateIndex({
          name: util.randomString('index_'),
          source: coll,
          active: true,
        })
      )
      .then(pluckRef)
    const doc = await serverClient
      .query(query.Create(coll, { credentials: { password: 'sekret' } }))
      .then(pluckRef)
    const db = await adminClient
      .query(query.CreateDatabase({ name: util.randomString('db_') }))
      .then(pluckRef)
    const fn = await serverClient
      .query(
        query.CreateFunction({
          name: util.randomString('fn_'),
          body: query.Query(query.Lambda('x', query.Var('x'))),
        })
      )
      .then(pluckRef)
    const key = await adminClient
      .query(query.CreateKey({ database: db, role: 'admin' }))
      .then(pluckRef)
    const tok = await serverClient.query(
      query.Login(doc, { password: 'sekret' })
    )
    const role = await adminClient
      .query(
        query.CreateRole({
          name: util.randomString('role_'),
          membership: [],
          privileges: [],
        })
      )
      .then(pluckRef)
    const sessionClient = new Client({ ...util.getCfg(), secret: tok.secret })
    const cred = await sessionClient
      .query(query.Get(query.Ref('credentials/self')))
      .then(pluckRef)
    const token = tok.ref

    const trueExprs = [
      query.IsNumber(3.14),
      query.IsNumber(10),
      query.IsDouble(3.14),
      query.IsInteger(10),
      query.IsBoolean(true),
      query.IsBoolean(false),
      query.IsNull(null),
      query.IsBytes(new Uint8Array([1, 2, 3, 4])),
      query.IsTimestamp(query.Now()),
      query.IsTimestamp(query.Epoch(1, 'second')),
      query.IsTimestamp(query.Time('1970-01-01T00:00:00Z')),
      query.IsDate(query.ToDate(query.Now())),
      query.IsDate(query.Date('1970-01-01')),
      query.IsString('string'),
      query.IsArray([10]),
      query.IsObject({ x: 10 }),
      query.IsObject(query.Paginate(query.Collections())),
      query.IsObject(query.Get(doc)),
      query.IsRef(coll),
      query.IsSet(query.Collections()),
      query.IsSet(query.Match(index)),
      query.IsSet(query.Union(query.Match(index))),
      query.IsDoc(doc),
      query.IsDoc(query.Get(doc)),
      query.IsLambda(query.Query(query.Lambda('x', query.Var('x')))),
      query.IsCollection(coll),
      query.IsCollection(query.Get(coll)),
      query.IsDatabase(db),
      query.IsDatabase(query.Get(db)),
      query.IsIndex(index),
      query.IsIndex(query.Get(index)),
      query.IsFunction(fn),
      query.IsFunction(query.Get(fn)),
      query.IsKey(key),
      query.IsKey(query.Get(key)),
      query.IsToken(token),
      query.IsToken(query.Get(token)),
      query.IsCredentials(cred),
      query.IsCredentials(query.Get(cred)),
      query.IsRole(role),
      query.IsRole(query.Get(role)),
    ]

    const p1 = assertQueryWithClient(
      adminClient,
      trueExprs,
      trueExprs.map(() => true)
    )

    const falseExprs = [
      query.IsNumber('string'),
      query.IsNumber([]),
      query.IsDouble(10),
      query.IsInteger(3.14),
      query.IsBoolean('string'),
      query.IsBoolean(10),
      query.IsNull('string'),
      query.IsBytes([0x1, 0x2, 0x3, 0x4]),
      query.IsTimestamp(query.ToDate(query.Now())),
      query.IsTimestamp(10),
      query.IsDate(query.Now()),
      query.IsDate(10),
      query.IsString([]),
      query.IsString(10),
      query.IsArray({ x: 10 }),
      query.IsObject([10]),
      query.IsRef(query.Match(index)),
      query.IsRef(10),
      query.IsSet('string'),
      query.IsDoc({}),
      query.IsLambda(fn),
      query.IsLambda(query.Get(fn)),
      query.IsCollection(db),
      query.IsCollection(query.Get(db)),
      query.IsDatabase(coll),
      query.IsDatabase(query.Get(coll)),
      query.IsIndex(coll),
      query.IsIndex(query.Get(db)),
      query.IsFunction(index),
      query.IsFunction(query.Get(coll)),
      query.IsKey(db),
      query.IsKey(query.Get(index)),
      query.IsToken(index),
      query.IsToken(query.Get(cred)),
      query.IsCredentials(token),
      query.IsCredentials(query.Get(role)),
      query.IsRole(coll),
      query.IsRole(query.Get(index)),
    ]

    const p2 = assertQueryWithClient(
      adminClient,
      falseExprs,
      falseExprs.map(() => false)
    )

    return Promise.all([p1, p2])
  })

  // Read functions

  test('get', () => {
    return create().then(function(document) {
      return assertQuery(query.Get(document.ref), document)
    })
  })

  test('key_from_secret', () => {
    var client = util.rootClient

    return client
      .query(query.CreateKey({ database: util.dbRef, role: 'server' }))
      .then(function(key) {
        var p1 = client.query(query.Get(key.ref))
        var p2 = client.query(query.KeyFromSecret(key.secret))

        return Promise.all([p1, p2]).then(function(keys) {
          expect(keys[0]).toEqual(keys[1])
        })
      })
  })

  test('reduce', () => {
    var client = util.client()

    return client
      .query(query.CreateCollection({ name: 'reduce_cls' }))
      .then(function(cls) {
        return client
          .query(
            query.CreateIndex({
              name: 'reduce_idx',
              source: cls.ref,
              values: [{ field: ['data', 'value'] }],
              active: true,
            })
          )
          .then(function(index) {
            return client
              .query(
                query.Foreach(
                  range(1, 100),
                  query.Lambda(i =>
                    query.Create(cls.ref, { data: { value: i } })
                  )
                )
              )
              .then(function(insts) {
                var lambda = query.Lambda((acc, value) => query.Add(acc, value))

                //array
                var p1 = client
                  .query(query.Reduce(lambda, 10, range(1, 100)))
                  .then(function(returned) {
                    expect(returned).toEqual(5060)
                  })

                //page
                var p2 = client
                  .query(
                    query.Reduce(
                      lambda,
                      10,
                      query.Paginate(query.Match(index.ref), { size: 100 })
                    )
                  )
                  .then(function(returned) {
                    expect(returned).toEqual({ data: [5060] })
                  })

                //set
                var p3 = client
                  .query(query.Reduce(lambda, 10, query.Match(index.ref)))
                  .then(function(returned) {
                    expect(returned).toEqual(5060)
                  })

                return Promise.all([p1, p2, p3])
              })
          })
      })
  })

  test('paginate', () => {
    var testSet = nSet(1)
    var p1 = assertQuery(query.Paginate(testSet), { data: [refN1, refN1M1] })
    var p2 = assertQuery(query.Paginate(testSet, { size: 1 }), {
      data: [refN1],
      after: [refN1M1],
    })
    var p3 = assertQuery(query.Paginate(testSet, { sources: true }), {
      data: [
        { sources: [new SetRef(util.unwrapExpr(testSet))], value: refN1 },
        { sources: [new SetRef(util.unwrapExpr(testSet))], value: refN1M1 },
      ],
    })

    return Promise.all([p1, p2, p3])
  })

  test('exists', () => {
    return create().then(function(i) {
      var ref = i.ref
      return assertQuery(query.Exists(ref), true)
        .then(function() {
          return client.query(query.Delete(ref))
        })
        .then(function() {
          return assertQuery(query.Exists(ref), false)
        })
    })
  })

  // Write functions

  test('create', () => {
    return create().then(function(document) {
      expect('ref' in document).toBeTruthy()
      expect('ts' in document).toBeTruthy()
      expect(document.ref.collection).toEqual(collectionRef)
    })
  })

  test('update', () => {
    return create().then(function(i) {
      var ref = i.ref
      return client
        .query(query.Update(ref, { data: { m: 9 } }))
        .then(function(got) {
          expect(got.data).toEqual({ n: 0, m: 9 })
          return client.query(query.Update(ref, { data: { m: null } }))
        })
        .then(function(got) {
          expect(got.data).toEqual({ n: 0 })
        })
    })
  })

  test('replace', () => {
    return create()
      .then(function(i) {
        var ref = i.ref
        return client.query(query.Replace(ref, { data: { m: 9 } }))
      })
      .then(function(got) {
        expect(got.data).toEqual({ m: 9 })
      })
  })

  test('delete', () => {
    return create().then(function(i) {
      var ref = i.ref
      client.query(query.Delete(ref)).then(function() {
        assertQuery(query.Exists(ref), false)
      })
    })
  })

  test('insert', () => {
    return createThimble({ weight: 1 }).then(function(document) {
      var ref = document.ref
      var ts = document.ts
      var prevTs = ts - 1

      var inserted = { data: { weight: 0 } }

      return client
        .query(query.Insert(ref, prevTs, 'create', inserted))
        .then(function() {
          return client.query(query.Get(ref, prevTs))
        })
        .then(function(old) {
          expect(old.data).toEqual({ weight: 0 })
        })
    })
  })

  test('remove', () => {
    return createThimble({ weight: 0 }).then(function(document) {
      var ref = document.ref

      return client
        .query(query.Replace(ref, { data: { weight: 1 } }))
        .then(function(newDocument) {
          return assertQuery(query.Get(ref), newDocument)
            .then(function() {
              return client.query(query.Remove(ref, newDocument.ts, 'create'))
            })
            .then(function() {
              return assertQuery(query.Get(ref), document)
            })
        })
    })
  })

  test('create function', () => {
    var body = query.Query(function(x) {
      return x
    })

    return client
      .query(query.CreateFunction({ name: 'a_function', body: body }))
      .then(function() {
        return assertQuery(query.Exists(query.Function('a_function')), true)
      })
  })

  test('create role', () => {
    return withNewDatabase().then(function(client) {
      return client
        .query(
          query.CreateRole({
            name: 'a_role',
            privileges: [
              {
                resource: query.Databases(),
                actions: { read: true },
              },
            ],
          })
        )
        .then(function() {
          return assertQueryWithClient(
            client,
            query.Exists(query.Role('a_role')),
            true
          )
        })
    })
  })

  // Sets

  test('events', () => {
    return create().then(function(created) {
      var ref = created['ref']

      return client
        .query(query.Update(ref, { data: { n: 100 } }))
        .then(function() {
          return client.query(query.Delete(ref)).then(function() {
            return client
              .query(query.Paginate(query.Events(ref)))
              .then(function(result) {
                var events = result['data']

                expect(events.length).toEqual(3)

                expect(events[0].action).toEqual('create')
                expect(events[0].document).toEqual(ref)

                expect(events[1].action).toEqual('update')
                expect(events[1].document).toEqual(ref)

                expect(events[2].action).toEqual('delete')
                expect(events[2].document).toEqual(ref)
              })
          })
        })
    })
  })

  test('singleton', () => {
    return create().then(function(created) {
      var ref = created['ref']

      return client
        .query(query.Update(ref, { data: { n: 100 } }))
        .then(function() {
          return client.query(query.Delete(ref)).then(function() {
            return client
              .query(query.Paginate(query.Events(query.Singleton(ref))))
              .then(function(result) {
                var events = result['data']

                expect(events.length).toEqual(2)

                expect(events[0].action).toEqual('add')
                expect(events[0].document).toEqual(ref)

                expect(events[1].action).toEqual('remove')
                expect(events[1].document).toEqual(ref)
              })
          })
        })
    })
  })

  test('match', () => {
    return assertSet(nSet(1), [refN1, refN1M1])
  })

  test('union', () => {
    return assertSet(query.Union(nSet(1), mSet(1)), [refN1, refM1, refN1M1])
  })

  test('merge', () => {
    var p1 = assertQuery(query.Merge({}, { x: 10, y: 20 }), { x: 10, y: 20 })
    var p2 = assertQuery(query.Merge({ one: 1 }, { two: 2 }), {
      one: 1,
      two: 2,
    })
    var p3 = assertQuery(
      query.Merge({ x: 'x', y: 'y', z: 'z' }, { z: 'Zzz' }),
      { x: 'x', y: 'y', z: 'Zzz' }
    )
    var p4 = assertQuery(
      query.Merge({}, [{ x: 'x' }, { y: 'y' }, { z: 'z' }]),
      { x: 'x', y: 'y', z: 'z' }
    )
    var p5 = assertQuery(
      query.Merge(
        { x: 'A' },
        { x: 'x', y: 'y', z: 'z' },
        query.Lambda((key, left, right) => {
          return left
        })
      ),
      { x: 'A' }
    )

    return Promise.all([p1, p2, p3, p4, p5])
  })

  test('intersection', () => {
    return assertSet(query.Intersection(nSet(1), mSet(1)), [refN1M1])
  })

  test('difference', () => {
    return assertSet(query.Difference(nSet(1), mSet(1)), [refN1]) // but not refN1M1
  })

  test('distinct', () => {
    var nonDistinctP = assertSet(query.Match(nCoveredIndexRef, 1), [10, 10, 15])
    var distinctP = assertSet(
      query.Distinct(query.Match(nCoveredIndexRef, 1)),
      [10, 15]
    )

    return Promise.all([nonDistinctP, distinctP])
  })

  test('join', () => {
    return create({ n: 12 })
      .then(function(res1) {
        return create({ n: 12 }).then(function(res2) {
          return [res1.ref, res2.ref]
        })
      })
      .then(function(referenced) {
        return create({ m: referenced[0] })
          .then(function(res1) {
            return create({ m: referenced[1] }).then(function(res2) {
              return [res1.ref, res2.ref]
            })
          })
          .then(function(referencers) {
            var source = nSet(12)

            var p1 = assertSet(source, referenced)

            // For each obj with n=12, get the set of elements whose data.m refers to it.
            var joined = query.Join(source, function(a) {
              return query.Match(mIndexRef, a)
            })
            var p2 = assertSet(joined, referencers)

            var joinedNonLambda = query.Join(source, mIndexRef)
            var p3 = assertSet(joinedNonLambda, referencers)
            return Promise.all([p1, p2, p3])
          })
      })
  })

  // Authentication

  test('range', () => {
    return client
      .query(query.CreateCollection({ name: 'range_cls' }))
      .then(function(cls) {
        return client
          .query(
            query.CreateIndex({
              name: 'range_idx',
              source: cls.ref,
              values: [{ field: ['data', 'value'] }],
              active: true,
            })
          )
          .then(function(index) {
            return client
              .query(
                query.Foreach(
                  range(1, 20),
                  query.Lambda(i =>
                    query.Create(cls.ref, { data: { value: i } })
                  )
                )
              )
              .then(function() {
                var m = query.Match(index.ref)

                var p1 = client
                  .query(query.Paginate(query.Range(m, 3, 7)))
                  .then(function(returned) {
                    expect(returned).toEqual({ data: range(3, 7) })
                  })

                var p2 = client
                  .query(
                    query.Paginate(
                      query.Union(query.Range(m, 1, 10), query.Range(m, 11, 20))
                    )
                  )
                  .then(function(returned) {
                    expect(returned).toEqual({ data: range(1, 20) })
                  })

                var p3 = client
                  .query(
                    query.Paginate(
                      query.Difference(
                        query.Range(m, 1, 20),
                        query.Range(m, 11, 20)
                      )
                    )
                  )
                  .then(function(returned) {
                    expect(returned).toEqual({ data: range(1, 10) })
                  })

                var p4 = client
                  .query(
                    query.Paginate(
                      query.Intersection(
                        query.Range(m, 1, 20),
                        query.Range(m, 5, 15)
                      )
                    )
                  )
                  .then(function(returned) {
                    expect(returned).toEqual({ data: range(5, 15) })
                  })

                return Promise.all([p1, p2, p3, p4])
              })
          })
      })
  })

  test('login/logout', () => {
    return client
      .query(
        query.Create(collectionRef, { credentials: { password: 'sekrit' } })
      )
      .then(function(result) {
        var documentRef = result.ref
        return client
          .query(query.Login(documentRef, { password: 'sekrit' }))
          .then(async function(result2) {
            var secret = result2.secret
            var instanceClient = util.getClient({ secret: secret })

            return instanceClient
              .query(query.Select('ref', query.Get(documentRef)))
              .then(function(result3) {
                expect(result3).toEqual(documentRef)

                return instanceClient.query(query.Logout(true))
              })
              .then(function(logoutResult) {
                expect(logoutResult).toBe(true)
              })
          })
      })
  })

  test('identify', () => {
    return client
      .query(
        query.Create(collectionRef, { credentials: { password: 'sekrit' } })
      )
      .then(function(result) {
        var documentRef = result.ref
        return assertQuery(query.Identify(documentRef, 'sekrit'), true)
      })
  })

  test('has_identity', () => {
    return client
      .query(
        query.Create(collectionRef, { credentials: { password: 'sekrit' } })
      )
      .then(function(result) {
        return client
          .query(query.Login(result['ref'], { password: 'sekrit' }))
          .then(function(login) {
            var new_client = util.getClient({ secret: login['secret'] })

            return Promise.all([
              assertQueryWithClient(client, query.HasIdentity(), false),
              assertQueryWithClient(new_client, query.HasIdentity(), true),
            ])
          })
      })
  })

  test('identity', () => {
    return client
      .query(
        query.Create(collectionRef, { credentials: { password: 'sekrit' } })
      )
      .then(function(result) {
        return client
          .query(query.Login(result['ref'], { password: 'sekrit' }))
          .then(function(login) {
            var new_client = util.getClient({ secret: login['secret'] })

            return assertQueryWithClient(
              new_client,
              query.Identity(),
              result['ref']
            )
          })
      })
  })

  // String functions

  test('concat', () => {
    var p1 = assertQuery(query.Concat(['a', 'b', 'c']), 'abc')
    var p2 = assertQuery(query.Concat([]), '')
    var p3 = assertQuery(query.Concat(['a', 'b', 'c'], '.'), 'a.b.c')

    return Promise.all([p1, p2, p3])
  })

  test('casefold', () => {
    return Promise.all([
      assertQuery(query.Casefold('Hen Wen'), 'hen wen'),

      // https://unicode.org/reports/tr15/
      assertQuery(query.Casefold('\u212B', 'NFD'), 'A\u030A'),
      assertQuery(query.Casefold('\u212B', 'NFC'), '\u00C5'),
      assertQuery(query.Casefold('\u1E9B\u0323', 'NFKD'), '\u0073\u0323\u0307'),
      assertQuery(query.Casefold('\u1E9B\u0323', 'NFKC'), '\u1E69'),

      assertQuery(query.Casefold('\u212B', 'NFKCCaseFold'), '\u00E5'),
    ])
  })

  test('containsstr', () => {
    return Promise.all([
      assertQuery(query.ContainsStr('ABC', 'A'), true),
      assertQuery(query.ContainsStr('ABC', 'D'), false),
      assertQuery(query.ContainsStr('a big apple', 'g a'), true),
    ])
  })

  test('containsstrregex', () => {
    return Promise.all([
      assertQuery(query.ContainsStrRegex('ABCDEFGHIJK', '[A-Z]'), true),
      assertQuery(query.ContainsStrRegex('1234567890', '[A-Z]'), false),
      assertQuery(query.ContainsStrRegex('ABCDEFGHIJK', '[a-z]'), false),
    ])
  })

  test('startswith', () => {
    return Promise.all([
      assertQuery(query.StartsWith('ABCDEFGHIJK', 'ABC'), true),
      assertQuery(query.StartsWith('1234567890', '1234567890'), true),
      assertQuery(query.StartsWith('ABCDEFGHIJK', 'BCD'), false),
    ])
  })

  test('endswith', () => {
    return Promise.all([
      assertQuery(query.EndsWith('ABCDEFGHIJK', 'IJK'), true),
      assertQuery(query.EndsWith('1234567890', '1234567890'), true),
      assertQuery(query.EndsWith('ABCDEFGHIJK', 'HIJ'), false),
    ])
  })

  test('regexescape', () => {
    return Promise.all([
      assertQuery(query.RegexEscape('ABCDEF'), '\\QABCDEF\\E'),
    ])
  })

  test('findstr', () => {
    var p1 = assertQuery(query.FindStr('ABC', 'A'), 0)
    var p2 = assertQuery(query.FindStr('ABC', 'A', 0), 0)
    var p3 = assertQuery(query.FindStr('ABC', 'A', 1), -1)
    var p4 = assertQuery(query.FindStr('a big apple', 'a', 2), 6)

    return Promise.all([p1, p2, p3, p4])
  })

  test('findstrregex', () => {
    var p1 = assertQuery(query.FindStrRegex('ABC', 'A'), [
      { start: 0, end: 0, data: 'A' },
    ])
    var p2 = assertQuery(query.FindStrRegex('ABCAB', 'AB'), [
      { start: 0, end: 1, data: 'AB' },
      { start: 3, end: 4, data: 'AB' },
    ])
    var p3 = assertQuery(query.FindStrRegex('one fish two Fish', '[fF]ish'), [
      { start: 4, end: 7, data: 'fish' },
      { start: 13, end: 16, data: 'Fish' },
    ])

    return Promise.all([p1, p2, p3])
  })

  test('length', () => {
    var p1 = assertQuery(query.Length(''), 0)
    var p2 = assertQuery(query.Length('A'), 1)
    var p3 = assertQuery(query.Length('ApPle'), 5)
    var p4 = assertQuery(query.Length('two words'), 9)

    return Promise.all([p1, p2, p3, p4])
  })

  test('lowercase', () => {
    var p1 = assertQuery(query.LowerCase(''), '')
    var p2 = assertQuery(query.LowerCase('A'), 'a')
    var p3 = assertQuery(query.LowerCase('ApPle'), 'apple')
    var p4 = assertQuery(query.LowerCase('İstanbul'), 'i̇stanbul')

    return Promise.all([p1, p2, p3, p4])
  })

  test('ltrim', () => {
    var p1 = assertQuery(query.LTrim(''), '')
    var p2 = assertQuery(query.LTrim('    A'), 'A')
    var p3 = assertQuery(query.LTrim('\t\n\t\n  Apple'), 'Apple')
    var p4 = assertQuery(query.LTrim(' A B C'), 'A B C')

    return Promise.all([p1, p2, p3, p4])
  })

  test('ngram', () => {
    return Promise.all([
      assertQuery(query.NGram('what'), ['w', 'wh', 'h', 'ha', 'a', 'at', 't']),
      assertQuery(query.NGram('what', 2, 3), ['wh', 'wha', 'ha', 'hat', 'at']),

      assertQuery(query.NGram(['john', 'doe']), [
        'j',
        'jo',
        'o',
        'oh',
        'h',
        'hn',
        'n',
        'd',
        'do',
        'o',
        'oe',
        'e',
      ]),
      assertQuery(query.NGram(['john', 'doe'], 3, 4), [
        'joh',
        'john',
        'ohn',
        'doe',
      ]),
    ])
  })

  test('repeat', () => {
    var p1 = assertQuery(query.Repeat('A'), 'AA')
    var p2 = assertQuery(query.Repeat('ABC', 3), 'ABCABCABC')

    return Promise.all([p1, p2])
  })

  test('replacestr', () => {
    var p1 = assertQuery(query.ReplaceStr('ABCDE', 'AB', 'AA'), 'AACDE')
    var p2 = assertQuery(
      query.ReplaceStr('One Fish Two Fish', 'Fish', 'Cat'),
      'One Cat Two Cat'
    )

    return Promise.all([p1, p2])
  })

  test('replacestrregex', () => {
    var p1 = assertQuery(query.ReplaceStrRegex('ABCDE', 'AB', 'AA'), 'AACDE')
    var p2 = assertQuery(
      query.ReplaceStrRegex('One Fish Two fish', '[Ff]ish', 'Cat'),
      'One Cat Two Cat'
    )

    return Promise.all([p1, p2])
  })

  test('rtrim', () => {
    var p1 = assertQuery(query.RTrim('A\t\n   '), 'A')
    var p2 = assertQuery(query.RTrim('ABC DE F '), 'ABC DE F')

    return Promise.all([p1, p2])
  })

  test('space', () => {
    var p1 = assertQuery(query.Space(0), '')
    var p2 = assertQuery(query.Space(5), '     ')

    return Promise.all([p1, p2])
  })

  test('substring', () => {
    var p1 = assertQuery(query.SubString('ABCDEF', -3), 'DEF')
    var p2 = assertQuery(query.SubString('ABCDEF', 0, 3), 'ABC')

    return Promise.all([p1, p2])
  })

  test('titlecase', () => {
    var p1 = assertQuery(
      query.TitleCase('one fISH tWo FISH'),
      'One Fish Two Fish'
    )
    var p2 = assertQuery(query.TitleCase('ABC DEF'), 'Abc Def')

    return Promise.all([p1, p2])
  })

  test('trim', () => {
    var p1 = assertQuery(query.Trim('   A   '), 'A')
    var p2 = assertQuery(query.Trim('\t\nABC DEF\t\n   '), 'ABC DEF')

    return Promise.all([p1, p2])
  })

  test('uppercase', () => {
    var p1 = assertQuery(query.UpperCase('a'), 'A')
    var p2 = assertQuery(query.UpperCase('abc def'), 'ABC DEF')

    return Promise.all([p1, p2])
  })

  test('format', () => {
    var p1 = assertQuery(
      query.Format('%3$s%1$s %2$s', 'DB', 'rocks', 'Fauna'),
      'FaunaDB rocks'
    )
    var p2 = assertQuery(query.Format('%.4f', 3.14), '3.1400')
    var p3 = assertQuery(
      query.Format('%s %d %.2f', 'Hey', 1995, 6.02),
      'Hey 1995 6.02'
    )
    var p4 = assertQuery(query.Format('always 100%%'), 'always 100%')

    return Promise.all([p1, p2, p3, p4])
  })

  // Time and date functions

  test('time', () => {
    var time = '1970-01-01T00:00:00.123456789Z'
    var p1 = assertQuery(query.Time(time), new FaunaTime(time))
    // 'now' refers to the current time.
    var p2 = client.query(query.Time('now')).then(function(result) {
      expect(result).toBeInstanceOf(FaunaTime)
    })

    return Promise.all([p1, p2])
  })

  test('epoch', () => {
    var p1 = assertQuery(
      query.Epoch(12, 'second'),
      new FaunaTime('1970-01-01T00:00:12Z')
    )
    var nanoTime = new FaunaTime('1970-01-01T00:00:00.123456789Z')
    var p2 = assertQuery(query.Epoch(123456789, 'nanosecond'), nanoTime)
    return Promise.all([p1, p2])
  })

  test('time_add', () => {
    var p1 = assertQuery(
      query.TimeAdd(query.Epoch(0, 'second'), 1, 'hour'),
      new FaunaTime('1970-01-01T01:00:00Z')
    )
    var p2 = assertQuery(
      query.TimeAdd(query.Date('1970-01-01'), 1, 'day'),
      new FaunaDate('1970-01-02')
    )

    return Promise.all([p1, p2])
  })

  test('time_subtract', () => {
    var p1 = assertQuery(
      query.TimeSubtract(query.Epoch(0, 'second'), 1, 'hour'),
      new FaunaTime('1969-12-31T23:00:00Z')
    )
    var p2 = assertQuery(
      query.TimeSubtract(query.Date('1970-01-01'), 1, 'day'),
      new FaunaDate('1969-12-31')
    )

    return Promise.all([p1, p2])
  })

  test('time_diff', () => {
    var p1 = assertQuery(
      query.TimeDiff(
        query.Epoch(0, 'second'),
        query.Epoch(1, 'second'),
        'second'
      ),
      1
    )
    var p2 = assertQuery(
      query.TimeDiff(query.Date('1970-01-01'), query.Date('1970-01-02'), 'day'),
      1
    )

    return Promise.all([p1, p2])
  })

  test('date', () => {
    return assertQuery(query.Date('1970-01-01'), new FaunaDate('1970-01-01'))
  })

  test('now', () => {
    return Promise.all([
      assertQuery(query.Equals(query.Now(), query.Time('now')), true),
      client.query(query.Now()).then(function(t0) {
        return client.query(query.Now()).then(function(t1) {
          return assertQuery(query.LTE(t0, t1, query.Now()), true)
        })
      }),
    ])
  })

  // Miscellaneous functions
  test('new_id', () => {
    return client.query(query.NewId()).then(function(res) {
      var parsed = parseInt(res)
      expect(parsed).not.toBe()
      expect(typeof parsed).toBe('number')
    })
  })

  test('index', () => {
    return client.query(query.Index('widgets_by_n')).then(function(res) {
      expect(res).toEqual(nIndexRef)
    })
  })

  test('collection', () => {
    return client.query(query.Collection('widgets')).then(function(res) {
      expect(res).toEqual(collectionRef)
    })
  })

  test('equals', () => {
    var p1 = assertQuery(query.Equals(1, 1, 1), true)
    var p2 = assertQuery(query.Equals(1, 1, 2), false)
    var p3 = assertQuery(query.Equals(1), true)
    var p4 = assertQuery(query.Equals({ a: 10, b: 20 }, { a: 10, b: 20 }), true)
    return Promise.all([p1, p2, p3, p4])
  })

  test('contains', () => {
    var obj = { a: { b: 1 } }
    var p1 = assertQuery(query.Contains(['a', 'b'], obj), true)
    var p2 = assertQuery(query.Contains('a', obj), true)
    var p3 = assertQuery(query.Contains(['a', 'c'], obj), false)
    return Promise.all([p1, p2, p3])
  })

  test('contains_value arrays', () => {
    var arr = [1, [2, 3]]
    var nestedArrValues = [[1], [2], [3]]
    var objectsInArray = [{ id: 1 }, { id: 2 }]

    var p1 = assertQuery(query.ContainsValue(1, arr), true)
    var p2 = assertQuery(query.ContainsValue([2, 3], arr), true)
    var p3 = assertQuery(query.ContainsValue([2], nestedArrValues), true)
    var p4 = assertQuery(query.ContainsValue({ id: 2 }, objectsInArray), true)
    var p5 = assertQuery(query.ContainsValue({ id: 3 }, objectsInArray), false)
    return Promise.all([p1, p2, p3, p4, p5])
  })

  test('contains_value object', () => {
    var obj = {
      guitar: 'trey',
      bass: 'mike',
      piano: 'paige',
      drums: 'fish',
      members: 4,
      instruments: ['guitar', 'bass', 'piano', 'drums'],
    }

    var nestedObj = {
      burger: {
        ingredients: {
          protein: 'beef',
        },
      },
      burrito: {
        ingredients: {
          protein: 'chicken',
        },
      },
    }

    var p1 = assertQuery(query.ContainsValue('trey', obj), true)
    var p2 = assertQuery(query.ContainsValue('kuroda', obj), false)

    var p3 = assertQuery(query.ContainsValue(4, obj), true)
    var p4 = assertQuery(query.ContainsValue(40, obj), false)

    var p5 = assertQuery(
      query.ContainsValue(['guitar', 'bass', 'piano', 'drums'], obj),
      true
    )
    var p6 = assertQuery(
      query.ContainsValue(
        {
          ingredients: {
            protein: 'beef',
          },
        },
        nestedObj
      ),
      true
    )
    return Promise.all([p1, p2, p3, p4, p5, p6])
  })

  test('contains_value refs', async () => {
    const docData = {
      data: {
        group: 'Run the Jewels',
        members: ['El-P', 'Killer Mike'],
      },
    }
    const newCollection = await client.query(
      query.CreateCollection({ name: 'drums' })
    )
    const newDoc = await client.query(query.Create(newCollection.ref, docData))

    assertQuery(query.ContainsValue(docData.data, newDoc), true)
    assertQuery(query.ContainsValue(newCollection.ref, newDoc.ref), true)
    assertQuery(query.ContainsValue(newCollection.ts, newDoc), false)
  })

  test('contains_value page', async () => {
    const page = await client.query(query.Paginate(query.Indexes()))
    const indexRef = await client.query(query.Index('widgets_by_m'))
    assertQuery(query.ContainsValue(indexRef, page.data), true)
  })

  test('contains_value scalar types', async () => {
    assertBadQuery(query.ContainsValue('a', 'abc'), errors.BadRequest)
    assertBadQuery(query.ContainsValue(true, true), errors.BadRequest)
    assertBadQuery(query.ContainsValue(1, 123), errors.BadRequest)
  })

  test('contains_field', () => {
    var obj = { band: 'phish', members: { trey: 'guitar', mike: 'bass' } }

    // Handles strings
    var queryOne = assertQuery(query.ContainsField('band', obj), true)

    // Does not find nested fields
    var queryTwo = assertQuery(query.ContainsField('trey', obj), false)

    // Rejects arrays
    var queryThree = assertBadQuery(
      query.ContainsField(['band'], obj),
      errors.BadRequest
    )

    // Rejects objects
    var queryFour = assertBadQuery(
      query.ContainsField({ members: { trey: 'guitar', mike: 'bass' } }, obj),
      errors.BadRequest
    )

    // Rejects numbers
    var queryFive = assertBadQuery(
      query.ContainsField(10, obj),
      errors.BadRequest
    )

    return Promise.all([queryOne, queryTwo, queryThree, queryFour, queryFive])
  })

  test('contains_path', () => {
    var obj = { a: { b: 1 } }
    var p1 = assertQuery(query.ContainsPath(['a', 'b'], obj), true)
    var p2 = assertQuery(query.ContainsPath('a', obj), true)
    var p3 = assertQuery(query.ContainsPath(['a', 'c'], obj), false)
    return Promise.all([p1, p2, p3])
  })

  test('select', () => {
    var obj = { a: { b: 1 } }
    var p1 = assertQuery(query.Select('a', obj), { b: 1 })
    var p2 = assertQuery(query.Select(['a', 'b'], obj), 1)
    var p3 = assertQuery(query.Select('c', obj, null), null)
    var p4 = assertQuery(query.Select('c', obj, 'default'), 'default')
    var p5 = assertBadQuery(query.Select('c', obj), errors.NotFound)
    return Promise.all([p1, p2, p3, p4, p5])
  })

  test('select for array', () => {
    var arr = [1, 2, 3]
    var p1 = assertQuery(query.Select(2, arr), 3)
    var p2 = assertBadQuery(query.Select(3, arr), errors.NotFound)
    return Promise.all([p1, p2])
  })

  test('abs', () => {
    var p1 = assertQuery(query.Abs(10), 10)
    var p2 = assertQuery(query.Abs(-10), 10)
    return Promise.all([p1, p2])
  })

  test('add', () => {
    return assertQuery(query.Add(2, 3, 5), 10)
  })

  test('bitand', () => {
    var p1 = assertQuery(query.BitAnd(1, 0), 0)
    var p2 = assertQuery(query.BitAnd(7, 3), 3)
    return Promise.all([p1, p2])
  })

  test('bitnot', () => {
    var p1 = assertQuery(query.BitNot(0), -1)
    var p2 = assertQuery(query.BitNot(1), -2)
    return Promise.all([p1, p2])
  })

  test('bitor', () => {
    var p1 = assertQuery(query.BitOr(0, 1, 0, 1), 1)
    var p2 = assertQuery(query.BitOr(1, 2, 4), 7)
    return Promise.all([p1, p2])
  })

  test('bitxor', () => {
    var p1 = assertQuery(query.BitXor(0, 1), 1)
    var p2 = assertQuery(query.BitXor(1, 2, 4), 7)
    return Promise.all([p1, p2])
  })

  test('ceil', () => {
    var p1 = assertQuery(query.Ceil(1.2), 2)
    var p2 = assertQuery(query.Ceil(1.8), 2)
    return Promise.all([p1, p2])
  })

  test('divide', () => {
    // TODO: can't make this query because 2.0 === 2
    // await assertQuery(query.Divide(2, 3, 5), 2/15)
    var p1 = assertQuery(query.Divide(2), 2)
    var p2 = assertBadQuery(query.Divide(1, 0))
    return Promise.all([p1, p2])
  })

  test('floor', () => {
    var p1 = assertQuery(query.Floor(1.2), 1)
    var p2 = assertQuery(query.Floor(1.8), 1)
    return Promise.all([p1, p2])
  })

  test('max', () => {
    return assertQuery(query.Max(2, 3, 5, 4), 5)
  })

  test('min', () => {
    return assertQuery(query.Min(2, 3, 5, 4), 2)
  })

  test('modulo', () => {
    var p1 = assertQuery(query.Modulo(5, 2), 1)
    // This is (15 % 10) % 2
    var p2 = assertQuery(query.Modulo(15, 10, 2), 1)
    var p3 = assertQuery(query.Modulo(2), 2)
    var p4 = assertBadQuery(query.Modulo(1, 0))
    return Promise.all([p1, p2, p3, p4])
  })

  test('multiply', () => {
    return assertQuery(query.Multiply(2, 3, 5), 30)
  })

  test('round', () => {
    var p1 = assertQuery(query.Round(155.678, -1), 160)
    var p2 = assertQuery(query.Round(155.678, 0), 156)
    var p3 = assertQuery(query.Round(155.678, 1), 155.7)
    var p4 = assertQuery(query.Round(155.678, 2), 155.68)
    return Promise.all([p1, p2, p3, p4])
  })

  test('subtract', () => {
    var p1 = assertQuery(query.Subtract(2, 3, 5), -6)
    var p2 = assertQuery(query.Subtract(2), 2)
    return Promise.all([p1, p2])
  })

  test('sign', () => {
    var p1 = assertQuery(query.Sign(1.2), 1)
    var p2 = assertQuery(query.Sign(1.8), 1)
    return Promise.all([p1, p2])
  })

  test('sqrt', () => {
    var p1 = assertQuery(query.Sqrt(16), 4)
    var p2 = assertQuery(query.Sqrt(4), 2)
    return Promise.all([p1, p2])
  })

  test('trunc', () => {
    var p1 = assertQuery(query.Trunc(155.678, -1), 150)
    var p2 = assertQuery(query.Trunc(155.678, 0), 155)
    var p3 = assertQuery(query.Trunc(155.678, 1), 155.6)
    var p4 = assertQuery(query.Trunc(155.678, 2), 155.67)
    return Promise.all([p1, p2, p3, p4])
  })

  test('count, sum, mean', () => {
    const values = Array.from({ length: 100 }, (v, k) => k + 1) // array 1-100

    return client
      .query(query.CreateCollection({ name: 'math_collection' }))
      .then(function(coll) {
        return client
          .query(
            query.CreateIndex({
              name: 'math_collection_index',
              source: coll.ref,
              values: [{ field: ['data', 'value'] }],
              active: true,
            })
          )
          .then(function(index) {
            return client.query(
              query.Foreach(
                values,
                query.Lambda(
                  'i',
                  query.Create(coll.ref, { data: { value: query.Var('i') } })
                )
              )
            )
          })
          .then(function() {
            return Promise.all([
              assertQuery(query.Count(values), 100),
              assertQuery(query.Sum(values), 5050),
              assertQuery(query.Mean(values), 50.5),

              assertQuery(
                query.Count(query.Match(query.Index('math_collection_index'))),
                100
              ),
              assertQuery(
                query.Sum(query.Match(query.Index('math_collection_index'))),
                5050
              ),
              assertQuery(
                query.Mean(query.Match(query.Index('math_collection_index'))),
                50.5
              ),

              assertQuery(
                query.Select(
                  ['data'],
                  query.Count(
                    query.Paginate(
                      query.Match(query.Index('math_collection_index')),
                      { size: 1000 }
                    )
                  )
                ),
                [100]
              ),
              assertQuery(
                query.Select(
                  ['data'],
                  query.Sum(
                    query.Paginate(
                      query.Match(query.Index('math_collection_index')),
                      { size: 1000 }
                    )
                  )
                ),
                [5050]
              ),
              assertQuery(
                query.Select(
                  ['data'],
                  query.Mean(
                    query.Paginate(
                      query.Match(query.Index('math_collection_index')),
                      { size: 1000 }
                    )
                  )
                ),
                [50.5]
              ),
            ])
          })
      })
  })

  test('any, all', () => {
    var collName = util.randomString('collection_')
    var indexName = util.randomString('index_')

    return client
      .query(query.CreateCollection({ name: collName }))
      .then(function() {
        return client.query(
          query.CreateIndex({
            name: indexName,
            source: query.Collection(collName),
            active: true,
            terms: [{ field: ['data', 'foo'] }],
            values: [{ field: ['data', 'value'] }],
          })
        )
      })
      .then(function() {
        var coll = query.Collection(collName)

        return client.query(
          query.Do(
            query.Create(coll, { data: { foo: 'true', value: true } }),
            query.Create(coll, { data: { foo: 'true', value: true } }),
            query.Create(coll, { data: { foo: 'true', value: true } }),

            query.Create(coll, { data: { foo: 'false', value: false } }),
            query.Create(coll, { data: { foo: 'false', value: false } }),
            query.Create(coll, { data: { foo: 'false', value: false } }),

            query.Create(coll, { data: { foo: 'mixed', value: true } }),
            query.Create(coll, { data: { foo: 'mixed', value: false } }),
            query.Create(coll, { data: { foo: 'mixed', value: true } }),
            query.Create(coll, { data: { foo: 'mixed', value: false } })
          )
        )
      })
      .then(function() {
        var index = query.Index(indexName)
        var dataPath = ['data', 0]

        var p1 = assertQuery(query.Any([false, false, false]), false)
        var p2 = assertQuery(query.Any([true, false, true]), true)
        var p3 = assertQuery(
          query.Select(
            dataPath,
            query.Any(query.Paginate(query.Match(index, 'true')))
          ),
          true
        )
        var p4 = assertQuery(
          query.Select(
            dataPath,
            query.Any(query.Paginate(query.Match(index, 'false')))
          ),
          false
        )
        var p5 = assertQuery(
          query.Select(
            dataPath,
            query.Any(query.Paginate(query.Match(index, 'mixed')))
          ),
          true
        )
        var p6 = assertQuery(query.Any(query.Match(index, 'true')), true)
        var p7 = assertQuery(query.Any(query.Match(index, 'false')), false)
        var p8 = assertQuery(query.Any(query.Match(index, 'mixed')), true)

        var p9 = assertQuery(query.All([true, true, true]), true)
        var p10 = assertQuery(query.All([true, false, true]), false)
        var p11 = assertQuery(
          query.Select(
            dataPath,
            query.All(query.Paginate(query.Match(index, 'true')))
          ),
          true
        )
        var p12 = assertQuery(
          query.Select(
            dataPath,
            query.All(query.Paginate(query.Match(index, 'false')))
          ),
          false
        )
        var p13 = assertQuery(
          query.Select(
            dataPath,
            query.All(query.Paginate(query.Match(index, 'mixed')))
          ),
          false
        )
        var p14 = assertQuery(query.All(query.Match(index, 'true')), true)
        var p15 = assertQuery(query.All(query.Match(index, 'false')), false)
        var p16 = assertQuery(query.All(query.Match(index, 'mixed')), false)

        return Promise.all([
          p1,
          p2,
          p3,
          p4,
          p5,
          p6,
          p7,
          p8,
          p9,
          p10,
          p11,
          p12,
          p13,
          p14,
          p15,
          p16,
        ])
      })
  })

  test('acos', () => {
    return assertQuery(query.Trunc(query.Acos(0.5), 2), 1.04)
  })

  test('asin', () => {
    var p1 = assertQuery(query.Trunc(query.Asin(0.5), 2), 0.52)
    var p2 = assertQuery(query.Trunc(query.Asin(0), 2), 0)
    return Promise.all([p1, p2])
  })

  test('atan', () => {
    var p1 = assertQuery(query.Trunc(query.Atan(0.5), 2), 0.46)
    var p2 = assertQuery(query.Trunc(query.Atan(0), 2), 0)
    return Promise.all([p1, p2])
  })

  test('cos', () => {
    return assertQuery(query.Cos(0), 1)
  })

  test('cosh', () => {
    return assertQuery(query.Trunc(query.Cosh(7.6), 1), 999)
  })

  test('degres', () => {
    return assertQuery(query.Trunc(query.Degrees(6.29), 0), 360)
  })

  test('exp', () => {
    return assertQuery(query.Trunc(query.Exp(5), 0), 148)
  })

  test('hypot', () => {
    return assertQuery(query.Hypot(query.Hypot(3, 4), 0), 5)
  })

  test('ln', () => {
    return assertQuery(query.Trunc(query.Ln(1), 0), 0)
  })

  test('log', () => {
    return assertQuery(query.Trunc(query.Log(100), 0), 2)
  })

  test('pow', () => {
    return assertQuery(query.Pow(3, 2), 9)
  })

  test('radians', () => {
    return assertQuery(query.Trunc(query.Radians(360), 1), 6.2)
  })

  test('sin', () => {
    return assertQuery(query.Trunc(query.Sin(0), 0), 0)
  })

  test('sinh', () => {
    return assertQuery(query.Trunc(query.Sinh(4), 0), 27)
  })

  test('tan', () => {
    return assertQuery(query.Trunc(query.Tan(0), 0), 0)
  })

  test('tanh', () => {
    return assertQuery(query.Trunc(query.Tanh(100), 0), 1)
  })

  test('lt', () => {
    return assertQuery(query.LT(1, 2), true)
  })

  test('lte', () => {
    return assertQuery(query.LTE(1, 1), true)
  })

  test('gt', () => {
    return assertQuery(query.GT(2, 1), true)
  })

  test('gte', () => {
    return assertQuery(query.GTE(1, 1), true)
  })

  test('and', () => {
    var p1 = assertQuery(query.And(true, true, false), false)
    var p2 = assertQuery(query.And(true, true, true), true)
    var p3 = assertQuery(query.And(true), true)
    var p4 = assertQuery(query.And(false), false)
    return Promise.all([p1, p2, p3, p4])
  })

  test('or', () => {
    var p1 = assertQuery(query.Or(false, false, true), true)
    var p2 = assertQuery(query.Or(false, false, false), false)
    var p3 = assertQuery(query.Or(true), true)
    var p4 = assertQuery(query.Or(false), false)
    return Promise.all([p1, p2, p3, p4])
  })

  test('not', () => {
    var p1 = assertQuery(query.Not(true), false)
    var p2 = assertQuery(query.Not(false), true)
    return Promise.all([p1, p2])
  })

  test('to_string', () => {
    var p1 = assertQuery(query.ToString(42), '42')
    var p2 = assertQuery(query.ToString('42'), '42')
    return Promise.all([p1, p2])
  })

  test('to_number', () => {
    var p1 = assertQuery(query.ToNumber(42), 42)
    var p2 = assertQuery(query.ToNumber('42'), 42)
    return Promise.all([p1, p2])
  })

  test('to_object', () => {
    var obj = { k0: 10, k1: 20 }
    var p1 = assertQuery(query.ToObject([['k0', 10], ['k1', 20]]), obj)
    var collName = util.randomString('collection_')
    var indexName = util.randomString('index_')
    var p2 = client
      .query(query.CreateCollection({ name: collName }))
      .then(function() {
        return client.query(
          query.CreateIndex({
            name: indexName,
            active: true,
            source: query.Collection(collName),
            values: [{ field: ['data', 'key'] }, { field: ['data', 'value'] }],
          })
        )
      })
      .then(function() {
        return client.query(
          query.Do(
            query.Create(query.Collection(collName), {
              data: { key: 'k0', value: 10 },
            }),
            query.Create(query.Collection(collName), {
              data: { key: 'k1', value: 20 },
            })
          )
        )
      })
      .then(function() {
        return assertQuery(
          query.ToObject(
            query.Select(
              ['data'],
              query.Paginate(query.Match(query.Index(indexName)))
            )
          ),
          obj
        )
      })

    return Promise.all([p1, p2])
  })

  test('to_array', () => {
    return assertQuery(query.ToArray({ k0: 10, k1: 20 }), [
      ['k0', 10],
      ['k1', 20],
    ])
  })

  test('to_array_and_to_object', () => {
    var obj = { k0: 10, k1: 20 }
    return assertQuery(query.ToObject(query.ToArray(obj)), obj)
  })

  test('to_double', () => {
    var p1 = assertQuery(query.ToDouble(3.14), 3.14)
    var p2 = assertQuery(query.ToString(query.ToDouble(10)), '10.0')
    var p3 = assertQuery(query.ToDouble('3.14'), 3.14)
    return Promise.all([p1, p2, p3])
  })

  test('to_integer', () => {
    var p1 = assertQuery(query.ToString(query.ToInteger(10.0)), '10')
    var p2 = assertQuery(query.ToInteger('10'), 10)
    return Promise.all([p1, p2])
  })

  test('to_time', () => {
    return assertQuery(
      query.ToTime('1970-01-01T00:00:00Z'),
      new FaunaTime('1970-01-01T00:00:00Z')
    )
  })

  test('to_millis', () => {
    var p1 = assertQuery(query.ToMillis(query.Time('1970-01-01T00:00:00Z')), 0)
    var p2 = assertQuery(
      query.ToMillis(query.Epoch(2147483648000, 'millisecond')),
      2147483648000
    )
    var p3 = assertQuery(query.ToMillis(0), 0)
    var p4 = assertQuery(query.ToMillis(2147483648000000), 2147483648000)
    return Promise.all([p1, p2, p3, p4])
  })

  test('to_seconds', () => {
    var p1 = assertQuery(query.ToSeconds(query.Epoch(0, 'second')), 0)
    var p2 = assertQuery(
      query.ToSeconds(query.Epoch(2147483648, 'second')),
      2147483648
    )
    var p3 = assertQuery(query.ToSeconds(0), 0)
    var p4 = assertQuery(query.ToSeconds(2147483648000000), 2147483648)
    return Promise.all([p1, p2, p3, p4])
  })

  test('to_micros', () => {
    var p1 = assertQuery(query.ToMicros(query.Epoch(0, 'second')), 0)
    var p2 = assertQuery(
      query.ToMicros(query.Epoch(2147483648000000, 'microsecond')),
      2147483648000000
    )
    var p3 = assertQuery(query.ToMicros(0), 0)
    var p4 = assertQuery(query.ToMicros(2147483648000000), 2147483648000000)
    return Promise.all([p1, p2, p3, p4])
  })

  test('day_of_month', () => {
    var p1 = assertQuery(query.DayOfMonth(query.Epoch(0, 'second')), 1)
    var p2 = assertQuery(
      query.DayOfMonth(query.Epoch(2147483648, 'second')),
      19
    )
    var p3 = assertQuery(query.DayOfMonth(0), 1)
    var p4 = assertQuery(query.DayOfMonth(2147483648000000), 19)
    return Promise.all([p1, p2, p3, p4])
  })

  test('day_of_week', () => {
    var p1 = assertQuery(query.DayOfWeek(query.Epoch(0, 'second')), 4)
    var p2 = assertQuery(query.DayOfWeek(query.Epoch(2147483648, 'second')), 2)
    var p3 = assertQuery(query.DayOfWeek(0), 4)
    var p4 = assertQuery(query.DayOfWeek(2147483648000000), 2)
    return Promise.all([p1, p2, p3, p4])
  })

  test('day_of_year', () => {
    var p1 = assertQuery(query.DayOfYear(query.Epoch(0, 'second')), 1)
    var p2 = assertQuery(query.DayOfYear(query.Epoch(2147483648, 'second')), 19)
    var p3 = assertQuery(query.DayOfYear(0), 1)
    var p4 = assertQuery(query.DayOfYear(2147483648000000), 19)
    return Promise.all([p1, p2, p3, p4])
  })

  test('month', () => {
    var p1 = assertQuery(query.Month(query.Epoch(0, 'second')), 1)
    var p2 = assertQuery(query.Month(query.Epoch(2147483648, 'second')), 1)
    var p3 = assertQuery(query.Month(0), 1)
    var p4 = assertQuery(query.Month(2147483648000000), 1)
    return Promise.all([p1, p2, p3, p4])
  })

  test('year', () => {
    var p1 = assertQuery(query.Year(query.Epoch(0, 'second')), 1970)
    var p2 = assertQuery(query.Year(query.Epoch(2147483648, 'second')), 2038)
    var p3 = assertQuery(query.Year(0), 1970)
    var p4 = assertQuery(query.Year(2147483648000000), 2038)
    return Promise.all([p1, p2, p3, p4])
  })

  test('hour', () => {
    return assertQuery(query.Hour(query.Epoch(0, 'second')), 0)
  })

  test('minute', () => {
    return assertQuery(query.Minute(query.Epoch(0, 'second')), 0)
  })

  test('second', () => {
    return assertQuery(query.Second(query.Epoch(0, 'second')), 0)
  })

  test('to_date', () => {
    return assertQuery(query.ToDate('1970-01-01'), new FaunaDate('1970-01-01'))
  })

  test('ref', () => {
    return assertQuery(
      Ref(collectionRef, query.Concat(['123', '456'])),
      new values.Ref('123456', collectionRef)
    )
  })

  test('bytes', () => {
    return Promise.all([
      assertQuery(query.Bytes('AQIDBA=='), new Bytes('AQIDBA==')),
      assertQuery(
        query.Bytes(new Uint8Array([0, 0, 0, 0])),
        new Bytes('AAAAAA==')
      ),
      assertQuery(query.Bytes(new ArrayBuffer(4)), new Bytes('AAAAAA==')),
      assertQuery(new Bytes('AQIDBA=='), new Bytes('AQIDBA==')),
      assertQuery(new Uint8Array([0, 0, 0, 0]), new Bytes('AAAAAA==')),
      assertQuery(new ArrayBuffer(4), new Bytes('AAAAAA==')),
    ])
  })

  test('recursive refs', () => {
    return withNewDatabase().then(function(adminCli) {
      return createNewDatabase(adminCli, 'parent-db').then(function(parentCli) {
        return createNewDatabase(parentCli, 'child-db').then(function(
          childCli
        ) {
          return childCli
            .query(
              query.Do(
                query.CreateDatabase({ name: 'a_db' }),
                query.CreateCollection({ name: 'a_collection' }),
                query.CreateIndex({
                  name: 'a_index',
                  active: true,
                  source: query.Ref('collections'),
                }),
                query.CreateFunction({
                  name: 'a_function',
                  body: query.Query(function(a) {
                    return a
                  }),
                }),
                query.CreateRole({
                  name: 'a_role',
                  privileges: {
                    resource: query.Collections(),
                    actions: { read: true },
                  },
                }),
                query.Create(query.Ref('keys/123'), {
                  database: query.Database('a_db'),
                  role: 'server',
                })
              )
            )
            .then(function() {
              var childDb = query.Database('child-db')
              var childDbRef = new values.Ref('child-db', Native.DATABASES)
              var nestedDb = query.Database(
                'child-db',
                query.Database('parent-db')
              )
              var nestedCollection = query.Collection('a_collection', nestedDb)
              var nestedCollectionRef = new values.Ref(
                'a_collection',
                Native.COLLECTIONS,
                new values.Ref(
                  'child-db',
                  Native.DATABASES,
                  new values.Ref('parent-db', Native.DATABASES)
                )
              )

              return Promise.all([
                // Recursive from the top most database
                assertQueryWithClient(
                  adminCli,
                  query.Exists(nestedCollection),
                  true
                ),
                assertQueryWithClient(
                  adminCli,
                  query.Paginate(query.Collections(nestedDb)),
                  { data: [nestedCollectionRef] }
                ),

                // Non-recursive builtin references
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Collections()),
                  { data: [new values.Ref('a_collection', Native.COLLECTIONS)] }
                ),
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Databases()),
                  { data: [new values.Ref('a_db', Native.DATABASES)] }
                ),
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Indexes()),
                  { data: [new values.Ref('a_index', Native.INDEXES)] }
                ),
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Functions()),
                  { data: [new values.Ref('a_function', Native.FUNCTIONS)] }
                ),
                assertQueryWithClient(childCli, query.Paginate(query.Roles()), {
                  data: [new values.Ref('a_role', Native.ROLES)],
                }),
                assertQueryWithClient(childCli, query.Paginate(query.Keys()), {
                  data: [new values.Ref('123', Native.KEYS)],
                }),
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Tokens()),
                  { data: [] }
                ),
                assertQueryWithClient(
                  childCli,
                  query.Paginate(query.Credentials()),
                  { data: [] }
                ),

                // Recursive built-in references
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Collections(childDb)),
                  {
                    data: [
                      new values.Ref(
                        'a_collection',
                        Native.COLLECTIONS,
                        childDbRef
                      ),
                    ],
                  }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Databases(childDb)),
                  {
                    data: [
                      new values.Ref('a_db', Native.DATABASES, childDbRef),
                    ],
                  }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Indexes(childDb)),
                  {
                    data: [
                      new values.Ref('a_index', Native.INDEXES, childDbRef),
                    ],
                  }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Functions(childDb)),
                  {
                    data: [
                      new values.Ref(
                        'a_function',
                        Native.FUNCTIONS,
                        childDbRef
                      ),
                    ],
                  }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Roles(childDb)),
                  { data: [new values.Ref('a_role', Native.ROLES, childDbRef)] }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Keys(childDb)),
                  {
                    data: [
                      new values.Ref(
                        '123',
                        new values.Ref('keys', null, childDbRef)
                      ),
                    ],
                  }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Tokens(childDb)),
                  { data: [] }
                ),
                assertQueryWithClient(
                  parentCli,
                  query.Paginate(query.Credentials(childDb)),
                  { data: [] }
                ),
              ])
            })
        })
      })
    })
  })

  test('nested ref from string', () => {
    return assertQuery(
      query.Ref('collections/widget/123'),
      new values.Ref('123', new values.Ref('widget', Native.COLLECTIONS))
    )
  })

  test('move database', () => {
    const db_move = query.Database('db_move')
    const db_destination = query.Database('db_destination')

    return withNewDatabase().then(function(adminCli) {
      return createNewDatabase(adminCli, 'db_move').then(function(dbMoveCli) {
        return createNewDatabase(adminCli, 'db_destination').then(function(
          dbDestinationCli
        ) {
          return adminCli
            .query(query.MoveDatabase(db_move, db_destination))
            .then(function() {
              return Promise.all([
                assertQueryWithClient(adminCli, query.Exists(db_move), false),
                assertQueryWithClient(
                  adminCli,
                  query.Exists(db_destination),
                  true
                ),
                assertQueryWithClient(
                  dbDestinationCli,
                  query.Exists(db_move),
                  true
                ),
              ])
            })
        })
      })
    })
  })

  test('documents', async () => {
    const results = await client.query(
      query.Paginate(query.Documents(query.Collection('widgets')))
    )

    expect(results.data).toHaveLength(20)
  })

  test('reverse', async () => {
    // Array
    const numArray = [1, 2, 3]

    // Single page
    const databases = await client.query(query.Paginate(query.Indexes()))
    const reverseDBs = await client.query(
      query.Reverse(query.Paginate(query.Indexes()))
    )

    // Multi Page
    const anderson = await client.query(
      query.Create(query.Collection('widgets'), {
        data: {
          name: 'anderson paak',
          n: 100,
        },
      })
    )

    await client.query(
      query.Create(query.Collection('widgets'), {
        data: {
          name: 'chance the rapper',
          n: 100,
        },
      })
    )

    await client.query(
      query.Create(query.Collection('widgets'), {
        data: {
          name: 'kendrick lamar',
          n: 100,
        },
      })
    )

    const multiPage = await client.query(
      query.Paginate(query.Match(query.Index('widgets_by_n'), 100), {
        size: 2,
        after: [anderson.ref],
      })
    )

    const reverseMultiPage = await client.query(
      query.Reverse(
        query.Paginate(query.Match(query.Index('widgets_by_n'), 100), {
          size: 2,
          after: [anderson.ref],
        })
      )
    )

    // Set
    const documentsSet = await client.query(
      query.Paginate(query.Documents(query.Collection('widgets')))
    )
    const reverseDocumentsSet = await client.query(
      query.Paginate(
        query.Reverse(query.Documents(query.Collection('widgets')))
      )
    )

    assertQuery(query.Reverse(numArray), numArray.reverse())
    expect(databases.data).toEqual(reverseDBs.data.reverse())
    expect(documentsSet.data).toEqual(reverseDocumentsSet.data.reverse())
    expect(multiPage.data).toEqual(reverseMultiPage.data.reverse())
  })

  test('legacy queries/lambdas have default api_version', async () => {
    const res = await client.query(
      new values.Query({ lambda: 'X', expr: { var: 'X' } })
    )

    expect(res).toBeInstanceOf(values.Query)
    expect(res.query).toEqual({
      api_version: '2.12',
      lambda: 'X',
      expr: { var: 'X' },
    })
  })

  // Check arity of all query functions

  test('arity', () => {
    // By default assume all functions should have strict arity
    var testParams = {
      Ref: [3, 'from 1 to 2'],
      Do: [0, 'at least 1'],
      Lambda: [3, 'from 1 to 2'],
      Call: [0, 'at least 1'],
      Get: [3, 'from 1 to 2'],
      Paginate: [3, 'from 1 to 2'],
      Exists: [3, 'from 1 to 2'],
      Create: [3, 'from 1 to 2'],
      Match: [0, 'at least 1'],
      Union: [0, 'at least 1'],
      Merge: [0, 'from 2 to 3'],
      Intersection: [0, 'at least 1'],
      Difference: [0, 'at least 1'],
      Format: [0, 'at least 1'],
      Concat: [0, 'at least 1'],
      Casefold: [0, 'at least 1'],
      FindStr: [0, 'from 2 to 3'],
      FindStrRegex: [0, 'from 2 to 4'],
      NGram: [0, 'from 1 to 3'],
      Repeat: [0, 'from 1 to 2'],
      ReplaceStrRegex: [0, 'from 3 to 4'],
      SubString: [0, 'from 1 to 3'],
      Equals: [0, 'at least 1'],
      Select: [4, 'from 2 to 3'],
      Add: [0, 'at least 1'],
      BitAnd: [0, 'at least 1'],
      BitOr: [0, 'at least 1'],
      BitXor: [0, 'at least 1'],
      Divide: [0, 'at least 1'],
      Max: [0, 'at least 1'],
      Min: [0, 'at least 1'],
      Modulo: [0, 'at least 1'],
      Multiply: [0, 'at least 1'],
      Round: [0, 'at least 1'],
      Subtract: [0, 'at least 1'],
      Trunc: [0, 'at least 1'],
      Hypot: [0, 'at least 1'],
      Pow: [0, 'at least 1'],
      LT: [0, 'at least 1'],
      LTE: [0, 'at least 1'],
      GT: [0, 'at least 1'],
      GTE: [0, 'at least 1'],
      And: [0, 'at least 1'],
      Or: [0, 'at least 1'],
      Index: [3, 'from 1 to 2'],
      Class: [3, 'from 1 to 2'],
      Collection: [3, 'from 1 to 2'],
      Database: [3, 'from 1 to 2'],
      Function: [3, 'from 1 to 2'],
      Role: [3, 'from 1 to 2'],
      Classes: [2, 'up to 1'],
      Collections: [2, 'up to 1'],
      Databases: [2, 'up to 1'],
      Indexes: [2, 'up to 1'],
      Functions: [2, 'up to 1'],
      Roles: [2, 'up to 1'],
      Keys: [2, 'up to 1'],
      Tokens: [2, 'up to 1'],
      Credentials: [2, 'up to 1'],
    }

    for (var fun in query) {
      var params = testParams[fun] || [],
        arity = params[0] !== undefined ? params[0] : 100,
        errorMessage = new RegExp(
          'Function requires ' +
            (params[1] || '\\d+') +
            ' arguments but ' +
            arity +
            ' were given'
        )
      expect(function() {
        query[fun].apply(null, new Array(arity))
      }).toThrow()
    }
  })

  // Helpers

  test('varargs', () => {
    // Works for lists too
    var p1 = assertQuery(query.Add([2, 3, 5]), 10)
    // Works for a variable equal to a list
    var p2 = assertQuery(
      query.Let({ x: [2, 3, 5] }, query.Add(query.Var('x'))),
      10
    )
    return Promise.all([p1, p2])
  })
}, 10000)

function withNewDatabase() {
  return util.rootClient
    .query(
      query.CreateKey({
        database: util.dbRef,
        role: 'admin',
      })
    )
    .then(function(adminKey) {
      var adminCli = util.getClient({ secret: adminKey.secret })
      return createNewDatabase(adminCli, util.randomString('sub_db_'))
    })
}

function createNewDatabase(client, name) {
  return client.query(query.CreateDatabase({ name: name })).then(function() {
    return client
      .query(query.CreateKey({ database: query.Database(name), role: 'admin' }))
      .then(function(key) {
        return util.getClient({ secret: key.secret })
      })
  })
}

function create(data) {
  if (typeof data === 'undefined') {
    data = {}
  }

  if (data.n === undefined) {
    data.n = 0
  }

  return client.query(query.Create(collectionRef, { data: data }))
}

function createThimble(data) {
  return client.query(query.Create(thimbleCollectionRef, { data: data }))
}

function nSet(n) {
  return query.Match(nIndexRef, n)
}

function mSet(m) {
  return query.Match(mIndexRef, m)
}

function assertQueryWithClient(client, query, expected) {
  return client.query(query).then(function(result) {
    expect(result).toEqual(expected)
  })
}

function assertQuery(query, expected) {
  return assertQueryWithClient(client, query, expected)
}

function assertBadQuery(query, errorType) {
  if (typeof errorType === 'undefined') {
    errorType = errors.BadRequest
  }

  return util.assertRejected(client.query(query), errorType)
}

function assertSet(set, expected) {
  return getSetContents(set).then(function(result) {
    expect(result).toEqual(expected)
  })
}

function getSetContents(set) {
  return client
    .query(query.Paginate(set, { size: 1000 }))
    .then(function(result) {
      return result.data
    })
}

function range(start, end) {
  var values = []

  for (var i = start; i <= end; i++) values.push(i)

  return values
}

function pluckRef(response) {
  return response.ref
}

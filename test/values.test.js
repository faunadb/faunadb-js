'use strict'

var util = require('util')
var errors = require('../src/errors')
var json = require('../src/_json')
var Expr = require('../src/Expr')
var values = require('../src/values')
var q = require('../src/query')

var FaunaDate = values.FaunaDate,
  FaunaTime = values.FaunaTime,
  Ref = values.Ref,
  SetRef = values.SetRef,
  Bytes = values.Bytes,
  Query = values.Query

describe('Values', () => {
  var ref = new Ref('123', new Ref('frogs', values.Native.COLLECTIONS)),
    jsonRef =
      '{"@ref":{"id":"123","collection":{"@ref":{"id":"frogs","collection":{"@ref":{"id":"collections"}}}}}}'

  test('ref', () => {
    expect(json.parseJSON(jsonRef)).toEqual(ref)
    expect(json.toJSON(ref)).toEqual(jsonRef)

    expect(ref.id).toEqual('123')
    expect(ref.collection).toEqual(new Ref('frogs', values.Native.COLLECTIONS))
    expect(ref.database).toEqual(undefined)

    expect(function() {
      new Ref()
    }).toThrow()
  })

  test('serializes expr', () => {
    var expr = new Expr({ some: 'stringField', num: 2 })
    expect(json.toJSON(expr)).toEqual('{"some":"stringField","num":2}')
  })

  test('set', () => {
    var index = new Ref('frogs_by_size', values.Native.INDEXES),
      jsonIndex =
        '{"@ref":{"id":"frogs_by_size","collection":{"@ref":{"id":"indexes"}}}}',
      match = new SetRef({ match: index, terms: ref }),
      jsonMatch = '{"@set":{"match":' + jsonIndex + ',"terms":' + jsonRef + '}}'
    expect(json.parseJSON(jsonMatch)).toEqual(match)
    expect(json.toJSON(match)).toEqual(jsonMatch)
  })

  test('time conversion', () => {
    var dt = new Date()
    expect(new FaunaTime(dt).date).toEqual(dt)

    var epoch = new Date(Date.UTC(1970, 0, 1))
    var ft = new FaunaTime(epoch)
    expect(ft).toEqual(new FaunaTime('1970-01-01T00:00:00.000Z'))
    expect(ft.date).toEqual(epoch)

    // time offset not allowed
    expect(function() {
      return new FaunaTime('1970-01-01T00:00:00.000+04:00')
    }).toThrow()
  })

  test('time', () => {
    var test_ts = new FaunaTime('1970-01-01T00:00:00.123456789Z')
    var test_ts_json = '{"@ts":"1970-01-01T00:00:00.123456789Z"}'
    expect(json.toJSON(test_ts)).toEqual(test_ts_json)
    expect(json.parseJSON(test_ts_json)).toEqual(test_ts)
  })

  test('date conversion', () => {
    var now = new Date(Date.now())
    var dt = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    )
    expect(new FaunaDate(dt).date).toEqual(dt)

    var epoch = new Date(Date.UTC(1970, 0, 1))
    var fd = new FaunaDate(epoch)
    expect(fd).toEqual(new FaunaDate('1970-01-01'))
    expect(fd.date).toEqual(epoch)
  })

  test('date', () => {
    var test_date = new FaunaDate(new Date(1970, 0, 1))
    var test_date_json = '{"@date":"1970-01-01"}'
    expect(json.toJSON(test_date)).toEqual(test_date_json)
    expect(json.parseJSON(test_date_json)).toEqual(test_date)
  })

  test('bytes - string base64', () => {
    var test_bytes = new Bytes('AQIDBA==')
    var test_bytes_json = '{"@bytes":"AQIDBA=="}'
    expect(json.toJSON(test_bytes)).toEqual(test_bytes_json)
    expect(json.parseJSON(test_bytes_json)).toEqual(test_bytes)
  })

  test('bytes - Uint8Array', () => {
    var test_bytes = new Bytes(new Uint8Array([1, 2, 3, 4]))
    var test_bytes_json = '{"@bytes":"AQIDBA=="}'
    expect(json.toJSON(test_bytes)).toEqual(test_bytes_json)
    expect(json.parseJSON(test_bytes_json)).toEqual(test_bytes)
  })

  test('bytes - ArrayBuffer', () => {
    var test_bytes = new Bytes(new ArrayBuffer(4))
    var test_bytes_json = '{"@bytes":"AAAAAA=="}'
    expect(json.toJSON(test_bytes)).toEqual(test_bytes_json)
    expect(json.parseJSON(test_bytes_json)).toEqual(test_bytes)
  })

  test('bytes - errors', () => {
    expect(function() {
      new Bytes(10)
    }).toThrow()
    expect(function() {
      new Bytes(3.14)
    }).toThrow()
    expect(function() {
      new Bytes({})
    }).toThrow()
    expect(function() {
      new Bytes([])
    }).toThrow()
    expect(function() {
      new Bytes(null)
    }).toThrow()
    expect(function() {
      new Bytes(undefined)
    }).toThrow()
  })

  test('query', () => {
    var test_query = new Query({ lambda: 'x', expr: { var: 'x' } })
    var test_query_json = '{"@query":{"lambda":"x","expr":{"var":"x"}}}'
    expect(json.toJSON(test_query)).toEqual(test_query_json)
    expect(json.parseJSON(test_query_json)).toEqual(test_query)
  })

  test('versioned query', () => {
    var test_query = new Query({
      api_version: '3',
      lambda: 'x',
      expr: { var: 'x' },
    })
    var test_query_json =
      '{"@query":{"api_version":"3","lambda":"x","expr":{"var":"x"}}}'
    expect(json.toJSON(test_query)).toEqual(test_query_json)
    expect(json.parseJSON(test_query_json)).toEqual(test_query)
  })

  test('parse versioned lambda agnostic of object order', () => {
    var simpleQuery = new Query({
      lambda: 'x',
      expr: { var: 'x' },
      api_version: '3',
    })

    var complexQuery = new Query({
      lambda: '_',
      expr: { match: { index: 'idx' }, terms: ['str', 10] },
      api_version: '3',
    })

    // simpleQuery assertions
    var x = '{"@query":{"api_version":"3","lambda":"x","expr":{"var":"x"}}}'
    expect(json.parseJSON(x)).toEqual(simpleQuery)

    var y = '{"@query":{"lambda":"x","api_version":"3","expr":{"var":"x"}}}'
    expect(json.parseJSON(y)).toEqual(simpleQuery)

    var z = '{"@query":{"expr":{"var":"x"},"lambda":"x","api_version":"3"}}'
    expect(json.parseJSON(z)).toEqual(simpleQuery)

    // complexQuery assertions
    var a =
      '{"@query":{"lambda":"_","expr":{"match":{"index":"idx"},"terms":["str",10]},"api_version":"3"}}'
    expect(json.parseJSON(a)).toEqual(complexQuery)

    var b =
      '{"@query":{"expr":{"match":{"index":"idx"},"terms":["str",10]},"api_version":"3","lambda":"_"}}'
    expect(json.parseJSON(b)).toEqual(complexQuery)

    var c =
      '{"@query":{"api_version":"3","expr":{"match":{"index":"idx"},"terms":["str",10]},"lambda":"_"}}'
    expect(json.parseJSON(c)).toEqual(complexQuery)
  })

  var assertPrint = function(value, expected) {
    expect(expected).toEqual(util.inspect(value, { depth: null }))
    expect(expected).toEqual(value.toString())
  }

  test('pretty print', () => {
    assertPrint(new Ref('col', values.Native.COLLECTIONS), 'Collection("col")')
    assertPrint(new Ref('db', values.Native.DATABASES), 'Database("db")')
    assertPrint(new Ref('idx', values.Native.INDEXES), 'Index("idx")')
    assertPrint(new Ref('fn', values.Native.FUNCTIONS), 'Function("fn")')
    assertPrint(new Ref('role', values.Native.ROLES), 'Role("role")')
    assertPrint(new Ref('key', values.Native.KEYS), 'Ref(Keys(), "key")')
    assertPrint(
      new Ref('access_provider', values.Native.ACCESS_PROVIDERS),
      'AccessProvider("access_provider")'
    )

    assertPrint(values.Native.COLLECTIONS, 'Collections()')
    assertPrint(values.Native.DATABASES, 'Databases()')
    assertPrint(values.Native.INDEXES, 'Indexes()')
    assertPrint(values.Native.FUNCTIONS, 'Functions()')
    assertPrint(values.Native.ROLES, 'Roles()')
    assertPrint(values.Native.KEYS, 'Keys()')
    assertPrint(values.Native.ACCESS_PROVIDERS, 'AccessProviders()')

    var db = new Ref('db', values.Native.DATABASES)

    assertPrint(new Ref('collections', null, db), 'Collections(Database("db"))')
    assertPrint(new Ref('databases', null, db), 'Databases(Database("db"))')
    assertPrint(new Ref('indexes', null, db), 'Indexes(Database("db"))')
    assertPrint(new Ref('functions', null, db), 'Functions(Database("db"))')
    assertPrint(new Ref('roles', null, db), 'Roles(Database("db"))')
    assertPrint(new Ref('keys', null, db), 'Keys(Database("db"))')
    assertPrint(
      new Ref('access_providers', null, db),
      'AccessProviders(Database("db"))'
    )

    assertPrint(
      new Ref('col', values.Native.COLLECTIONS, db),
      'Collection("col", Database("db"))'
    )
    assertPrint(
      new Ref('db', values.Native.DATABASES, db),
      'Database("db", Database("db"))'
    )
    assertPrint(
      new Ref('idx', values.Native.INDEXES, db),
      'Index("idx", Database("db"))'
    )
    assertPrint(
      new Ref('fn', values.Native.FUNCTIONS, db),
      'Function("fn", Database("db"))'
    )
    assertPrint(
      new Ref('role', values.Native.ROLES, db),
      'Role("role", Database("db"))'
    )
    assertPrint(
      new Ref('access_provider', values.Native.ACCESS_PROVIDERS, db),
      'AccessProvider("access_provider", Database("db"))'
    )

    assertPrint(
      new FaunaTime('1970-01-01T00:00:00.123456789Z'),
      'Time("1970-01-01T00:00:00.123456789Z")'
    )
    assertPrint(new FaunaDate('1970-01-01'), 'Date("1970-01-01")')

    assertPrint(new Bytes('1234'), 'Bytes("1234")')

    function mkIndex(name) {
      return new Ref(name, values.Native.INDEXES)
    }

    assertPrint(new SetRef({ match: mkIndex('idx') }), 'Match(Index("idx"))')
    //todo: add Map/Foreach when it supports sets
    assertPrint(
      new SetRef({
        filter: { lambda: 'ref', expr: true },
        collection: values.Native.INDEXES,
      }),
      'Filter(Indexes(), Lambda("ref", true))'
    )
    assertPrint(
      new SetRef({
        union: [
          new SetRef({ match: mkIndex('idx1') }),
          new SetRef({ match: mkIndex('idx4') }),
        ],
      }),
      'Union(Match(Index("idx1")), Match(Index("idx4")))'
    )
    assertPrint(
      new SetRef({
        intersection: [
          new SetRef({ match: mkIndex('idx1') }),
          new SetRef({ match: mkIndex('idx4') }),
        ],
      }),
      'Intersection(Match(Index("idx1")), Match(Index("idx4")))'
    )
    assertPrint(
      new SetRef({
        difference: [
          new SetRef({ match: mkIndex('idx1') }),
          new SetRef({ match: mkIndex('idx4') }),
        ],
      }),
      'Difference(Match(Index("idx1")), Match(Index("idx4")))'
    )
    assertPrint(
      new SetRef({ distinct: new SetRef({ match: mkIndex('idx1') }) }),
      'Distinct(Match(Index("idx1")))'
    )
  })

  test('pretty print Match', () => {
    assertPrint(
      new Query(q.Lambda('_', q.Match(q.Index('idx')))),
      'Query(Lambda("_", Match(Index("idx"))))'
    )

    assertPrint(
      new Query(q.Lambda('_', q.Match(q.Index('idx'), 'str'))),
      'Query(Lambda("_", Match(Index("idx"), "str")))'
    )

    assertPrint(
      new Query(q.Lambda('_', q.Match(q.Index('idx'), 'str', 10))),
      'Query(Lambda("_", Match(Index("idx"), ["str", 10])))'
    )

    assertPrint(
      new Query(q.Lambda('_', q.Match(q.Index('idx'), ['str', 10]))),
      'Query(Lambda("_", Match(Index("idx"), ["str", 10])))'
    )
  })

  test('pretty print Paginate', () => {
    var m = q.Match(q.Index('idx'))

    assertPrint(
      new Query(q.Lambda('_', q.Paginate(m))),
      'Query(Lambda("_", Paginate(Match(Index("idx")))))'
    )

    assertPrint(
      new Query(q.Lambda('_', q.Paginate(m, { size: 10, after: [20] }))),
      'Query(Lambda("_", Paginate(Match(Index("idx")), {size: 10, after: [20]})))'
    )
  })

  test('pretty print Query', () => {
    assertPrint(
      new Query(q.Lambda('x', q.Var('x'))),
      'Query(Lambda("x", Var("x")))'
    )
    assertPrint(
      new Query(
        q.Lambda(
          ['x', 'y'],
          q.If(q.GT(q.Var('x'), q.Var('y')), 'x > y', 'x <= y')
        )
      ),
      'Query(Lambda(["x", "y"], If(GT(Var("x"), Var("y")), "x > y", "x <= y")))'
    )
    assertPrint(
      new Query(
        q.Lambda('ref', q.Select(['data', 'name'], q.Get(q.Var('ref'))))
      ),
      'Query(Lambda("ref", Select(["data", "name"], Get(Var("ref")))))'
    )

    //returns object
    assertPrint(
      new Query(
        q.Lambda(['x', 'y'], {
          sum: q.Add(q.Var('x'), q.Var('y')),
          product: q.Multiply(q.Var('x'), q.Var('y')),
        })
      ),
      'Query(Lambda(["x", "y"], {sum: Add(Var("x"), Var("y")), product: Multiply(Var("x"), Var("y"))}))'
    )

    //returns array
    assertPrint(
      new Query(
        q.Lambda(
          ['x', 'y'],
          [q.Add(q.Var('x'), q.Var('y')), q.Multiply(q.Var('x'), q.Var('y'))]
        )
      ),
      'Query(Lambda(["x", "y"], [Add(Var("x"), Var("y")), Multiply(Var("x"), Var("y"))]))'
    )

    //underscored names
    assertPrint(
      new Query(q.Lambda('coll', q.IsEmpty(q.Var('coll')))),
      'Query(Lambda("coll", IsEmpty(Var("coll"))))'
    )
    assertPrint(
      new Query(q.Lambda('secret', q.KeyFromSecret(q.Var('secret')))),
      'Query(Lambda("secret", KeyFromSecret(Var("secret"))))'
    )

    //special case
    assertPrint(
      new Query(q.Lambda('coll', q.IsNonEmpty(q.Var('coll')))),
      'Query(Lambda("coll", IsNonEmpty(Var("coll"))))'
    )

    //vararg functions
    assertPrint(
      new Query(q.Lambda('x', q.Do(q.Var('x'), q.Var('x')))),
      'Query(Lambda("x", Do(Var("x"), Var("x"))))'
    )
    assertPrint(
      new Query(q.Lambda('ref', q.Call(q.Var('ref'), [1, 2, 3]))),
      'Query(Lambda("ref", Call(Var("ref"), [1, 2, 3])))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Union(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Union(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Intersection(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Intersection(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Difference(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Difference(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Equals(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Equals(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Add(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Add(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Multiply(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Multiply(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Subtract(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Subtract(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Divide(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Divide(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Modulo(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Modulo(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.LT(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], LT(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.LTE(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], LTE(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.GT(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], GT(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.GTE(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], GTE(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.And(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], And(Var("x"), Var("y"))))'
    )
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Or(q.Var('x'), q.Var('y')))),
      'Query(Lambda(["x", "y"], Or(Var("x"), Var("y"))))'
    )

    //nested varargs
    assertPrint(
      new Query(q.Lambda(['x', 'y'], q.Add(q.Var('x'), q.Add(q.Var('y'), 1)))),
      'Query(Lambda(["x", "y"], Add(Var("x"), Add(Var("y"), 1))))'
    )

    //let expr
    assertPrint(
      new Query(q.Lambda('_', q.Let({ x: 10, y: 20 }, q.Var('x')))),
      'Query(Lambda("_", Let([{x: 10}, {y: 20}], Var("x"))))'
    )

    assertPrint(
      new Query(q.Lambda('_', q.Let([{ x: 10 }, { y: 20 }], q.Var('x')))),
      'Query(Lambda("_", Let([{x: 10}, {y: 20}], Var("x"))))'
    )

    // filter expr
    assertPrint(
      new Query(
        q.Filter([1, 2, 3], q.Lambda('i', q.Equals(0, q.Modulo(q.Var('i'), 2))))
      ),
      'Query(Filter([1, 2, 3], Lambda("i", Equals(0, Modulo(Var("i"), 2)))))'
    )

    // map expr
    assertPrint(
      new Query(
        q.Map([1, 2, 3], q.Lambda('i', q.Equals(0, q.Modulo(q.Var('i'), 2))))
      ),
      'Query(Map([1, 2, 3], Lambda("i", Equals(0, Modulo(Var("i"), 2)))))'
    )

    // foreach expr
    assertPrint(
      new Query(
        q.Foreach(
          [1, 2, 3],
          q.Lambda('i', q.Equals(0, q.Modulo(q.Var('i'), 2)))
        )
      ),
      'Query(Foreach([1, 2, 3], Lambda("i", Equals(0, Modulo(Var("i"), 2)))))'
    )
  })

  test('pretty print Expr with primitive types', () => {
    assertPrint(
      new Query(q.Lambda('_', { x: true, y: false, z: 'str', w: 10 })),
      'Query(Lambda("_", {x: true, y: false, z: "str", w: 10}))'
    )

    assertPrint(
      new Query(q.Lambda('_', [true, false, 'str', 10])),
      'Query(Lambda("_", [true, false, "str", 10]))'
    )

    assertPrint(
      new Query(q.Lambda('_', [null, undefined])),
      'Query(Lambda("_", [null, undefined]))'
    )

    assertPrint(
      new Query(q.Lambda('_', Symbol('foo'))),
      'Query(Lambda("_", "foo"))'
    )

    // versioned queries/lambdas
    assertPrint(
      new Query({ api_version: '2.12', lambda: 'X', expr: { var: 'X' } }),
      'Query(Lambda("X", Var("X")))'
    )

    assertPrint(
      new Query({ api_version: '3', lambda: 'X', expr: { var: 'X' } }),
      'Query(Lambda("X", Var("X")))'
    )

    assertPrint(
      new Query({ lambda: 'X', expr: { var: 'X' }, api_version: '3' }),
      'Query(Lambda("X", Var("X")))'
    )
  })

  test('pretty print despite argument order', () => {
    // Match
    assertPrint(
      new Query({
        api_version: '3',
        expr: {
          match: {
            index: 'idx',
          },
          terms: ['str', 10],
        },
        lambda: '_',
      }),
      'Query(Lambda("_", Match(Index("idx"), ["str", 10])))'
    )

    assertPrint(
      new Query({
        expr: {
          terms: 10,
          match: {
            index: 'idx',
          },
        },
        api_version: '3',
        lambda: '_',
      }),
      'Query(Lambda("_", Match(Index("idx"), 10)))'
    )

    // Filter an array
    assertPrint(
      new Query({
        collection: [1, 2, 3],
        filter: {
          expr: {
            equals: [0, { modulo: [{ var: 'i' }, 2] }],
          },
          lambda: 'i',
        },
      }),
      'Query(Filter([1, 2, 3], Lambda("i", Equals(0, Modulo(Var("i"), 2)))))'
    )

    // Filter a page
    assertPrint(
      new Query({
        filter: {
          lambda: 'i',
          expr: {
            contains_str: { select: 'name', from: { get: { var: 'i' } } },
            search: '-',
          },
        },
        collection: { paginate: { databases: null } },
      }),
      'Query(Filter(Paginate(Databases()), Lambda("i", ContainsStr(Select("name", Get(Var("i"))), "-"))))'
    )

    // Select
    assertPrint(
      new Query({
        from: {
          object: {
            favorites: {
              object: {
                foods: ['crunchings', 'munchings', 'lunchings'],
              },
            },
          },
        },
        select: ['favorites', 'foods', 1],
      }),
      'Query(Select(["favorites", "foods", 1], {favorites: {foods: ["crunchings", "munchings", "lunchings"]}}))'
    )

    // Map an Array
    assertPrint(
      new Query({
        map: { lambda: 'x', expr: { add: [{ var: 'x' }, 1] } },
        collection: [1, 2, 3],
      }),
      'Query(Map([1, 2, 3], Lambda("x", Add(Var("x"), 1))))'
    )

    // Map a Page
    new assertPrint(
      new Query({
        map: {
          expr: { get: { var: 'x' } },
          lambda: 'x',
        },
        collection: { paginate: { databases: null } },
      }),
      'Query(Map(Paginate(Databases()), Lambda("x", Get(Var("x")))))'
    )

    // Foreach
    assertPrint(
      new Query({
        collection: { paginate: { documents: { collection: 'orders' } } },
        foreach: {
          lambda: 'doc',
          expr: {
            update: { var: 'doc' },
            params: { object: { data: { object: { createdBy: 'Ryan' } } } },
          },
        },
      }),
      `Query(Foreach(Paginate(Documents(Collection("orders"))), Lambda("doc", Update(Var("doc"), {data: {createdBy: "Ryan"}}))))`
    )

    // If
    assertPrint(
      new Query({
        else: 'was false',
        then: 'was true',
        if: true,
      }),
      `Query(If(true, "was true", "was false"))`
    )

    // Call
    assertPrint(
      new Query({
        arguments: 2,
        call: {
          function: 'double',
        },
      }),
      `Query(Call(Function("double"), 2))`
    )

    assertPrint(
      new Query({
        arguments: [1, 2, 3],
        call: {
          function: 'double',
        },
      }),
      `Query(Call(Function("double"), [1, 2, 3]))`
    )

    assertPrint(
      new Query({
        arguments: {
          object: {
            one: 1,
            two: 2,
            three: 3,
          },
        },
        call: {
          function: 'double',
        },
      }),
      `Query(Call(Function("double"), {one: 1, two: 2, three: 3}))`
    )

    // Databases
    assertPrint(
      new Query({
        databases: {
          database: 'lettuce',
        },
      }),
      'Query(Databases(Database("lettuce")))'
    )

    assertPrint(
      new Query({
        databases: null,
      }),
      'Query(Databases())'
    )

    // Collections
    assertPrint(
      new Query({
        collections: {
          database: 'lettuce',
        },
      }),
      'Query(Collections(Database("lettuce")))'
    )

    assertPrint(
      new Query({
        collections: null,
      }),
      'Query(Collections())'
    )

    // Documents
    assertPrint(
      new Query({
        documents: {
          collection: 'lettuce',
        },
      }),
      'Query(Documents(Collection("lettuce")))'
    )

    assertPrint(
      new Query({
        documents: null,
      }),
      'Query(Documents(null))'
    )

    // API v3 Contains* functions
    assertPrint(
      new Query({
        in: { object: { a: { object: { b: 1 } } } },
        contains_path: ['a', 'b'],
      }),
      'Query(ContainsPath(["a", "b"], {a: {b: 1}}))'
    )

    assertPrint(
      new Query({
        in: { object: { a: { object: { b: 1 } } } },
        contains_field: ['a', 'b'],
      }),
      'Query(ContainsField(["a", "b"], {a: {b: 1}}))'
    )

    assertPrint(
      new Query({
        in: { object: { a: { object: { b: 1 } } } },
        contains_value: ['a', 'b'],
      }),
      'Query(ContainsValue(["a", "b"], {a: {b: 1}}))'
    )

    assertPrint(
      new Query({
        let: {
          three: { add: [{ var: 'two' }, 1] },
          two: { add: [{ var: 'one' }, 1] },
          one: { add: [0, 1] },
        },
        in: { var: 'three' },
      }),
      'Query(Let({three: Add(Var("two"), 1), two: Add(Var("one"), 1), one: Add(0, 1)}, Var("three")))'
    )

    assertPrint(
      new Query({
        lambda: 'x',
        expr: {
          let: [{ y: { var: 'x' } }],
          in: { add: [1, { var: 'y' }] },
        },
      }),
      'Query(Lambda("x", Let([{y: Var("x")}], Add(1, Var("y")))))'
    )
  })

  test('test non-snake cased functions', () => {
    assertPrint(
      new Query({
        regex_escape: '.Fa*[un]a{1,}',
      }),
      'Query(RegexEscape(".Fa*[un]a{1,}"))'
    )

    assertPrint(
      new Query({
        starts_with: 'Fauna',
        search: 'F',
      }),
      'Query(StartsWith("Fauna", "F"))'
    )

    assertPrint(
      new Query({
        ends_with: 'Fauna',
        search: 'a',
      }),
      'Query(EndsWith("Fauna", "a"))'
    )

    assertPrint(
      new Query({
        contains_str: 'Fauna',
        search: 'una',
      }),
      'Query(ContainsStr("Fauna", "una"))'
    )

    assertPrint(
      new Query({
        contains_str_regex: 'Fauna',
        pattern: '(Fa|na)',
      }),
      'Query(ContainsStrRegex("Fauna", "(Fa|na)"))'
    )

    assertPrint(
      new Query({
        find_str: 'fire and fireman',
        find: 'fire',
      }),
      'Query(FindStr("fire and fireman", "fire"))'
    )

    assertPrint(
      new Query({ find_str_regex: 'fire and Fireman', pattern: '[Ff]ire' }),
      'Query(FindStrRegex("fire and Fireman", "[Ff]ire"))'
    )

    assertPrint(
      new Query({ lower_case: 'Fire And FireMan' }),
      'Query(LowerCase("Fire And FireMan"))'
    )

    assertPrint(new Query({ l_trim: ' Fire' }), 'Query(LTrim(" Fire"))')

    assertPrint(
      new Query({
        replace_str: 'One Fish Two Fish',
        find: 'Two',
        replace: 'Blue',
      }),
      'Query(ReplaceStr("One Fish Two Fish", "Two", "Blue"))'
    )

    assertPrint(
      new Query({
        replace_str_regex: 'One Fisk Two FisT',
        pattern: 'Fis.',
        replace: 'Fish',
        first: true,
      }),
      'Query(ReplaceStrRegex("One Fisk Two FisT", "Fis.", "Fish", true))'
    )

    assertPrint(new Query({ r_trim: 'Fire  ' }), 'Query(RTrim("Fire  "))')

    assertPrint(
      new Query({ sub_string: 'ABCDEFGHIJK', start: 2, length: 3 }),
      'Query(SubString("ABCDEFGHIJK", 2, 3))'
    )

    assertPrint(
      new Query({ title_case: 'FIRE And FireMan' }),
      'Query(TitleCase("FIRE And FireMan"))'
    )

    assertPrint(
      new Query({ upper_case: 'Fire And FireMan' }),
      'Query(UpperCase("Fire And FireMan"))'
    )

    assertPrint(new Query({ bit_and: [0, 0] }), 'Query(BitAnd(0, 0))')

    assertPrint(new Query({ bit_not: 7 }), 'Query(BitNot(7))')

    assertPrint(new Query({ bit_or: [0, 0] }), 'Query(BitOr(0, 0))')

    assertPrint(new Query({ bit_xor: [0, 0] }), 'Query(BitXor(0, 0))')
  })
})

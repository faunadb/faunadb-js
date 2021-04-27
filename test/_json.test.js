import { parseJSONStreaming } from '../src/_json'

describe('parseJSONStreaming', () => {
  test('parse non-delimited JSON objects', () => {
    const jsonText = `{"foo": "bar"}`
    const { values, buffer } = parseJSONStreaming(jsonText)
    expect(values).toEqual([{ foo: 'bar' }])
    expect(buffer).toEqual('')
  })

  test('parse line-delimited JSON objects', () => {
    const jsonText = `{"foo": "bar"}\r\n{"baz": 42}\r\n`
    const { values, buffer } = parseJSONStreaming(jsonText)
    expect(values).toEqual([{ foo: 'bar' }, { baz: 42 }])
    expect(buffer).toEqual('')
  })

  test('parse partially delievered JSON objects', () => {
    const jsonText = `{"foo": "bar"}\r\n{"baz`
    const { values, buffer } = parseJSONStreaming(jsonText)
    expect(values).toEqual([{ foo: 'bar' }])
    expect(buffer).toEqual(`{"baz`)
  })

  test.only('ignore leading new line', () => {
    const jsonText = `\r\n{"foo": "bar"}\r\n{"baz`
    const { values, buffer } = parseJSONStreaming(jsonText)
    expect(values).toEqual([{ foo: 'bar' }])
    expect(buffer).toEqual(`{"baz`)
  })
})

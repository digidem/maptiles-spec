var test = require('tape')

var structure = require('../lib/structure')

var validType = {
  buffer: true,
  ascii: true,
  'utf-8': true,
  'UInt8': true,
  'UInt32BE': true,
  'UInt64BE': true,
  'DoubleBE': true
}

test('Field definition structure is correct', function (t) {
  Object.keys(structure).forEach(function (block) {
    Object.keys(structure[block]).forEach(function (field) {
      var def = structure[block][field]
      if (!(block === 'tileBlock' && field === 'data')) {
        t.equal(typeof def.offset, 'number')
      }
      if (typeof def.size !== 'undefined') {
        t.equal(typeof def.size, 'number')
      }
      if (typeof def.type !== 'undefined') {
        t.ok(validType[def.type])
      }
      t.ok(isValidMatch(def.match))
    })
  })
  t.end()
})

function isValidMatch (match) {
  switch (typeof match) {
    case 'undefined':
    case 'string':
    case 'number':
    case 'function':
      return true
    case 'object':
      if (Array.isArray(match)) return true
      if (Buffer.isBuffer(match)) return true
    default: // eslint-disable-line no-fallthrough
      return false
  }
}

test('Fields do not overlap', function (t) {
  Object.keys(structure).forEach(function (block) {
    var fields = Object.keys(structure[block])
      .sort(function (a, b) {
        return structure[block][a].offset - structure[block][b].offset
      })
    var prevEnd = 0
    fields.forEach(function (field) {
      var def = structure[block][field]
      if (typeof def.offset === 'undefined') return
      if (isNaN(prevEnd)) return
      t.equal(def.offset, prevEnd)
      prevEnd = def.offset + def.size
    })
  })
  t.end()
})

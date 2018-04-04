#!/usr/bin/env node

var babylon = require('babylon')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')

var structure = require('../lib/structure')
var version = require('../package.json').version

var interested = [
  'header',
  'metadata',
  'indexBlock',
  'tileBlock'
]

var tableHeader = `
 Offset | Size (Bytes) | Type/Contents | Description
--------|--------------|---------------|-------------
`

var code = fs.readFileSync('./lib/structure.js', 'utf-8')
var ast = babylon.parse(code)

var header = ast.program.body[0].leadingComments
  .map(parseCommentBlock)
  .join('\n') + '\n'

var declarations = ast.program.body
  .filter(filterInterested)
  .sort(sortInterested)

var sectionHeaders = declarations
  .map(mapLeadingComments)
  .reduce((acc, txt, i) => {
    acc[interested[i]] = txt
    return acc
  }, {})

var descriptions = declarations
  .reduce((acc, node, i) => {
    acc[interested[i]] = mapPropertyComments(node)
    return acc
  }, {})

var text = header

Object.keys(descriptions).forEach(blockName => {
  var block = structure[blockName]
  text += sectionHeaders[blockName]
  text += tableHeader
  Object.keys(block)
    .sort((a, b) => {
      return block[a].offset - block[b].offset
    })
    .forEach(field => {
      var def = block[field]
      text += [
        def.offset,
        def.size,
        def.type,
        descriptions[blockName][field]
      ].join('|') + '\n'
    })
})

var output = path.join(process.cwd(), version, 'SPEC.md')

mkdirp.sync(path.dirname(output))
fs.writeFileSync(output, text)

function parseCommentBlock (commentBlock) {
  return commentBlock.value
    .replace(/\n \*/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/^\*\n/, '')
    .replace(/^ /, '')
}

function filterInterested (node) {
  return node.type === 'VariableDeclaration' &&
    node.declarations[0].type === 'VariableDeclarator' &&
    interested.indexOf(node.declarations[0].id.name) > -1
}

function sortInterested (a, b) {
  return interested.indexOf(a.declarations[0].id.name) -
    interested.indexOf(b.declarations[0].id.name)
}

function mapLeadingComments (node) {
  return node.leadingComments.map(parseCommentBlock).join('\n')
}

function mapPropertyComments (node) {
  return node.declarations[0].init.elements
    .reduce((acc, element) => {
      var nameProp = element.properties.find(findProp('name'))
      acc[nameProp.value.value] = nameProp.leadingComments
        .map(parseCommentBlock).join(' ')
      return acc
    }, {})
}

function findProp (propName) {
  return prop => prop.key.name === propName
}

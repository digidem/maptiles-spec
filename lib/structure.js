/**
 * # MapTiles File Structure
 *
 * The exports of this file describe the file structure of the MapTiles file
 * format. The file must always start with `header` followed by `metadata`
 * followed by an `indexBlock`. The rest of the file is any number of
 * `indexBlock`, `tileBlock` and `additionalMetadata`.
 *
 * `header` starts at position `0` in the file. All block descriptions below
 * list byte offsets relative to the start of that block.
 *
 * Multi-byte encoding is Big-Endian.
 */

var constants = require('./constants')

var QUADKEY_REGEXP = /^[0-4]{0,23}$/

/**
 * ## Header
 *
 * The file header contains information about the format, max-zoom for the
 * index, and whether to use 32-bit or 64-bit offsets in the index. Using 32-bit
 * offsets limits the max file size to 4TB, but the index will be half the size.
 * These values cannot be changed, they define the structure of the rest of the
 * file.
 */
var header = [{
  // File signature (magic number) `MAPTILES` encoded as ascii
  name: 'magicNumber',
  size: 8,
  type: 'buffer',
  match: constants.MAGIC_NUMBER
}, {
  // File format version
  name: 'version',
  size: 1,
  type: 'UInt8'
}, {
  // Offset of metadata block in the file
  name: 'metadataOffset',
  size: 4,
  type: 'UInt32BE'
}]

/**
 * ## Metadata
 *
 * The metadata block immediately follows the header block.
 *
 * Metadata describing the tileset, required. All values are optional, but if
 * available can help the efficiency of reading the data. All strings are
 * zero-padded with `\u0000`.
 */
var metadata = [{
  // Type === `M` encoded as ascii
  name: 'type',
  size: 1,
  type: 'buffer',
  match: constants.METADATA_BLOCK
}, {
  // Length in bytes of the entire metadata block (file readers should use to
  // ensure forwards compatibility, since the metadatablock size could grow)
  name: 'length',
  size: 4,
  type: 'UInt32BE'
}, {
  // A unique ascii-encoded id for the tileset
  name: 'id',
  size: 50,
  type: 'ascii',
  optional: true
}, {
  // Tilset name
  name: 'name',
  size: 100,
  type: 'utf-8',
  optional: true
}, {
  // Longitude of western edge of the bounding box of the tiles in this file
  name: 'bboxWest',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Latitude of southern edge of the bounding box of the tiles in this file
  name: 'bboxSouth',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Longitude of eastern edge of the bounding box of the tiles in this file
  name: 'bboxEast',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Latitude of northern edge of the bounding box of the tiles in this file
  name: 'bboxNorth',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Minimum zoom of tiledata (integer)
  name: 'minZoom',
  size: 1,
  type: 'UInt8',
  optional: true
}, {
  // Maximum zoon of tiledata (integer)
  name: 'maxZoom',
  size: 1,
  type: 'UInt8',
  optional: true
}, {
  // Initial zoom of tiledata for display (float)
  name: 'initialZoom',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Initial center longitude
  name: 'initialLon',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Initial center latitude
  name: 'initialLat',
  size: 8,
  type: 'DoubleBE',
  optional: true
}, {
  // Tile data mimeType e.g. `image/png`, `image/jpg`,
  // `application/vnd.mapbox-vector-tile`
  name: 'tileMimeType',
  size: 255,
  type: 'ascii',
  optional: true
}, {
  // Offset of additional metadata block in file
  name: 'additionalMetadataOffset',
  size: 8,
  type: 'UInt64BE',
  optional: true
}]

/**
 * ## Index Block
 *
 * Index blocks are lists of offsets to the tile data. They consist of a header
 * and a chunk of data. The first index block starts after the file header and
 * metadata blocks and is required. Other index blocks are optional and can be
 * anywhere in the file, but the first index block should point to any others
 * which are either its parent or children.
 *
 * ### Index Block Data
 *
 * The index block data starts at offset 33 in the index block. It is a list of
 * 4-byte (32-bit) or 8-byte (64-bit) integer offsets of tile or index data
 * chunks in the file. An index block starts with offset of a single tile and
 * contains the offsets of all of its children up to the specified number of
 * zoom levels. The size of an index block data is always `4^indexDepth x
 * block_size` bytes. Offsets in the index block can either refer to tile blocks
 * or additional index blocks for that tile and all of its children. Offsets may
 * be null if the tile data is not present in the file. The offsets are ordered
 * by the quadkey they refer to e.g.
 */
var indexBlock = [{
  // Type === `I` (Index Block) encoded as ascii
  name: 'type',
  size: 1,
  type: 'buffer',
  match: constants.INDEX_BLOCK
}, {
  // Bytes used to store entries in this index block, either
  // `4` or `8`. A 32-bit file has a max size of 4TB.
  // A 64-bit file requires a larger (2x) index. Entries in an index are offsets
  // to the tile blocks.
  name: 'entryLength',
  size: 1,
  type: 'UInt8',
  match: [4, 8]
}, {
  // Depth of index (number of zoom levels)
  name: 'depth',
  size: 1,
  type: 'UInt8'
}, {
  // Quadkey of first tile in this index block
  name: 'firstQuadkey',
  size: 23,
  type: 'ascii',
  match: function (v) { return QUADKEY_REGEXP.test(v) }
}, {
  // Offset of parent index block in file
  name: 'parentOffset',
  size: 8,
  type: 'UInt64BE',
  optional: true
}, {
  // The index data itself, a list of offsets to tile data starting at
  // the tile `firstQuadkey` and all of its children ordered by quadkey
  name: 'data'
}]

/**
 * ## Tile Block
 *
 * Tile blocks contain a header which includes the content-length and hash of
 * the data, and the tile data itself.
 */
var tileBlock = [{
  // Type === `T` (Tile Block) encoded as ascii
  name: 'type',
  size: 1,
  type: 'buffer',
  match: constants.TILE_BLOCK
}, {
  // The length of the entire tile block, including the header and trailing hash
  name: 'length',
  size: 4,
  type: 'UInt32BE'
}, {
  // Tiledata
  name: 'data'
}, {
  // md5 hash of the tile data. This is used for writing, multiple index
  // entries can point to the same tile
  name: 'hash',
  size: 16,
  type: 'buffer'
}]

/**
 * ## Additional Metadata
 *
 * TBD...
 */
var additionalMetadata = [{
  // Type === `A` encoded as ascii
  name: 'type',
  size: 1,
  type: 'buffer',
  match: constants.ADD_METADATA_BLOCK
}, {
  // Length of additional metadata block
  name: 'length',
  size: 4,
  type: 'UInt32BE'
}]

var structure = {
  header: header,
  metadata: metadata,
  indexBlock: indexBlock,
  tileBlock: tileBlock,
  additionalMetadata: additionalMetadata
}

module.exports = transform(structure)

// Add offsets to each field definition
function addOffsets () {
  var offset = 0
  return function (def) {
    def.offset = offset
    offset += def.size || 0
    return def
  }
}

// Add block names to each field definition
function addBlockNames (blockName) {
  return function (def) {
    def.blockName = blockName
    return def
  }
}

// Map array to hash with def names as keys
function hashMap (acc, def) {
  acc[def.name] = def
  return acc
}

// Transform the file structure
function transform (structure) {
  Object.keys(structure).forEach(function (blockName) {
    structure[blockName] = structure[blockName]
      .map(addOffsets())
      .map(addBlockNames(blockName))
      .reduce(hashMap, {})
  })
  return structure
}

module.exports = {
  MAGIC_NUMBER: Buffer.from('MAPTILES', 'ascii'),
  INDEX_BLOCK: Buffer.from('I', 'ascii'),
  TILE_BLOCK: Buffer.from('T', 'ascii'),
  METADATA_BLOCK: Buffer.from('D', 'ascii'),
  ADD_METADATA_BLOCK: Buffer.from('A', 'ascii'),
  ENTRY_LENGTH: 4
}

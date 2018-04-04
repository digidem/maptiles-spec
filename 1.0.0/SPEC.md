# MapTiles File Structure

The exports of this file describe the file structure of the MapTiles file
format. The file must always start with `header` followed by `metadata`
followed by an `indexBlock`. The rest of the file is any number of
`indexBlock`, `tileBlock` and `additionalMetadata`.

`header` starts at position `0` in the file. All block descriptions below
list byte offsets relative to the start of that block.

Multi-byte encoding is Big-Endian.

## Header

The file header contains information about the format, max-zoom for the
index, and whether to use 32-bit or 64-bit offsets in the index. Using 32-bit
offsets limits the max file size to 4TB, but the index will be half the size.
These values cannot be changed, they define the structure of the rest of the
file.

 Offset | Size (Bytes) | Type/Contents | Description
--------|--------------|---------------|-------------
0|8|buffer|File signature (magic number) `MAPTILES` encoded as ascii
8|1|UInt8|File format version
9|4|UInt32BE|Offset of metadata block in the file
## Metadata

The metadata block immediately follows the header block.

Metadata describing the tileset, required. All values are optional, but if
available can help the efficiency of reading the data. All strings are
zero-padded with `\u0000`.

 Offset | Size (Bytes) | Type/Contents | Description
--------|--------------|---------------|-------------
0|1|buffer|Type === `M` encoded as ascii
1|4|UInt32BE|Length in bytes of the entire metadata block (file readers should use to ensure forwards compatibility, since the metadatablock size could grow)
5|50|ascii|A unique ascii-encoded id for the tileset
55|100|utf-8|Tilset name
155|8|DoubleBE|Longitude of western edge of the bounding box of the tiles in this file
163|8|DoubleBE|Latitude of southern edge of the bounding box of the tiles in this file
171|8|DoubleBE|Longitude of eastern edge of the bounding box of the tiles in this file
179|8|DoubleBE|Latitude of northern edge of the bounding box of the tiles in this file
187|1|UInt8|Minimum zoom of tiledata (integer)
188|1|UInt8|Maximum zoon of tiledata (integer)
189|8|DoubleBE|Initial zoom of tiledata for display (float)
197|8|DoubleBE|Initial center longitude
205|8|DoubleBE|Initial center latitude
213|255|ascii|Tile data mimeType e.g. `image/png`, `image/jpg`, `application/vnd.mapbox-vector-tile`
468|8|UInt64BE|Offset of additional metadata block in file
## Index Block

Index blocks are lists of offsets to the tile data. They consist of a header
and a chunk of data. The first index block starts after the file header and
metadata blocks and is required. Other index blocks are optional and can be
anywhere in the file, but the first index block should point to any others
which are either its parent or children.

### Index Block Data

The index block data starts at offset 33 in the index block. It is a list of
4-byte (32-bit) or 8-byte (64-bit) integer offsets of tile or index data
chunks in the file. An index block starts with offset of a single tile and
contains the offsets of all of its children up to the specified number of
zoom levels. The size of an index block data is always `4^indexDepth x
block_size` bytes. Offsets in the index block can either refer to tile blocks
or additional index blocks for that tile and all of its children. Offsets may
be null if the tile data is not present in the file. The offsets are ordered
by the quadkey they refer to e.g.

 Offset | Size (Bytes) | Type/Contents | Description
--------|--------------|---------------|-------------
0|1|buffer|Type === `I` (Index Block) encoded as ascii
1|1|UInt8|Bytes used to store entries in this index block, either `4` or `8`. A 32-bit file has a max size of 4TB. A 64-bit file requires a larger (2x) index. Entries in an index are offsets to the tile blocks.
2|1|UInt8|Depth of index (number of zoom levels)
3|23|ascii|Quadkey of first tile in this index block
26|8|UInt64BE|Offset of parent index block in file
34|||The index data itself, a list of offsets to tile data starting at the tile `firstQuadkey` and all of its children ordered by quadkey
## Tile Block

Tile blocks contain a header which includes the content-length and hash of
the data, and the tile data itself.

 Offset | Size (Bytes) | Type/Contents | Description
--------|--------------|---------------|-------------
0|1|buffer|Type === `T` (Tile Block) encoded as ascii
1|4|UInt32BE|The length of the entire tile block, including the header and trailing hash
5|||Tiledata
5|16|buffer|md5 hash of the tile data. This is used for writing, multiple index entries can point to the same tile

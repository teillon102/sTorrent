import { Buffer } from 'buffer';
import torrentParser from './torrent-parser.js';
import { genId} from '../util.js';

//https://wiki.theory.org/BitTorrentSpecification#Messages

  /*
    handshake: <pstrlen><pstr><reserved><info_hash><peer_id>

    pstrlen: string length of <pstr>, as a single raw byte
    pstr: string identifier of the protocol
    reserved: eight (8) reserved bytes. All current implementations use all zeroes.
    info_hash: 20-byte SHA1 hash of the info key in the metainfo file. This is the same info_hash that is transmitted in tracker requests.
    peer_id: 20-byte string used as a unique ID for the client.

    In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".
  */
export function buildHandshake(torrent){
    const buf = Buffer.alloc(68);
    buf.writeUInt8(19, 0); // pstrlen
    buf.write('BitTorrent Protocol'); // pstr
    buf.writeBigUInt64BE(0, 20) // reserved
    torrentParser.infoHash(torrent).copy(buf, 28); // info hash
    buf.write(genId()); // peer Id

    return buf;
}

// All of the remaining messages in the protocol take the form of <length prefix><message ID><payload>.
// The length prefix is a four byte big-endian value. The message ID is a single decimal byte. The payload is message dependent.

  /*
    keep-alive: <len=0000>
    The keep-alive message is a message with zero bytes, specified with the length prefix set to zero. There is no message ID and no payload.
    Peers may close a connection if they receive no messages (keep-alive or any other message) for a certain period of time, so a keep-alive message
    must be sent to maintain the connection alive if no command have been sent for a given amount of time. This amount of time is generally two minutes.
  */

export function buildKeepAlive(){
    return Buffer.alloc(4);
}

  /*
    choke: <len=0001><id=0>
    The choke message is fixed-length and has no payload.
  */
export function buildChoke(){
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0); // length
    buf.writeUInt8(0, 4); // id
    return buf;
}

  /*
    unchoke: <len=0001><id=1>
    The unchoke message is fixed-length and has no payload.
  */
export function buildUnchoke(){
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0); // length
    buf.writeUInt8(1, 4); // id
    return buf;
}

  /*
    interested: <len=0001><id=2>
    The interested message is fixed-length and has no payload.
  */
export function buildInterested(){
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0); // length
    buf.writeUInt8(2, 4); // id
    return buf;
}

  /*
    not interested: <len=0001><id=3>
    The not interested message is fixed-length and has no payload.
  */
export function buildUninterested(){
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0); // length
    buf.writeUInt8(3, 4); // id
    return buf;
}

  /*
    have: <len=0005><id=4><piece index>
    The have message is fixed length. The payload is the zero-based index of a piece that has just been successfully downloaded and verified via the hash.
  */
export function buildHave(payload){
    const buf = Buffer.alloc(9);
    buf.writeUInt32BE(5, 0); // length
    buf.writeUInt8(4, 4); // id
    buf.writeUInt32BE(payload, 5); // piece index
    return buf;
}
  /*
    bitfield: <len=0001+X><id=5><bitfield>
    The bitfield message may only be sent immediately after the handshaking sequence is completed, and before any other messages are sent.
    It is optional, and need not be sent if a client has no pieces. The bitfield message is variable length, where X is the length of the bitfield.
    The payload is a bitfield representing the pieces that have been successfully downloaded. The high bit in the first byte corresponds to piece index 0.
    Bits that are cleared indicated a missing piece, and set bits indicate a valid and available piece. Spare bits at the end are set to zero.
    Some clients (Deluge for example) send bitfield with missing pieces even if it has all data. Then it sends rest of pieces as have messages.
    They are saying this helps against ISP filtering of BitTorrent protocol. It is called lazy bitfield.
    A bitfield of the wrong length is considered an error. Clients should drop the connection if they receive bitfields that are not of the correct size, 
    or if the bitfield has any of the spare bits set.
  */
export function buildBitfield(payload){
    const buf = Buffer.alloc(5 + payload.length); // 4 bytes length, 1 byte id, length of bitfield
    buf.writeUInt32BE(1 + payload.length, 0); // length
    buf.writeUInt8(5, 4); // id
    payload.copy(buf, 5); // bitfield
    return buf;
}

  /*
    request: <len=0013><id=6><index><begin><length>
    The request message is fixed length, and is used to request a block. The payload contains the following information:
        index: integer specifying the zero-based piece index
        begin: integer specifying the zero-based byte offset within the piece
        length: integer specifying the requested length.
  */
export function buildRequest(payload){
    const buf = Buffer.alloc(17);
    buf.writeUInt32BE(13, 0); // length
    buf.writeUInt8(6, 4); // id
    buf.writeUInt32BE(payload.index, 5); // index
    buf.writeUint32BE(payload.begin, 9); // begin
    buf.writeUint32BE(payload.length, 13); // length

    return buf;
}

  /*
    piece: <len=0009+X><id=7><index><begin><block>
    The piece message is variable length, where X is the length of the block. The payload contains the following information:
        index: integer specifying the zero-based piece index
        begin: integer specifying the zero-based byte offset within the piece
        block: block of data, which is a subset of the piece specified by index.
  */
export function buildPiece(payload){
    const buf = Buffer.alloc(13 + payload.block.length); // 9 + 4 + block
    buf.writeUInt32BE(9 + payload.block.length, 0); // length
    buf.writeUInt8(7, 4); // id
    buf.writeUInt32BE(payload.index, 5); // piece index
    buf.writeUint32BE(payload.begin, 9); // begin
    payload.block.copy(buf, 9); // length

    return buf;
}

  /*
    cancel: <len=0013><id=8><index><begin><length>
    The cancel message is fixed length, and is used to cancel block requests. The payload is identical to that of the "request" message.
  */
export function buildCancel(payload){
    const buf = Buffer.alloc(17);
    buf.writeUInt32BE(13, 0); // length
    buf.writeUInt8(8, 4); // id
    buf.writeUInt32BE(payload.index, 5); // index
    buf.writeUint32BE(payload.begin, 9); // begin
    buf.writeUint32BE(payload.length, 13); // length

    return buf;
}

  /*
    port: <len=0003><id=9><listen-port>
    The port message is sent by newer versions of the Mainline that implements a DHT tracker. The listen port is the port this peer's DHT node is listening on.
    This peer should be inserted in the local routing table (if DHT tracker is supported).
  */
export function buildPort(payload){
    const buf = Buffer.alloc(7);
    buf.writeUInt32BE(3, 0); // length
    buf.writeUInt8(9, 4); // id
    buf.writeUInt16BE(payload, 5); // listen-port

    return buf;
}
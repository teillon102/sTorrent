// https://allenkim67.github.io/programming/2016/05/04/how-to-make-your-own-bittorrent-client.html
'use-strict';
import dgram from 'dgram';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { size, infoHash } from './torrent-parser.js';
import { genId } from '../util.js';

export function getPeers(torrent, callback) {
    const socket = dgram.createSocket('udp4');
    const url = new URL(Buffer.from(torrent.announce).toString('utf8'));
    console.log('Url from torrent.announce: ' + url); //debug

    // 1. send connect request
    udpSend(socket, buildConnReq(), url);

    socket.on('message', response => {
        if (respType(response) === 'connect') {
            // 2. receive and parse connect response
            const connResp = parseConnResp(response);
            // 3. send announce request
            const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
            udpSend(socket, announceReq, url);
        } else if (respType(response) === 'announce') {
            // 4. receive and parse announce response
            const announceResp = parseAnnounceResp(response);
            console.log('Peers parsed:', announceResp.peers.length);
            // 5. return peers
            callback(announceResp.peers);
        }
    });
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
    const url = new URL(rawUrl);
    const port = url.port ? parseInt(url.port) : 6969; // Fallback default
    console.log('Tracker URL:', url.href, 'Port:', port);
    socket.send(message, 0, message.length, port, url.hostname, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
}

  /* 
    Offset  Size            Name            Value
    0       64-bit integer  connection_id   0x41727101980
    8       32-bit integer  action          0 // connect
    12      32-bit integer  transaction_id  ? // random
    16 
  */
function buildConnReq() {
  const buf = Buffer.alloc(16);

  buf.writeUInt32BE(0x417, 0); // connection_id
  buf.writeUInt32BE(0x27101980, 4);
  buf.writeUInt32BE(0, 8); // action
  const transactionId = crypto.randomBytes(4); //transaction id
  transactionId.copy(buf, 12);
  console.log('Connect transactionId:', transactionId.toString('hex')); //debug
  console.log ("buildConnReq buffer: ", buf, " buffer size: ", buf.length); //debug
  return buf;
}

  /*
    Offset  Size            Name            Value
    0       32-bit integer  action          0 // connect
    4       32-bit integer  transaction_id
    8       64-bit integer  connection_id
    16
  */
function parseConnResp(resp) {
  //debug
  const transactionId = resp.slice(4, 8);
  console.log('Connect response transactionId:', transactionId.toString('hex'));

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}

// 3.3.2

  /*
    Offset  Size    Name    Value
    0       64-bit integer  connection_id
    8       32-bit integer  action          1 // announce
    12      32-bit integer  transaction_id
    16      20-byte string  info_hash
    36      20-byte string  peer_id
    56      64-bit integer  downloaded
    64      64-bit integer  left
    72      64-bit integer  uploaded
    80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
    84      32-bit integer  IP address      0 // default
    88      32-bit integer  key             ? // random
    92      32-bit integer  num_want        -1 // default
    96      16-bit integer  port            ? // should be betwee
    98
  */
function buildAnnounceReq(connId, torrent, port=6881) {
  const buf = Buffer.allocUnsafe(98);
  connId.copy(buf, 0); // connection id
  buf.writeUInt32BE(1, 8); // action
  const transactionId = crypto.randomBytes(4); // transaction id
  transactionId.copy(buf, 12);
  console.log('Announce transactionId:', transactionId.toString('hex'));
  infoHash(torrent).copy(buf, 16); // info hash
  genId().copy(buf, 36); // peerId
  Buffer.alloc(8).copy(buf, 56); // downloaded
  size(torrent).copy(buf, 64); // left
  Buffer.alloc(8).copy(buf, 72); // uploaded
  buf.writeUint32BE(0, 80); // event
  buf.writeUint32BE(0, 84); // IP address
  crypto.randomBytes(4).copy(buf, 88); // key
  buf.writeInt32BE(-1, 92); // num_want
  buf.writeUInt16BE(port, 96); // port

  return buf;
}

  /*
    Offset      Size            Name            Value
    0           32-bit integer  action          1 // announce
    4           32-bit integer  transaction_id
    8           32-bit integer  interval
    12          32-bit integer  leechers
    16          32-bit integer  seeders
    20 + 6 * n  32-bit integer  IP address
    24 + 6 * n  16-bit integer  TCP port
    20 + 6 * N
  */
function parseAnnounceResp(resp) {
  //debug
  const transactionId = resp.slice(4, 8);
  console.log('Announce response transactionId:', transactionId.toString('hex'));

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    interval: resp.readUInt32BE(8),
    leechers: resp.readUInt32BE(12),
    seeders: resp.readUInt32BE(16),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}

  // split the variable length ints into groups
function group(iterable, groupSize) {
  let groups = [];
  for (let i = 0; i < iterable.length; i += groupSize) {
    groups.push(iterable.slice(i, i + groupSize));
  }
  return groups;
}
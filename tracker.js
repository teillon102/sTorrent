'use-strict';
import dgram from 'dgram';
import { Buffer } from 'buffer';
import crypto from 'crypto';

module.exports.getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4');
    const url = new URL(Buffer.from(torrent.announce).toString('utf8'));

    // 1. send connect request
    udpSend(socket, buildConnReq(), url);

    socket.on('message', response => {
        if (respType(response) === 'connect') {
            // 2. receive and parse connect response
            const connResp = parseConnResp(response);
            // 3. send announce request
            const announceReq = buildAnnounceReq(connResp.connectionId);
            udpSend(socket, announceReq, url);
        } else if (respType(response) === 'announce') {
            // 4. receive and parse announce response
            const announceResp = parseAnnounceResp(response);
            // 5. return peers
            callback(announceResp.peers);
        }
    });
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
    const url = new URL(rawUrl);
    socket.send(message, 0, message.length, url.port, url.hostname, callback);
}

function respType(resp) {
  // ...
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

  // connection_id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32(0, 8);
  // transaction_id
  crypto.randomBytes(4).copy(buf, 12);
}

  /*
    Offset  Size            Name            Value
    0       32-bit integer  action          0 // connect
    4       32-bit integer  transaction_id
    8       64-bit integer  connection_id
    16
  */
function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}

// https://allenkim67.github.io/programming/2016/05/04/how-to-make-your-own-bittorrent-client.html
// 3.3.2

function buildAnnounceReq(connId) {
  // ...
}

function parseAnnounceResp(resp) {
  // ...
}
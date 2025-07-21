import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker.js';
import * as message from './message.js';
import Pieces from './Pieces.js';

export default function (torrent) {
    getPeers(torrent, peers => {
        const pieces = new Pieces(torrent.info.pieces.length / 20);
        peers.forEach(peer => download(peer, torrent, pieces));
    });
};

function download(peer, torrent, pieces) {
    const socket = new net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {
        socket.write(message.buildHandshake(torrent));
    });
    const queue = {choked: true, queue: []};
    onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue));
}

function onWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    socket.on('data', recvBuf => {
        //calc length of whole message
        const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        savedBuf = Buffer.concat([savedBuf, recvBuf]);

        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
            callback(savedBuf.slice(0, msgLen()));
            savedBuf = savedBuf.slice(msgLen());
            handshake = false;
        }
    })
}

function msgHandler(msg, socket, pieces, queue) {
    if (isHandshake(msg)) {
        socket.write(message.buildInterested());
    } else {
        const m = message.parse(msg);

        switch (m.id) {
            case 0:
                chokeHandler(socket);
                break;
            case 1:
                unchokeHandler(socket, pieces, queue);
                break;
            case 4:
                haveHandler(m.payload);
                break;
            case 5:
                bitfieldHandler(m.payload);
                break;
            case 7:
                pieceHandler(m.payload);
                break;
            default:
                console.log("Invalid ID from message: " + m.id);
        }
    }
}

function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49  && msg.toString('utf8', 1) === 'BitTorrent Protocol';
}

function chokeHandler(socket){
    socket.end();
    console.log("Choked, socket closed") // debug   
}

function unchokeHandler(socket, pieces, queue){
    queue.choked = false;
    // to do
    requestPiece(socket, pieces, queue);
    console.log("Unchoked, socket opened") // debug
}

function haveHandler(payload, socket, requested, queue) {
    // ...
    const pieceIndex = payload.readInt32BE(0);
    queue.push(pieceIndex);
    if (queue.length === 1) {
        requestPiece(socket, requested, queue);
    }
}

function bitfieldHandler(payload){
    
}

function pieceHandler(payload, socket, requested, queue) {
    // ...
    queue.shift();
    requestPiece(socket, requested, queue);
}

function requestPiece(socket, pieces, queue) {
    if (queue.choked) {
        console.log("Request failed because we are choked");
        return null;
    }

    while (queue.queue.length) {
        const pieceIndex = queue.shift();
        if (pieces.needed(pieceIndex)) {
            // to be fixed
            socket.write(message.buildRequest(pieceIndex));
            pieces.addRequested(pieceIndex);
            break;
        }
    }
}
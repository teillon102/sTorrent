import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker.js';

export default function (torrent) {
    getPeers(torrent, peers => {
        peers.forEach(download);
    })
}

function download(peer) {
    const socket = new net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {
        //socket.write() todo   
    });
    socket.on('data', data => {
        //handle response
    })
}
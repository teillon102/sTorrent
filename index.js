import fs from 'fs';
import bencode from 'bencode';
import { getPeers } from './tracker.js';

const torrent = bencode.decode(fs.readFileSync('movie.torrent'));

getPeers(torrent, peers => {
    console.log('Peers found:', peers);
    peers.forEach(peer => {
        console.log(`Peer: ${peer.ip}:${peer.port}`);
    });
});
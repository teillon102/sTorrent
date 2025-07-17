'use strict';
import fs from 'fs';
import bencode from 'bencode';
import tracker from './tracker.js';

const torrent = bencode.decode(fs.readFileSync('movie.torrent'));

tracker.getPeers(torrent, peers => {
    console.log('Peers found:', peers);
    peers.forEach(peer => {
        console.log(`Peer: ${peer.ip}:${peer.port}`);
    });
});
import download from './src/download.js'
import { open } from './src/torrent-parser.js'

const torrent = open(process.argv[2]);

download(torrent);
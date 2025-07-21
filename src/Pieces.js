export default class Pieces {
    constructor(size) {
        this.requested = new Array(size).fill(false);
        this.received = new Array(size).fill(false);
    }

    addRequested(pieceIndex) {
        this.requested[pieceIndex] = true;
    }

    addReceived(pieceIndex) {
        this.received[pieceIndex] = true;
    }

    /*
        To check if a piece is needed, we first check if every piece in the
        is already in the requested list. If so, that means some pieces were
        lost in transit, and so we replace the requested list of a copy
        of the received list. Then we can check if the piece is still needed
    */
    needed(pieceIndex) {
        if (this.requested.every(i => i === true)) {
            // uses slice method to return a copy of the array
            this.requested = this.received.slice();
        }
        return !this.requested[pieceIndex];
    }

    isDone() {
        return this.received.every(i => i === true);
    }
}
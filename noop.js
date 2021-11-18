//NoopHash is for baseline testing. It does not checksum any data.
class NoopHash {
    constructor() {}
    update(buf) { return; }
    dispose() { return; }
    digest() { return Buffer.from("DEAFBEEF", "hex"); }
}

function createHash(algo) { return new NoopHash(); };

module.exports = { createHash }
const mod_fs = require("fs");
const mod_vasync = require("vasync");

const mod_nvhash = require("nv-hash");
const mod_crypto = require("crypto");
const mod_noop = require("./noop");

const NODE_CRYPTO_SUFFIX = "-node-crypto";
const BASELINE = "baseline";
const SHA2_CRYPTO = "sha256" + NODE_CRYPTO_SUFFIX;
const SHA2 = "sha2";
const BLAKE3 = "blake3";
const MD5 = "md5";
const MD5_CRYPTO = "md5" + NODE_CRYPTO_SUFFIX;

function use_crypto(algo) {
    return algo.endsWith(NODE_CRYPTO_SUFFIX) ? algo : false;
}

function nvhash_read(algo, filename, cb) {
    const stream = mod_fs.createReadStream(filename);
    let hash;
    let crypto;

    special_cases = [BASELINE, SHA2_CRYPTO, MD5_CRYPTO];

    // We want to test baseline, node-crypto, and nvhash with
    // the same code. This is some indirection to make that possible.
    switch(algo) {
        case BASELINE:
            crypto = mod_noop;
            break;
        case use_crypto(algo):
            crypto = mod_crypto;
            algo = algo.replace(NODE_CRYPTO_SUFFIX, "");
            break;
        default:
            crypto = mod_nvhash;
            break;
    }

    hash = crypto.createHash(algo);

    stream.on("data", d => {
        hash.update(d);
    });

    stream.on("error", err => {
        hash.dispose();
        throw err;
    });

    stream.on("end", () => {
        let dgst = hash.digest();
        cb(dgst);
    });
}

function main() {
    const verbose = false;

    let checksum_bench = function checksum_bench(m_algo, cb) {
        const filename = "./test_files/myfile";
        console.time(m_algo);

        nvhash_read(m_algo, filename, function (dgst) {
            console.timeEnd(m_algo);
            if (dgst === null || dgst === undefined) {
                console.log("null digest for algo:", m_algo);
                return;
            }
            if (verbose) {
                console.log(m_algo, Buffer.from(dgst, "utf-8").toString("hex"));
            }
            cb();
        });
    };

    const algos = [BASELINE, BLAKE3, SHA2_CRYPTO, SHA2, MD5_CRYPTO, MD5, BASELINE];
    mod_vasync.forEachPipeline({
        'func': checksum_bench,
        'inputs': algos,
    }, function(err, _results) {
        if (err !== null) {
            console.log("Checksumming hit an error:", err);
        }
    });
}

main();
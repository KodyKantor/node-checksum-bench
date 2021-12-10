const mod_fs = require("fs");
const mod_vasync = require("vasync");
const mod_perf = require("perf_hooks");

const mod_nvhash = require("nvhash");
const mod_crypto = require("crypto");
const mod_noop = require("./noop");


const NODE_CRYPTO_SUFFIX = "-node-crypto";
const BASELINE = "baseline";
const SHA2_CRYPTO = "sha256" + NODE_CRYPTO_SUFFIX;
const SHA2 = "sha256";
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
    let cumulative_duration = 0;

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
        const start = mod_perf.performance.now();
        hash.update(d);
        cumulative_duration += mod_perf.performance.now() - start;
    });

    stream.on("error", err => {
        hash.dispose();
        throw err;
    });

    stream.on("end", () => {
        let dgst = hash.digest();
        cb({
            "digest": dgst,
            "cumulative_duration": cumulative_duration,
        });
    });
}

function main() {
    const verbose = false;

    let checksum_bench = function checksum_bench(m_algo, cb) {
        const filename = "./test_files/test-input.txt";

        //const data = mod_fs.readFileSync(filename);
        //console.log("hash", Buffer.from(mod_nvhash.hash("md5", "hello"), "utf-8").toString("hex"));

        nvhash_read(m_algo, filename, function (results) {
            if (results.digest === null || results.digest === undefined) {
                console.log("null digest for algo:", m_algo);
                return;
            }
            const dgst_str = Buffer.from(results.digest, "utf-8").toString("hex");
            console.log(`${m_algo}: ${results.cumulative_duration}ms (${dgst_str})`);
            cb();
        });
    };

    const algos = [BASELINE, BLAKE3, SHA2, MD5, SHA2_CRYPTO, MD5_CRYPTO];
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
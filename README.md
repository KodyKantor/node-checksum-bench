# node-checksum-bench

This is a program to benchmark the `nvhash` module, which provides native
and webassembly bindings to popular checksumming algorithms.

## Running

```
# Create a test file.
$ mkdir ./test_files
$ dd if=/dev/zero of=./test_files/test-input.txt bs=1M count=1

# Install dependencies.
$ npm install
$ npm link nvhash # requires nvhash `npm link`d on your local system.

# Run the program.
$ node index.js
```

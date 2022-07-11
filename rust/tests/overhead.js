const { timer } = require ("./timer");
const { hello } = require("..");

const NUM_ITERATIONS = 1_000_000;

const native = timer("Native (1M iterations)");
for (let i = 0; i < NUM_ITERATIONS; i++) {
    hello("there");
}
native.finish();


for (let j = 0; j < 10; j++) {
    const js = timer("Native (1M iterations) x " + j);
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        jsHello(j, "there");
    }
    js.finish();
}

function jsHello(n, s) {
    for (let i = 0; i < n ;i++ ) {
        "hello".split("").join("");
    }
    return "hello";
}

const { readFileSync } = require('fs');
const { normalizePath: tsNormalizePath } = require('typescript');
const { normalizeSlashes, normalizePath: normalizePathNative } = require('./build/Release/normalize-path');
normalizePathNative("")
const relativePathSegmentRegExp = /(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)/;
const backslashRegExp = /\\/g;

const backslashCharCode = '\\'.charCodeAt(0);
const forwardslashCharCode = '/'.charCodeAt(0);
const dotCharCode = '.'.charCodeAt(0);
const iterations = 1_000_000;

setImmediate(go);
const vsCodeTestStrings = readFileSync("C:/github/vscode/src/paths.txt", { encoding: "utf-8" }).split(/\n/g).map(s => s.trim());
const customTestStrings = [
    "/home/ryan/blah/../blah/../blah/../foo/./bar/",
    "\\one\\two\\three\\four",
    "C:/already/good/thanks"
]

const normalizeSlashImps = [
    ["Do Nothing", (_s) => ""],
    ["Do Nothing (with body)", (_s) => {
        _s = _s;
        return _s;
    }],
    ["JS (buffer)", jsNormalizeSlashes_buffer],
    ["JS (regex)", jsNormalizeSlashes_regex],
    ["Native (string)", normalizePathNative],
];

const normalizePathImpls = [
    ["JS (TS)", jsNormalizePath],
    ["JS (Buffer)", jsNormalizePath_buffer],
    ["JS (Buffer+Bail)", jsNormalizePath_buffer_with_bailout],
    ["JS (Buffer+FullBail)", jsNormalizePath_buffer_with_full_bailout],
    ["JS (Fast)", jsNormalizePath_fast],
    ["Native (No Bail)", normalizePathNative],
    ["Native (With Bail)", normalizePathNative_with_bailout]
];

async function go() {
    // Correctness check
    for (const t of vsCodeTestStrings) {
        if (tsNormalizePath(t) !== jsNormalizePath_fast(t)) {
            console.log(t);
            console.log(` TS (J): ${tsNormalizePath(t)}`);
            console.log(` TS (B): ${jsNormalizePath_fast(t)}`);
            return;
        }
    }

    testImplementations(normalizePathImpls, customTestStrings);
    testImplementations(normalizePathImpls, vsCodeTestStrings);
}

function testImplementations(arr, testStrings) {
    if (testStrings.length < 10) {
        for (const s of testStrings) {
            console.log(`Input: "${s}"`);
            for (const [name, impl] of arr) {
                const timer = timeIt(`${name}`);
                for (let i = 0; i < iterations; i++) {
                    impl(s);
                }
                timer.stop();
            }
            console.log();
        }
    }
    console.log(`Overall (Inputs: ${testStrings.length})`);
    for (const [name, impl] of arr) {
        const timer = timeIt(`${name}`);
        for (let i = 0; i < 10; i++) {
            for (const s of vsCodeTestStrings) {
                impl(s);
            }
        }
        timer.stop();
    }
}


function timeIt(s) {
    const now = Date.now();
    return {
        stop() {
            console.log(`${s} ran in ${Date.now() - now}`);
        }
    }
}

function jsNormalizeSlashes_buffer(path) {
    const buffer = Buffer.from(path, "utf-8");
    for (let i = 0; i < buffer.byteLength; i++) {
        if (buffer[i] === backslashCharCode) {
            buffer[i] = forwardslashCharCode;
        }
    }
    return buffer.toString('utf-8');
}

function jsNormalizeSlashes_regex(path) {
    const index = path.indexOf("\\");
    if (index === -1) {
        return path;
    }
    backslashRegExp.lastIndex = index; // prime regex with known position
    return path.replace(backslashRegExp, '/');
}

function jsNormalizePath_fast(path) {
    path = jsNormalizeSlashes_regex(path);
    // Most paths don't require normalization
    if (!relativePathSegmentRegExp.test(path)) {
        return path;
    }
    // Some paths only require cleanup of `/./` or leading `./`
    const simplified = path.replace(/\/\.\//g, "/").replace(/^\.\//, "");
    if (simplified !== path) {
        path = simplified;
        if (!relativePathSegmentRegExp.test(path)) {
            return path;
        }
    }

    return jsNormalizePath_buffer(path);
}

function jsNormalizePath_buffer(path) {
    const buffer = Buffer.from(path, "utf-8");
    const pathBreakPositions = [];
    let j = 0;
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === backslashCharCode) {
            buffer[j] = forwardslashCharCode;
            pathBreakPositions.push(j);
        } else if (buffer[i] === forwardslashCharCode) {
            pathBreakPositions.push(j);
            buffer[j] = buffer[i];
        } else if (buffer[i] === dotCharCode && buffer[j - 1] === forwardslashCharCode) {
            if (buffer[i + 1] === dotCharCode) {
                pathBreakPositions.pop();
                j = pathBreakPositions.pop() - 1;
                i++;
            } else {
                if (buffer[i + 1] === forwardslashCharCode || buffer[i + 1] === backslashCharCode) {
                    j = pathBreakPositions.pop() - 1;
                }
            }
        } else {
            buffer[j] = buffer[i];
        }
        j++;
    }
    return buffer.toString("utf-8", 0, j);
}

function jsNormalizePath_buffer_with_bailout(path) {
    if (/(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)|(?:^|\\)\.\.?(?:$|\\)/.test(path)) {
        return jsNormalizePath_buffer(path);
    }
    return path;
}

function normalizePathNative_with_bailout(path) {
    if (/(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)|(?:^|\\)\.\.?(?:$|\\)/.test(path)) {
        return normalizePathNative(path);
    }
    return path;
}

function jsNormalizePath_buffer_with_full_bailout(path) {
    path = jsNormalizeSlashes_regex(path);
    // Most paths don't require normalization
    if (!relativePathSegmentRegExp.test(path)) {
        return path;
    }
    // Some paths only require cleanup of `/./` or leading `./`
    const simplified = path.replace(/\/\.\//g, "/").replace(/^\.\//, "");
    if (simplified !== path) {
        path = simplified;
        if (!relativePathSegmentRegExp.test(path)) {
            return path;
        }
    }
    return jsNormalizePath_buffer(path);
}

function jsNormalizePath(path) {
    path = jsNormalizeSlashes_regex(path);
    // Most paths don't require normalization
    if (!relativePathSegmentRegExp.test(path)) {
        return path;
    }
    // Some paths only require cleanup of `/./` or leading `./`
    const simplified = path.replace(/\/\.\//g, "/").replace(/^\.\//, "");
    if (simplified !== path) {
        path = simplified;
        if (!relativePathSegmentRegExp.test(path)) {
            return path;
        }
    }
    // Other paths require full normalization
    const normalized = getPathFromPathComponents(reducePathComponents(getPathComponents(path)));
    return normalized && hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(normalized) : normalized;
}

function getPathFromPathComponents(pathComponents) {
    if (pathComponents.length === 0) return "";

    const root = pathComponents[0] && ensureTrailingDirectorySeparator(pathComponents[0]);
    return root + pathComponents.slice(1).join('/');
}


function ensureTrailingDirectorySeparator(path) {
    if (!hasTrailingDirectorySeparator(path)) {
        return path + '/';
    }

    return path;
}

function hasTrailingDirectorySeparator(path) {
    return path.length > 0 && isAnyDirectorySeparator(path.charCodeAt(path.length - 1));
}


function isAnyDirectorySeparator(charCode) {
    return charCode === '\\' || charCode === '/';
}


function getPathComponents(path, currentDirectory = "") {
    path = combinePaths(currentDirectory, path);
    return pathComponents(path, getRootLength(path));
}


function combinePaths(path, ...paths) {
    if (path) path = normalizeSlashes(path);
    for (let relativePath of paths) {
        if (!relativePath) continue;
        relativePath = normalizeSlashes(relativePath);
        if (!path || getRootLength(relativePath) !== 0) {
            path = relativePath;
        }
        else {
            path = ensureTrailingDirectorySeparator(path) + relativePath;
        }
    }
    return path;
}


function pathComponents(path, rootLength) {
    const root = path.substring(0, rootLength);
    const rest = path.substring(rootLength).split('/');
    // if (rest.length && !lastOrUndefined(rest)) rest.pop();
    return [root, ...rest];
}

function getRootLength(path) {
    return 1;
}

function reducePathComponents(components) {
    const reduced = [components[0]];
    for (let i = 1; i < components.length; i++) {
        const component = components[i];
        if (!component) continue;
        if (component === ".") continue;
        if (component === "..") {
            if (reduced.length > 1) {
                if (reduced[reduced.length - 1] !== "..") {
                    reduced.pop();
                    continue;
                }
            }
            else if (reduced[0]) continue;
        }
        reduced.push(component);
    }
    return reduced;
}

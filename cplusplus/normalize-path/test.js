const { normalizeSlashes, normalizePath } = require('./build/Release/normalize-path');
const relativePathSegmentRegExp = /(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)/;
const backslashRegExp = /\\/g; 

const backslashCharCode = '\\'.charCodeAt(0);
const forwardslashCharCode = '/'.charCodeAt(0);
const iterations = 1_000_000;

const testStrings = [
    "D:/foo\\bar/bar\\qua",
    "D:/foo",
    "D:\\foo\\bar",
    ".\\foo\\bar\\baz",
    "/dev/null/null/null\\null\\null",
    "/home/house/apartment/../foo/bar/../node_modules",
    "\\home\\house\\apartment\\..\\foo\\bar\\..\\node_modules"
];

const normalizeSlashImps = [
    ["Do Nothing", (_s) => ""],
    ["Do Nothing (with body)", (_s) => {
        _s = _s;
        return _s;
    }],
    ["JS (buffer)", jsNormalizeSlashes_buffer],
    ["JS (regex)", jsNormalizeSlashes_regex],
    ["Native (string)", normalizePath],
]

/*
let input = "D:/one\\two/../../three";
console.log(`Input is [[${input}]]`);
const output = jsNormalizeSlashes_buffer(input);
console.log(`Output is [[${output}]]`);
*/

function testImplementations(arr) {
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

testImplementations(normalizeSlashImps);

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

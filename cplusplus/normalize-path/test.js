const { normalizeSlashes, normalizePath } = require('./build/Release/normalize-path');
const relativePathSegmentRegExp = /(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)/;
const backslashRegExp = /\\/g; 

const iterations = 1_000_000;


let input = "D:/one\\two/../../three";
console.log(`Input is [[${input}]]`);
const output = normalizePath(input);
console.log(`Output is [[${output}]]`);

let timer;

for (let i = 0; i < 10; i++) {
    // console.log("Input length is now " + input.length);
    timer = timeIt("JS impl");
    for (let n = 0; n < iterations; n++) {
        const s = jsNormalizePath(input);
    }
    timer.stop();

    timer = timeIt("Native impl");
    for (let n = 0; n < iterations; n++) {
        const s = normalizePath(input);
    }
    timer.stop();

    console.log("");

    // input = input + "abc\\defg\\hij\\klmno\\pqrst/"
}

function timeIt(s) {
    const now = Date.now();
    return {
        stop() {
            console.log(`${s} ran in ${Date.now() - now}`);
        }
    }
}

function jsNormalizeSlashes(path) {
    const index = path.indexOf("\\");
    if (index === -1) {
        return path;
    }
    backslashRegExp.lastIndex = index; // prime regex with known position
    return path.replace(backslashRegExp, '/');
}

function jsNormalizePath(path) {
    path = jsNormalizeSlashes(path);
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

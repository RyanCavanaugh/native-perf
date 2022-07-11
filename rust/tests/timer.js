function timer(desc) {
    const start = Date.now();
    return {
        finish() {
            const d = Date.now() - start;
            console.log(`${desc} finished in ${Math.round(d)}ms`);
        }
    }
}

module.exports = {
    timer
};

const path = require('path');

module.exports = [{
    entry: './dist/renderer1.js',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: 'renderer1-bundle.js'
    },
    target: 'electron-renderer'
}, {
    entry: './dist/renderer2.js',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: 'renderer2-bundle.js'
    },
    target: 'electron-renderer'
}];

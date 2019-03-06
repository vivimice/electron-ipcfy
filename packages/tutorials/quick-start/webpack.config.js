const path = require('path');

module.exports = [{
    entry: './dist/renderer.js',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: 'renderer-bundle.js'
    },
    target: 'electron-renderer'
}];

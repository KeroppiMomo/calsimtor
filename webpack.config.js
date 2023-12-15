const path = require('path');

module.exports = {
    entry: "./dist/main.js",
    output: {
        filename: './dist/bundle.js',
        path: path.resolve(__dirname),
    },
    mode: 'development',
};

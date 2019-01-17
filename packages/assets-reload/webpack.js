var path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'CdnAssetsSwitch.js',
        library: 'CdnAssetsSwitch',
        libraryTarget: 'umd'
    },
    optimization: {
        minimize: false,
    }
};
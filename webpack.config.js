const path = require('path');
const webpack = require('webpack');

module.exports = {

    entry: {
        index: './src/index.ts'
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'InversifyReact',
        libraryTarget: 'umd',
        globalObject: `(typeof self !== 'undefined' ? self : this)`
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    
    devtool: 'source-map',

    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader'
            }
        ]
    },

    externals: {
        "react": {
            commonjs: "react",
            commonjs2: "react",
            amd: "react",
            root: "React"
        },
        "inversify": {
            commonjs: "inversify",
            commonjs2: "inversify",
            amd: "inversify",
            root: "Inversify"
        },
        "prop-types": {
            commonjs: "prop-types",
            commonjs2: "prop-types",
            amd: "prop-types",
            root: "PropTypes"
        }
    }
};
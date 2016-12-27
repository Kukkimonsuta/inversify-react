const path = require('path');

module.exports = {

    entry: {
        index: './src/index.tsx'
    },

    output: {
        path: './dist',
        filename: '[name].js',
        library: 'InversifyReact',
        libraryTarget: 'umd'
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },

    devtool: 'source-map',

    module: {
        rules: [
            { test: /\.(ts|tsx)$/, loader: 'awesome-typescript-loader' }
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
        }
    }
};
module.exports = {
    preset: 'ts-jest',
    testMatch: [
        '**/test/**/*.ts?(x)'
    ],
    globals: {
        'ts-jest': {
            tsconfig: './test/tsconfig.json'
        }
    },
    verbose: true,
};

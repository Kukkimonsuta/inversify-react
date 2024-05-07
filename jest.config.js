module.exports = {
    preset: 'ts-jest',
    "testEnvironment": 'jsdom',
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

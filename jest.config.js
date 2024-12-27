module.exports = {
    preset: 'ts-jest',
    testMatch: [
        '**/test/**/*.ts?(x)'
    ],
    testEnvironment: 'jsdom',
    transform: {
        '^.+.tsx?$': ['ts-jest', {
            tsconfig: './test/tsconfig.json'
        }],
    },
    verbose: true,
};

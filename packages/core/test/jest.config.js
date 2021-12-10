/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node',
    ],
    testRegex: '(/unit/.*|(\\.|/)(test|spec))\\.(ts|js)x?$',
    testPathIgnorePatterns: [
        'dist',
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx,js,jsx}',
        '!src/index.ts',
        '!src/http/index.ts',
        '!src/http/error/index.ts',
        '!src/http/header/index.ts',
        '!src/protocols/oauth2/client/error/*.ts',
        '!src/utils/index.ts',
        '!src/**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 59,
            functions: 77,
            lines: 73,
            statements: 74,
        },
    },
    rootDir: '../',
};

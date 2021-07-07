module.exports = {
    testEnvironment: 'node',
    transform: {
        "^.+\\.tsx?$": "ts-jest"
    },
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node",
    ],
    testRegex: '(/unit/.*|(\\.|/)(test|spec))\\.(ts|js)x?$',
    testPathIgnorePatterns: [
        "dist"
    ],
    coverageDirectory: 'writable/coverage',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx,js,jsx}',
        '!src/index.ts',
        '!src/http/index.ts',
        '!src/http/error/index.ts',
        '!src/http/header/index.ts',
        '!src/protocols/**',
        '!src/**/*.d.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 59,
            functions: 77,
            lines: 73,
            statements: 74
        }
    },
    rootDir: '../'
};

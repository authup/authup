/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-extraneous-dependencies
const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
    // eslint-disable-next-line class-methods-use-this
    sort(tests) {
        // Test structure information
        // https://github.com/facebook/jest/blob/6b8b1404a1d9254e7d5d90a8934087a9c9899dab/packages/jest-runner/src/types.ts#L17-L21
        const copyTests = Array.from(tests);
        return copyTests.sort((testA, testB) => (testA.path > testB.path ? 1 : -1));
    }
}

module.exports = CustomSequencer;

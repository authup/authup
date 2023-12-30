/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import { buildLookupDirectories } from '../../src/build';

describe('src/build', () => {
    it('should build lookup directories', () => {
        const paths = buildLookupDirectories();
        expect(paths).toEqual(['.', 'writable']);
    });

    it('should build lookup directories with writable directory env', () => {
        process.env.WRITABLE_DIRECTORY_PATH = 'foo';

        let paths = buildLookupDirectories();
        expect(paths).toEqual(['.', 'foo']);

        delete process.env.WRITABLE_DIRECTORY_PATH;

        paths = buildLookupDirectories();
        expect(paths).toEqual(['.', 'writable']);
    });

    it('should build lookup directories with config directory env', () => {
        process.env.CONFIG_DIRECTORY = 'foo';

        let paths = buildLookupDirectories();
        expect(paths).toEqual(['.', 'writable', 'foo']);

        delete process.env.CONFIG_DIRECTORY;

        paths = buildLookupDirectories();
        expect(paths).toEqual(['.', 'writable']);
    });
});

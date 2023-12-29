/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { findDirectoryPaths, findFilePaths } from '../../src/find';

describe('src/find', () => {
    it('should find config file paths', async () => {
        const config = await findFilePaths('test/data');

        expect(config.length).toEqual(3);
    });

    it('should not find config file paths', async () => {
        const config = await findFilePaths();

        expect(config.length).toEqual(0);
    });

    it('should find config directory paths', async () => {
        const config = await findDirectoryPaths('test/data');

        expect(config.length).toEqual(3);
    });

    it('should not find config directory paths', async () => {
        const config = await findDirectoryPaths();

        expect(config.length).toEqual(0);
    });
});

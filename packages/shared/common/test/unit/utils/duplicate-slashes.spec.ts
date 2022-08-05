/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { removeDuplicateForwardSlashesFromURL } from '../../../src';

describe('src/utils/duplicate-slashes.ts', () => {
    it('should build safe url', () => {
        let url = removeDuplicateForwardSlashesFromURL('https://example.com//path/123');
        expect(url).toEqual('https://example.com/path/123');

        // multiple slashes with http
        url = removeDuplicateForwardSlashesFromURL('http://example.com//path//123');
        expect(url).toEqual('http://example.com/path/123');

        // ensure tailing slash
        url = removeDuplicateForwardSlashesFromURL('https://example.com');
        expect(url).toEqual('https://example.com');

        url = removeDuplicateForwardSlashesFromURL('https://example.com/?id=1');
        expect(url).toEqual('https://example.com/?id=1');
    });
});

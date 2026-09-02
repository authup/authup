/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isHttpURL } from '../../src/pages/utils';

// The Applications page renders a client's `baseUrl` as a link, and the value
// is admin-entered configuration, so only an absolute http(s) URL may become
// an href: an allow-list, not a scheme deny-list.
describe('isHttpURL', () => {
    it.each([
        ['https://app.example', true],
        ['http://localhost:3000/home', true],
        // eslint-disable-next-line no-script-url -- the scheme under test
        ['javascript:alert(1)', false],
        ['myapp://home', false],
        ['not a url', false],
        ['', false],
        [null, false],
        [undefined, false],
    ])('should answer %s with %s', (value, expected) => {
        expect(isHttpURL(value)).toBe(expected);
    });
});

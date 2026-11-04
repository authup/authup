/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildShadowingCookiePaths, normalizeCookiePath } from '../../../../src/core/store/cookie-path';

describe('core/store/cookie-path', () => {
    it.each([
        [undefined, '/'],
        ['', '/'],
        ['/', '/'],
        ['//', '/'],
        ['/ui', '/ui'],
        ['/ui/', '/ui'],
        ['/ui//', '/ui'],
        ['ui', '/ui'],
        [' /ui/ ', '/ui'],
        ['/console/account/', '/console/account'],
    ])('normalizes %j to %j', (input, output) => {
        expect(normalizeCookiePath(input)).toEqual(output);
    });

    it.each([
        ['/', '/', []],
        ['/ui', '/ui', []],
        ['/ui/', '/ui', []],
        ['/ui/runs', '/ui', ['/ui/runs']],
        ['/a/b', '/', ['/a', '/a/b']],
        ['/console/account/x', '/console/account', ['/console', '/console/account/x']],
    ])('lists the shadowing paths of %j under %j', (pathname, cookiePath, output) => {
        expect(buildShadowingCookiePaths(pathname, cookiePath)).toEqual(output);
    });
});

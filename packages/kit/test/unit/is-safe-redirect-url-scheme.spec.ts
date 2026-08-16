/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isSafeRedirectURLScheme } from '../../src';

describe('is-safe-redirect-url-scheme', () => {
    it.each([
        ['https://app.example.com/cb'],
        ['http://localhost:3000/cb'],
        ['myapp://cb'],
        ['com.example.app:/oauth2redirect'],
        ['https://*.example.com/**'],
    ])('should accept %s', (value) => {
        expect(isSafeRedirectURLScheme(value)).toBeTruthy();
    });

    it.each([
        // eslint-disable-next-line no-script-url -- the scheme under test
        ['javascript:alert(document.cookie)//'],
        // eslint-disable-next-line no-script-url -- the scheme under test
        ['JavaScript:alert(1)'],
        ['data:text/html,<script>alert(1)</script>'],
        ['vbscript:msgbox(1)'],
        ['blob:https://app.example.com/uuid'],
        ['file:///etc/passwd'],
        ['about:blank'],
        ['not a url'],
    ])('should refuse %s', (value) => {
        expect(isSafeRedirectURLScheme(value)).toBeFalsy();
    });
});

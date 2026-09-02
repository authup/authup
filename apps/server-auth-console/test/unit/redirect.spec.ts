/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeRelativeRedirect } from '../../src/redirect';

describe('sanitizeRelativeRedirect', () => {
    it('should accept a simple rooted path', () => {
        expect(sanitizeRelativeRedirect('/users')).toEqual('/users');
    });

    it('should accept a rooted path with query and hash', () => {
        expect(sanitizeRelativeRedirect('/users?invite=abc#x')).toEqual('/users?invite=abc#x');
    });

    it('should accept a percent-encoded but still same-origin path', () => {
        expect(sanitizeRelativeRedirect('/a%20b')).toEqual('/a%20b');
    });

    it.each([
        ['undefined', undefined],
        ['null', null],
        ['number', 123],
        ['empty string', ''],
    ])('should reject non-string / empty input (%s)', (_label, input) => {
        expect(sanitizeRelativeRedirect(input)).toBeUndefined();
    });

    it.each([
        ['relative without leading slash', 'users'],
        ['absolute http url', 'http://evil.com'],
        // eslint-disable-next-line no-script-url
        ['scheme-only', 'javascript:alert(1)'],
        ['protocol-relative', '//evil.com'],
        ['backslash authority', '/\\evil.com'],
        ['double backslash', '\\\\evil.com'],
        ['backslash anywhere', '/path\\to'],
        ['encoded protocol-relative', '/%2fevil.com'],
        ['encoded backslash', '/%5cevil.com'],
        ['leading tab', '\t/users'],
        ['leading space', ' /users'],
        ['embedded newline', '/a\nb'],
        ['encoded newline (CRLF/header injection)', '/a%0ab'],
        ['encoded carriage return', '/a%0db'],
        ['DEL control char', '/a\u007fb'],
    ])('should reject %s', (_label, input) => {
        expect(sanitizeRelativeRedirect(input)).toBeUndefined();
    });
});

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { redactSensitiveURLParams } from '../../../../src/adapters/http/middleware/built-in/logger.ts';

describe('redactSensitiveURLParams', () => {
    it('should redact an id_token_hint from a /logout URL', () => {
        const redacted = redactSensitiveURLParams('/logout?id_token_hint=eyJhbGciOi.eyJzdWIi.sig&state=abc');

        expect(redacted).not.toContain('eyJhbGciOi');
        expect(redacted).toContain('id_token_hint=***');
        expect(redacted).toContain('state=abc');
    });

    it('should redact an authorization code from a callback URL', () => {
        const redacted = redactSensitiveURLParams('/identity-providers/x/authorize-callback?code=secret-code&state=s');

        expect(redacted).toContain('code=***');
        expect(redacted).toContain('state=s');
    });

    it('should redact every occurrence of a repeated sensitive param', () => {
        const redacted = redactSensitiveURLParams('/logout?id_token_hint=a&id_token_hint=b');

        expect(redacted).not.toContain('=a');
        expect(redacted).not.toContain('=b');
    });

    it('should leave a query-less URL untouched', () => {
        expect(redactSensitiveURLParams('/logout')).toEqual('/logout');
    });

    it('should leave non-sensitive params untouched', () => {
        const url = '/users?filter%5Bname%5D=foo&page%5Blimit%5D=10';
        expect(redactSensitiveURLParams(url)).toEqual(url);
    });
});

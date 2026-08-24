/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildConsoleLoginURL } from '../../../../src';

describe('core/oauth2/authorization-request', () => {
    describe('buildConsoleLoginURL', () => {
        it('should default to the account console', () => {
            expect(buildConsoleLoginURL({ baseURL: 'https://auth.example.com' }))
                .toEqual('https://auth.example.com/account/login');
        });

        it('should carry a realm hint', () => {
            expect(buildConsoleLoginURL({
                baseURL: 'https://auth.example.com',
                realmId: 'master',
            })).toEqual('https://auth.example.com/account/login?realmId=master');
        });

        it('should address another console', () => {
            // The per-console half of the flow (plan 088): the OAuth2 client
            // and the return target differ, so the path does too.
            expect(buildConsoleLoginURL({
                baseURL: 'https://auth.example.com',
                console: 'admin',
            })).toEqual('https://auth.example.com/admin/login');
        });

        it('should not double the separator on a trailing slash', () => {
            // publicUrl is normalized upstream, but a caller passing the raw
            // value would otherwise emit `//account/login`, which is a
            // protocol-relative path once resolved.
            expect(buildConsoleLoginURL({ baseURL: 'https://auth.example.com/auth/' }))
                .toEqual('https://auth.example.com/auth/account/login');
        });
    });
});

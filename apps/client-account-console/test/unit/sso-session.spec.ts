/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @vitest-environment happy-dom

import { CookieName } from '@authup/core-http-kit';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { readSsoRealmId } from '../../src/sso-session';

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/`;
}

afterEach(() => {
    for (const entry of document.cookie.split(';')) {
        const key = entry.split('=')[0]?.trim();
        if (key) {
            document.cookie = `${key}=; path=/; max-age=0`;
        }
    }
});

describe('src/sso-session', () => {
    it('reads the realm id from the bare tier', () => {
        setCookie(
            CookieName.REALM,
            encodeURIComponent(JSON.stringify({ id: 'realm-1', name: 'master' })),
        );

        expect(readSsoRealmId()).toEqual('realm-1');
    });

    it('returns undefined without an SSO session', () => {
        expect(readSsoRealmId()).toBeUndefined();
    });

    it('ignores this console\'s own namespaced realm cookie', () => {
        // The namespaced set is read by the store itself. If this reached for
        // it too, the console would kick against its own stale realm instead
        // of the realm the IdP session is actually in.
        setCookie(
            `account-console.${CookieName.REALM}`,
            encodeURIComponent(JSON.stringify({ id: 'realm-mine', name: 'mine' })),
        );

        expect(readSsoRealmId()).toBeUndefined();
    });

    it.each([
        ['not json at all', 'nonsense'],
        ['a malformed percent escape', '%E0%A4%A'],
        ['json without an id', encodeURIComponent(JSON.stringify({ name: 'master' }))],
        ['a non-string id', encodeURIComponent(JSON.stringify({ id: 42 }))],
        ['an empty id', encodeURIComponent(JSON.stringify({ id: '' }))],
        ['a json primitive', encodeURIComponent(JSON.stringify('realm-1'))],
    ])('degrades to undefined for %s', (_label, value) => {
        // Any same-origin script can write this cookie, so a bad value has to
        // mean "no SSO session", never an exception out of a render.
        setCookie(CookieName.REALM, value);

        expect(readSsoRealmId()).toBeUndefined();
    });
});

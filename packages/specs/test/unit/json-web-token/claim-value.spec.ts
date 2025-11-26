/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { JWTClaims } from '../../../src';
import { getJWTClaimByPattern } from '../../../src';

const claims : JWTClaims = {
    iss: 'https://google.de',
    realm_access: {
        roles: ['foo', 'bar', 'baz'],
    },
    bool: true,
    num: 5,
    empty: '',
    nu: null,
};

describe('src/json-web-token', () => {
    it('should get claim value', () => {
        let value = getJWTClaimByPattern(claims, 'iss');
        expect(value).toEqual(['https://google.de']);

        value = getJWTClaimByPattern(claims, 'iss', /google/);
        expect(value).toEqual(['https://google.de']);

        value = getJWTClaimByPattern(claims, 'iss', 'google', true);
        expect(value).toEqual(['https://google.de']);

        value = getJWTClaimByPattern(claims, 'bool');
        expect(value).toEqual([true]);

        value = getJWTClaimByPattern(claims, 'num');
        expect(value).toEqual([5]);

        value = getJWTClaimByPattern(claims, 'foo');
        expect(value).toEqual([]);

        value = getJWTClaimByPattern(claims, 'empty');
        expect(value).toEqual(['']);

        value = getJWTClaimByPattern(claims, 'empty', '');
        expect(value).toEqual(['']);

        value = getJWTClaimByPattern(claims, 'nu');
        expect(value).toEqual([null]);

        value = getJWTClaimByPattern(claims, 'nu', null);
        expect(value).toEqual([null]);

        value = getJWTClaimByPattern(claims, 'nu', undefined);
        expect(value).toEqual([null]);

        value = getJWTClaimByPattern(claims, 'nu', '');
        expect(value).toEqual([]);
    });

    it('should get nested claim value', () => {
        let value = getJWTClaimByPattern(claims, 'realm_access.roles');
        expect(value).toEqual([claims.realm_access.roles]);

        value = getJWTClaimByPattern(claims, 'realm_access.roles.*', 'foo');
        expect(value).toEqual(['foo']);

        value = getJWTClaimByPattern(claims, 'realm_access.roles.*', /b/);
        expect(value).toEqual(['bar', 'baz']);
    });
});

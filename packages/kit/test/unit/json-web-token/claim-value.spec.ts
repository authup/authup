/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../../../src';
import { getJWTClaim } from '../../../src';

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
        let value = getJWTClaim(claims, 'iss');
        expect(value).toEqual('https://google.de');

        value = getJWTClaim(claims, 'iss', /google/);
        expect(value).toEqual('https://google.de');

        value = getJWTClaim(claims, 'iss', 'google', true);
        expect(value).toEqual('https://google.de');

        value = getJWTClaim(claims, 'bool');
        expect(value).toEqual(true);

        value = getJWTClaim(claims, 'num');
        expect(value).toEqual(5);

        value = getJWTClaim(claims, 'foo');
        expect(value).toBeUndefined();

        value = getJWTClaim(claims, 'empty');
        expect(value).toEqual('');

        value = getJWTClaim(claims, 'empty', '');
        expect(value).toEqual('');

        value = getJWTClaim(claims, 'nu');
        expect(value).toEqual(null);

        value = getJWTClaim(claims, 'nu', null);
        expect(value).toEqual(null);

        value = getJWTClaim(claims, 'nu', undefined);
        expect(value).toEqual(null);

        value = getJWTClaim(claims, 'nu', '');
        expect(value).toEqual(undefined);
    });

    it('should get nested claim value', () => {
        let value = getJWTClaim(claims, 'realm_access\\.roles');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaim(claims, 'realm_access\\.roles', 'foo');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaim(claims, 'realm_access\\.roles', /b/);
        expect(value).toEqual(claims.realm_access.roles);
    });
});

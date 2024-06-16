/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../../../src';
import { getJWTClaimBy } from '../../../src';

const claims : JWTClaims = {
    iss: 'https://google.de',
    realm_access: {
        roles: ['foo', 'bar', 'baz'],
    },
    bool: true,
    num: 5,
    empty: '',
};

describe('src/json-web-token', () => {
    it('should get claim value', () => {
        let value = getJWTClaimBy(claims, 'iss');
        expect(value).toEqual('https://google.de');

        value = getJWTClaimBy(claims, 'iss', /google/);
        expect(value).toEqual('https://google.de');

        value = getJWTClaimBy(claims, 'iss', 'google', true);
        expect(value).toEqual('https://google.de');

        value = getJWTClaimBy(claims, 'bool');
        expect(value).toEqual(true);

        value = getJWTClaimBy(claims, 'num');
        expect(value).toEqual(5);

        value = getJWTClaimBy(claims, 'foo');
        expect(value).toBeUndefined();

        value = getJWTClaimBy(claims, 'empty');
        expect(value).toEqual('');

        value = getJWTClaimBy(claims, 'empty', '');
        expect(value).toEqual('');
    });

    it('should get nested claim value', () => {
        let value = getJWTClaimBy(claims, 'realm_access\\.roles');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaimBy(claims, 'realm_access\\.roles', 'foo');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaimBy(claims, 'realm_access\\.roles', /b/);
        expect(value).toEqual(claims.realm_access.roles);
    });
});

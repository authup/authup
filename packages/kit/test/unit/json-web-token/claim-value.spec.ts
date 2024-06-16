/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../../../src';
import { getJWTClaimValueBy } from '../../../src';

const claims : JWTClaims = {
    iss: 'http://google.de',
    realm_access: {
        roles: ['foo', 'bar', 'baz'],
    },
    bool: true,
    num: 5,
};

describe('src/json-web-token', () => {
    it('should get claim value', () => {
        let value = getJWTClaimValueBy(claims, 'iss');
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueBy(claims, 'iss', /google/);
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueBy(claims, 'iss', 'google', true);
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueBy(claims, 'bool');
        expect(value).toEqual(true);

        value = getJWTClaimValueBy(claims, 'num');
        expect(value).toEqual(5);

        value = getJWTClaimValueBy(claims, 'foo');
        expect(value).toBeUndefined();
    });

    it('should get nested claim value', () => {
        let value = getJWTClaimValueBy(claims, 'realm_access\\.roles');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaimValueBy(claims, 'realm_access\\.roles', 'foo');
        expect(value).toEqual(['foo']);

        value = getJWTClaimValueBy(claims, 'realm_access\\.roles', /b/);
        expect(value).toEqual(['bar', 'baz']);
    });
});

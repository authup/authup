/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../../../src';
import { getJWTClaimValueByMapping } from '../../../src';

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
        let value = getJWTClaimValueByMapping(claims, 'iss');
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueByMapping(claims, 'iss', /google/);
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueByMapping(claims, 'iss', 'google', true);
        expect(value).toEqual('http://google.de');

        value = getJWTClaimValueByMapping(claims, 'bool');
        expect(value).toEqual(true);

        value = getJWTClaimValueByMapping(claims, 'num');
        expect(value).toEqual(5);

        value = getJWTClaimValueByMapping(claims, 'foo');
        expect(value).toBeUndefined();
    });

    it('should get nested claim value', () => {
        let value = getJWTClaimValueByMapping(claims, 'realm_access\\.roles');
        expect(value).toEqual(claims.realm_access.roles);

        value = getJWTClaimValueByMapping(claims, 'realm_access\\.roles', 'foo');
        expect(value).toEqual(['foo']);

        value = getJWTClaimValueByMapping(claims, 'realm_access\\.roles', /b/);
        expect(value).toEqual(['bar', 'baz']);
    });
});

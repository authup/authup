/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { getBodyRealmID } from '../../../../../src/adapters/http/request';

const UUID = '4f4d3b3e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';

describe('getBodyRealmID', () => {
    it('should return a UUID realmId', () => {
        expect(getBodyRealmID({ realmId: UUID })).toEqual(UUID);
    });

    it('should ignore a non-UUID realmId', () => {
        expect(getBodyRealmID({ realmId: 'master' })).toBeUndefined();
    });

    it('should ignore a non-string realmId', () => {
        expect(getBodyRealmID({ realmId: 123 as any })).toBeUndefined();
    });

    it('should return undefined for a missing realmId or body', () => {
        expect(getBodyRealmID({})).toBeUndefined();
        expect(getBodyRealmID(undefined)).toBeUndefined();
    });
});

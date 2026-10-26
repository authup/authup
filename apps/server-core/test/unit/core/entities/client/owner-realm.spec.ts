/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isValidationError } from '@authup/errors';
import { applyOwningClientRealm } from '../../../../../src/core/entities/client/owner-realm.ts';

const realmId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('core/entities/client/owner-realm', () => {
    it('should take the realm of the owning client when none is given', () => {
        const input = {
            clientId: 'x', 
            client: { realmId }, 
            realmId: null, 
        };
        applyOwningClientRealm(input);
        expect(input.realmId).toEqual(realmId);
    });

    it('should accept the realm of the owning client in another case', () => {
        const input = {
            clientId: 'x', 
            client: { realmId }, 
            realmId: realmId.toUpperCase(), 
        };
        expect(() => applyOwningClientRealm(input)).not.toThrow();
    });

    it('should refuse a realm other than the owning client\'s', () => {
        const input = {
            clientId: 'x', 
            client: { realmId }, 
            realmId: 'f1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 
        };
        let error: unknown;
        try {
            applyOwningClientRealm(input);
        } catch (e) {
            error = e;
        }
        expect(isValidationError(error)).toBe(true);
    });
});

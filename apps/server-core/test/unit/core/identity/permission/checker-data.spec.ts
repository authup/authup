/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import type { Identity } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { ActorContext } from '@authup/server-kit';
import { describe, expect, it } from 'vitest';
import { buildPermissionCheckerData } from '../../../../../src/core/identity/permission/checker/data.ts';
import type { PermissionCheckerDataContext } from '../../../../../src/core/identity/permission/checker/data.ts';

const USER_ID = '245e3c5d-5747-4fbd-8554-c33d34780c58';
const REALM_ID = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';

const held : PermissionPolicyBinding[] = [{ permission: { name: 'user_read' }, realmScope: 'own' }];
const forged : PermissionPolicyBinding[] = [{ permission: { name: 'realm_delete' }, realmScope: 'any' }];

function actor() : ActorContext {
    return {
        ...createAllowAllActor(),
        identity: {
            type: IdentityType.USER,
            data: { id: USER_ID, realmId: REALM_ID },
        } as Identity,
        grants: async () => held,
    };
}

const ctx = {
    identityResolver: { resolve: async () => null },
    identityPermissionProvider: { getFor: async () => held },
} as unknown as PermissionCheckerDataContext;

// The check routes take the identity key from the caller's body, so the grants
// riding on it are the caller's to write: they must be replaced by the loaded
// ones, or a caller could claim any grant it likes.
describe('core/identity/permission/checker/data', () => {
    it('replaces grants a caller placed on its own identity', async () => {
        const output = await buildPermissionCheckerData({
            [BuiltInPolicyType.IDENTITY]: {
                type: IdentityType.USER,
                id: USER_ID,
                grants: forged,
            },
        }, actor(), ctx);

        expect(output[BuiltInPolicyType.IDENTITY].grants).toEqual(held);
    });

    it('places the actor with its loaded grants when the body names no identity', async () => {
        const output = await buildPermissionCheckerData({}, actor(), ctx);

        expect(output[BuiltInPolicyType.IDENTITY]).toMatchObject({
            type: IdentityType.USER,
            id: USER_ID,
            grants: held,
        });
    });

    it('places no identity and no grants for an explicit null', async () => {
        const output = await buildPermissionCheckerData({ [BuiltInPolicyType.IDENTITY]: null }, actor(), ctx);

        expect(output[BuiltInPolicyType.IDENTITY]).toBeNull();
    });
});

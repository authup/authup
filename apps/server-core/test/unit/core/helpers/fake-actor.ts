/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Realm, User } from '@authup/core-kit';
import { IdentityType, REALM_MASTER_NAME } from '@authup/core-kit';
import type { ActorContext } from '../../../../src/core/entities/actor/types.ts';
import { FakePermissionEvaluator } from './fake-permission-evaluator.ts';

export type FakeActorContext = ActorContext & {
    permissionEvaluator: FakePermissionEvaluator;
};

export function createAllowAllActor(): FakeActorContext {
    return { permissionEvaluator: new FakePermissionEvaluator() };
}

export function createDenyAllActor(): FakeActorContext {
    const evaluator = new FakePermissionEvaluator();
    evaluator.denyAll();
    return { permissionEvaluator: evaluator };
}

export function createMasterRealmActor(realmId?: string): FakeActorContext {
    const id = realmId || randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                realm_id: id,
                realm: {
                    id,
                    name: REALM_MASTER_NAME,
                } as Realm,
            } as User,
        },
    };
}

export function createNonMasterRealmActor(realmId?: string): FakeActorContext {
    const id = realmId || randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                realm_id: id,
                realm: {
                    id,
                    name: 'test-realm',
                } as Realm,
            } as User,
        },
    };
}

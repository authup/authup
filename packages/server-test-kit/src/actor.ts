/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Identity, Realm, User } from '@authup/core-kit';
import { IdentityType, REALM_MASTER_NAME } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from './fake-permission-evaluator.ts';

/**
 * An actor over a {@link FakePermissionEvaluator}. The identity defaults to
 * the full user or client row; a resource server passes its own shape, e.g.
 * `FakeActorContext<ActorIdentity>`.
 */
export type FakeActorContext<TIdentity = Identity> = ActorContext<TIdentity> & {
    permissionEvaluator: FakePermissionEvaluator;
};

function withIdentity<TIdentity>(
    evaluator: FakePermissionEvaluator,
    identity?: TIdentity,
): FakeActorContext<TIdentity> {
    return {
        permissionEvaluator: evaluator,
        ...(typeof identity !== 'undefined' ? { identity } : {}),
    };
}

export function createAllowAllActor<TIdentity = Identity>(identity?: TIdentity): FakeActorContext<TIdentity> {
    return withIdentity(new FakePermissionEvaluator(), identity);
}

export function createDenyAllActor<TIdentity = Identity>(identity?: TIdentity): FakeActorContext<TIdentity> {
    const evaluator = new FakePermissionEvaluator();

    evaluator.denyAll();

    return withIdentity(evaluator, identity);
}

export function createMasterRealmActor(realmId?: string): FakeActorContext {
    const id = realmId || randomUUID();

    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                realmId: id,
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
                realmId: id,
                realm: {
                    id,
                    name: 'test-realm',
                } as Realm,
            } as User,
        },
    };
}

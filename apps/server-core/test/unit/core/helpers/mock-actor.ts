/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IPermissionEvaluator, PermissionEvaluationContext } from '@authup/access';
import type { Realm, User } from '@authup/core-kit';
import { IdentityType, REALM_MASTER_NAME } from '@authup/core-kit';
import { vi } from 'vitest';
import { ForbiddenError } from '@ebec/http';
import type { ActorContext } from '../../../../src/core/entities/actor/types.ts';

function createMockPermissionEvaluator(
    handler: (ctx: PermissionEvaluationContext) => void = () => {},
): IPermissionEvaluator {
    return {
        evaluate: vi.fn().mockImplementation(async (ctx: PermissionEvaluationContext) => handler(ctx)),
        evaluateOneOf: vi.fn().mockImplementation(async (ctx: PermissionEvaluationContext) => handler(ctx)),
        preEvaluate: vi.fn().mockImplementation(async (ctx: PermissionEvaluationContext) => handler(ctx)),
        preEvaluateOneOf: vi.fn().mockImplementation(async (ctx: PermissionEvaluationContext) => handler(ctx)),
    };
}

export function createAllowAllActor(): ActorContext {
    return {
        permissionEvaluator: createMockPermissionEvaluator(),
    };
}

export function createDenyAllActor(): ActorContext {
    return {
        permissionEvaluator: createMockPermissionEvaluator(() => {
            throw new ForbiddenError();
        }),
    };
}

export function createMasterRealmActor(realmId?: string): ActorContext {
    const id = realmId || randomUUID();
    return {
        permissionEvaluator: createMockPermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                realm_id: id,
                realm: { id, name: REALM_MASTER_NAME } as Realm,
            } as User,
        },
    };
}

export function createNonMasterRealmActor(realmId?: string): ActorContext {
    const id = realmId || randomUUID();
    return {
        permissionEvaluator: createMockPermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                realm_id: id,
                realm: { id, name: 'test-realm' } as Realm,
            } as User,
        },
    };
}

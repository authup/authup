/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData } from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { IdentityType, PermissionName } from '@authup/core-kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { isObject, isUUID } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import type { IIdentityResolver } from '../../resolver/types.ts';
import { toIdentityPolicyData } from '../identity-policy-data.ts';
import type { IIdentityPermissionProvider } from '../types.ts';

/**
 * The data a permission or policy check evaluates, decided by its own
 * `identity` key (#3604):
 *
 * - absent: the actor's identity, which the HTTP routes hand over only when
 *   the request's scopes include `global`;
 * - `null`: no identity at all;
 * - the actor's own identity: that identity, as given;
 * - any other identity: that identity, as given, once the actor may check
 *   for it (see `authorizeCheckFor`).
 */
export async function buildPermissionCheckerData(
    data: Record<string, any>,
    actor: ActorContext,
    identityResolver: IIdentityResolver,
) : Promise<Record<string, any>> {
    const output = { ...data };
    const own = toIdentityPolicyData(actor.identity);
    const identity = output[BuiltInPolicyType.IDENTITY];

    if (typeof identity === 'undefined') {
        if (own) {
            output[BuiltInPolicyType.IDENTITY] = own;
        }

        return output;
    }

    if (identity !== null && !isOwnIdentity(identity, own)) {
        await authorizeCheckFor(identity, own, actor, identityResolver);
    }

    return output;
}

function isOwnIdentity(identity: unknown, own: IdentityPolicyData | undefined) : boolean {
    return !!own &&
        isObject(identity) &&
        identity.type === own.type &&
        identity.id === own.id;
}

/**
 * Checking for anyone but the actor needs PERMISSION_CHECK, evaluated for the
 * actor with the subject's STORED realm under `realmMatch`. The check data
 * belongs to the permission or policy being checked, so none of it reaches
 * this gate. The grant lookup loads by id alone, so a realm written into the
 * data could not bound the gate either. The gate is pre-evaluated before the
 * subject is looked up, so a caller holding no grant learns nothing about
 * which subjects exist. The subject is named by UUID, since names repeat
 * across realms.
 */
async function authorizeCheckFor(
    identity: unknown,
    own: IdentityPolicyData | undefined,
    actor: ActorContext,
    identityResolver: IIdentityResolver,
) : Promise<void> {
    if (
        !isObject(identity) ||
        !Object.values(IdentityType).includes(identity.type) ||
        typeof identity.id !== 'string' ||
        !isUUID(identity.id)
    ) {
        throw new ValidationError('The identity to check for must name a user or a client by type and id (UUID).');
    }

    await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_CHECK });

    const subject = await identityResolver.resolve(identity.type, identity.id);
    if (!subject) {
        throw new EntityNotFoundError();
    }

    await actor.permissionEvaluator.evaluate({
        name: PermissionName.PERMISSION_CHECK,
        data: new PolicyData({
            ...(own ? { [BuiltInPolicyType.IDENTITY]: own } : {}),
            [BuiltInPolicyType.REALM_MATCH]: subject.data.realmId ?? null,
        }),
    });
}

/**
 * Where a check's engine reads grants from: the actor's own, as its request
 * resolved them (#3597: a token's grants are narrowed to its client), when the
 * check evaluates the actor, so the route answers what the actor's gates
 * decide; any other subject's as stored.
 */
export function createCheckerGrantSource(
    actor: ActorContext,
    provider: Pick<IIdentityPermissionProvider, 'getFor'>,
) : Pick<IIdentityPermissionProvider, 'getFor'> {
    const own = toIdentityPolicyData(actor.identity);

    return {
        getFor: (identity) => {
            if (actor.grants && isOwnIdentity(identity, own)) {
                return actor.grants();
            }

            return provider.getFor(identity);
        },
    };
}

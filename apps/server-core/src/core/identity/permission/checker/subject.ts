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

/**
 * The identity a permission or policy check is asked FOR, read from the
 * check data's own `identity` key. Absent asks about the caller, whose
 * identity the request governs; anything present, `null` included, names a
 * subject. Naming a subject requires PERMISSION_CHECK, matched against
 * the realm of the subject as stored rather than any realm the caller wrote,
 * because the permission-binding evaluator loads the grants of whatever
 * identity it is handed (#3604). The subject is named by id only: names repeat
 * across realms (every realm has an `admin-console` client), so a name would
 * not say which subject is meant.
 *
 * The gate is pre-evaluated before the subject is looked up, so a caller
 * holding no such grant learns nothing about which subjects exist.
 */
export async function resolveCheckSubject(
    input: unknown,
    actor: ActorContext,
    identityResolver: IIdentityResolver,
) : Promise<IdentityPolicyData | undefined> {
    if (typeof input === 'undefined') {
        return undefined;
    }

    if (
        !isObject(input) ||
        !Object.values(IdentityType).includes(input.type) ||
        typeof input.id !== 'string' ||
        !isUUID(input.id)
    ) {
        throw new ValidationError('The identity to check for must name a user or a client by type and id (UUID).');
    }

    await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_CHECK });

    const identity = await identityResolver.resolve(input.type, input.id);
    if (!identity) {
        throw new EntityNotFoundError();
    }

    await actor.permissionEvaluator.evaluate({
        name: PermissionName.PERMISSION_CHECK,
        data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: identity.data.realmId ?? null }),
    });

    return toIdentityPolicyData(identity);
}

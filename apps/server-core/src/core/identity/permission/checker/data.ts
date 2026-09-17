/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { IdentityType, PermissionName } from '@authup/core-kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { isObject, isUUID } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import type { IIdentityResolver } from '../../resolver/types.ts';
import { toIdentityPolicyData } from '../identity-policy-data.ts';

/**
 * The data a permission or policy check evaluates, decided by its own
 * `identity` key (#3604):
 *
 * - absent: the actor's identity, which the HTTP routes hand over only when
 *   the request's scopes include `global`;
 * - `null`: no identity at all;
 * - an identity: that identity, as given. When it is not the actor's own, the
 *   actor must hold PERMISSION_CHECK reaching the subject's STORED realm. The
 *   grant lookup loads by id alone, so a realm written in the data could not
 *   bound the gate; the subject is looked up for its realm and nothing else,
 *   and only after the gate is pre-evaluated, so a caller holding no grant
 *   learns nothing about which subjects exist. It is named by UUID, since
 *   names repeat across realms.
 */
export async function buildCheckData(
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

    if (
        identity === null ||
        (own && isObject(identity) && identity.type === own.type && identity.id === own.id)
    ) {
        return output;
    }

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

    return output;
}

/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '@authup/access';
import { mergePermissionItems } from '@authup/access';
import type { Request } from 'routup';
import type { ActorContext } from '../../../../core/index.ts';
import type { IdentityPermissionService } from '../../../../services/index.ts';
import { useRequestPermissionChecker } from '../permission/helper.ts';
import { useRequestIdentity } from './identity.ts';

export function buildActorContext(
    req: Request,
    identityPermissionService?: IdentityPermissionService,
): ActorContext {
    const permissionChecker = useRequestPermissionChecker(req);
    const identity = useRequestIdentity(req);

    let resolveJunctionPolicy: ((permissionName: string) => Promise<PolicyWithType | undefined>) | undefined;

    if (identityPermissionService && identity) {
        resolveJunctionPolicy = async (permissionName: string): Promise<PolicyWithType | undefined> => {
            const bindings = await identityPermissionService.getFor(identity);
            const matching = bindings.filter((b) => b.name === permissionName);
            if (matching.length === 0) {
                return undefined;
            }

            const merged = mergePermissionItems(
                matching.map((b) => ({
                    name: b.name,
                    client_id: b.client_id,
                    realm_id: b.realm_id,
                    policy: (b as any).policy || undefined,
                })),
            );

            if (merged.length > 0 && merged[0].policy) {
                return merged[0].policy;
            }

            return undefined;
        };
    }

    return {
        permissionChecker,
        identity: identity ? identity.raw : undefined,
        resolveJunctionPolicy,
    };
}

/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '@authup/access';
import { mergePermissionBindings } from '@authup/access';
import type { Request } from 'routup';
import type { ActorContext, IIdentityPermissionProvider, ResolveJunctionPolicyOptions } from '../../../../core/index.ts';
import { useRequestPermissionEvaluator } from '../permission/helper.ts';
import { useRequestIdentity } from './identity.ts';

export function buildActorContext(
    req: Request,
    identityPermissionProvider?: IIdentityPermissionProvider,
): ActorContext {
    const permissionEvaluator = useRequestPermissionEvaluator(req);
    const identity = useRequestIdentity(req);

    let resolveJunctionPolicy: ((options: ResolveJunctionPolicyOptions) => Promise<PolicyWithType | undefined>) | undefined;

    if (identityPermissionProvider && identity) {
        resolveJunctionPolicy = async (options: ResolveJunctionPolicyOptions): Promise<PolicyWithType | undefined> => {
            const bindings = await identityPermissionProvider.getFor(identity);
            const matching = bindings.filter((b) => {
                if (b.permission.name !== options.name) {
                    return false;
                }

                if (typeof options.realm_id !== 'undefined') {
                    if ((b.permission.realm_id ?? null) !== (options.realm_id ?? null)) {
                        return false;
                    }
                }

                if (typeof options.client_id !== 'undefined') {
                    if ((b.permission.client_id ?? null) !== (options.client_id ?? null)) {
                        return false;
                    }
                }

                return true;
            });

            if (matching.length === 0) {
                return undefined;
            }

            const merged = mergePermissionBindings(matching);

            if (merged.length > 0 && merged[0].policies && merged[0].policies.length > 0) {
                return merged[0].policies[0];
            }

            return undefined;
        };
    }

    return {
        permissionEvaluator,
        identity: identity ? identity.raw : undefined,
        resolveJunctionPolicy,
    };
}

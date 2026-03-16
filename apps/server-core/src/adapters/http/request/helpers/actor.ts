/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import type { ActorContext } from '../../../../core/index.ts';
import { useRequestPermissionChecker } from '../permission/helper.ts';
import { useRequestIdentity } from './identity.ts';

export function buildActorContext(req: Request): ActorContext {
    const permissionChecker = useRequestPermissionChecker(req);
    const identity = useRequestIdentity(req);

    return {
        permissionChecker,
        identity: identity ? identity.raw : undefined,
    };
}

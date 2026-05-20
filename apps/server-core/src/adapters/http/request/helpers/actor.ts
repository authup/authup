/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { ActorContext } from '@authup/server-kit';
import { useRequestPermissionEvaluator } from '../permission/helper.ts';
import { useRequestIdentity } from './identity.ts';

export function buildActorContext(event: IAppEvent): ActorContext {
    const identity = useRequestIdentity(event);

    return {
        permissionEvaluator: useRequestPermissionEvaluator(event),
        identity: identity ? identity.raw : undefined,
    };
}

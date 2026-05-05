/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IRoutupEvent } from 'routup';
import type { ActorContext } from '../../../../core/index.ts';
import { useRequestPermissionEvaluator } from '../permission/helper.ts';
import { useRequestIdentity } from './identity.ts';

export function buildActorContext(event: IRoutupEvent): ActorContext {
    const identity = useRequestIdentity(event);

    return {
        permissionEvaluator: useRequestPermissionEvaluator(event),
        identity: identity ? identity.raw : undefined,
    };
}

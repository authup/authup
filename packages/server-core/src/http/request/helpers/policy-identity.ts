/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationIdentity } from '@authup/permitus';
import type { Request } from 'routup';

import { useRequestEnv } from './env';

export function generatePolicyIdentityByRequest(req: Request) : PolicyEvaluationIdentity | undefined {
    const env = useRequestEnv(req);
    if (env.userId) {
        return {
            type: 'user',
            id: env.userId,
            realmId: env.realm?.id,
            realmName: env.realm?.name,
        };
    }

    if (env.robotId) {
        return {
            type: 'robot',
            id: env.robotId,
            realmId: env.realm?.id,
            realmName: env.realm?.name,
        };
    }

    if (env.clientId) {
        return {
            type: 'client',
            id: env.clientId,
            realmId: env.realm?.id,
            realmName: env.realm?.name,
        };
    }

    return undefined;
}

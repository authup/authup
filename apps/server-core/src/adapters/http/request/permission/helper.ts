/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';
import type { RequestPermissionEvaluator } from './module.ts';

const sym = Symbol('RequestPermissionEvaluator');

export function useRequestPermissionEvaluator(req: Request) : RequestPermissionEvaluator {
    const instance = useRequestEnv(req, sym);
    if (!instance) {
        throw new Error('The request permission evaluator is not initialised.');
    }

    return instance as RequestPermissionEvaluator;
}

export function setRequestPermissionEvaluator(req: Request, ctx: RequestPermissionEvaluator) {
    setRequestEnv(req, sym, ctx);
}

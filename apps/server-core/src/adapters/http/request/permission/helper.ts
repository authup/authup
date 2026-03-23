/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';
import type { RequestAccessContext } from './module.ts';

const sym = Symbol('RequestAccessContext');

export function useRequestPermissionEvaluator(req: Request) : RequestAccessContext {
    const instance = useRequestEnv(req, sym);
    if (!instance) {
        throw new Error('The request permission evaluator is not initialised.');
    }

    return instance as RequestAccessContext;
}

export function setRequestPermissionEvaluator(req: Request, ctx: RequestAccessContext) {
    setRequestEnv(req, sym, ctx);
}

/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';
import type { RequestPermissionChecker } from './module';

const sym = Symbol('RequestPermissionChecker');

export function useRequestPermissionChecker(req: Request) : RequestPermissionChecker {
    const instance = useRequestEnv(req, sym);
    if (!instance) {
        throw new Error('The request permission checker instance is not initialised.');
    }

    return instance as RequestPermissionChecker;
}

export function setRequestPermissionChecker(req: Request, checker: RequestPermissionChecker) {
    setRequestEnv(req, sym, checker);
}

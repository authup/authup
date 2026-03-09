/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';

const sym = Symbol('Scopes');

export function useRequestScopes(req: Request) : string[] {
    const scopes = useRequestEnv(req, sym) as string[];

    return scopes || [];
}

export function setRequestScopes(req: Request, scopes: string[]) {
    setRequestEnv(req, sym, scopes);
}

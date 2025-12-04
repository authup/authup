/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';

const sym = Symbol('Token');

export function useRequestToken(req: Request) {
    return useRequestEnv(req, sym) as string | undefined;
}

export function setRequestToken(req: Request, token: string) {
    setRequestEnv(req, sym, token);
}

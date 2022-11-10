/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Request, useRequestEnv as useEnv, setRequestEnv as setEnv } from 'routup';
import { RequestEnv } from './type';

export function useRequestEnv<T extends keyof RequestEnv>(req: Request, key: T) : RequestEnv[T] {
    return useEnv(req, key) as RequestEnv[T];
}

export function setRequestEnv<T extends keyof RequestEnv>(req: Request, key: T, value: RequestEnv[T]) {
    return setEnv(req, key, value);
}


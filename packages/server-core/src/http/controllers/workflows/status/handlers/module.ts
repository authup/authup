/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { load } from 'locter';
import { send } from 'routup';
import type { Request, Response } from 'routup';
import { useConfig } from '../../../../../config';
import { resolvePackagePath } from '../../../../../path';

export type EndpointInfo = {
    version: string,
    timestamp: number,
    tokenMaxAgeAccessToken: number,
    tokenMaxAgeRefreshToken: number,
    redis: boolean,
    vault: boolean
};

let info : undefined | EndpointInfo;

export async function useInfo() {
    if (typeof info !== 'undefined') {
        return info;
    }

    const pkgJson = await load(path.join(resolvePackagePath(), 'package.json'));
    const config = useConfig();

    info = {
        version: pkgJson.version,
        timestamp: Date.now(),
        tokenMaxAgeAccessToken: config.tokenAccessMaxAge,
        tokenMaxAgeRefreshToken: config.tokenRefreshMaxAge,
        redis: !!config.redis,
        vault: !!config.vault,
    };

    return info;
}
export async function useStatusRouteHandler(req: Request, res: Response) : Promise<any> {
    const status = await useInfo();
    status.timestamp = Date.now();

    return send(res, status);
}

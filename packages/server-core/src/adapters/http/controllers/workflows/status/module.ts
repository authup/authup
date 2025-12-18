/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet,
} from '@routup/decorators';
import { load } from 'locter';
import path from 'node:path';
import { resolvePackagePath } from '../../../../../path';

export type EndpointInfo = {
    version: string,
    timestamp: number
};

@DController('')
export class StatusController {
    @DGet('/', [])
    async status(): Promise<EndpointInfo> {
        const pkgJson = await load(path.join(resolvePackagePath(), 'package.json'));

        return {
            version: pkgJson.version,
            timestamp: Date.now(),
        };
    }
}

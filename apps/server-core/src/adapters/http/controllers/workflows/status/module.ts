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
import { PACKAGE_PATH } from '../../../../../path.ts';

export type EndpointInfo = {
    version: string,
    date: string
};

@DController('')
export class StatusController {
    @DGet('/', [])
    async status(): Promise<EndpointInfo> {
        const pkgJson = await load(path.join(PACKAGE_PATH, 'package.json'));
        const isoDate = new Date().toISOString();

        return {
            version: pkgJson.version,
            date: isoDate,
        };
    }
}

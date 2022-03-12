/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';
import { TokenMaxAgeType } from '@authelion/common';

export type ExpressAppCreateContext = {
    writableDirectoryPath?: string,
    swaggerDocumentation?: boolean

    webUrl: string,
    selfUrl: string,

    tokenMaxAge?: TokenMaxAgeType,

    redis?: boolean | string | Client
};

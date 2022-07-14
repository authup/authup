/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenMaxAgeType } from '@authelion/common';

export type ControllerOptions = {
    tokenMaxAge?: TokenMaxAgeType,

    selfUrl: string,
    selfAuthorizeRedirectUrl?: string,

    writableDirectoryPath: string
};

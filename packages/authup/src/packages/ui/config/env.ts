/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasProcessEnv, readIntFromProcessEnv } from '@authup/server-common';
import type { UIConfig } from './type';

export function extendUIConfigWithEnv(config: UIConfig) {
    if (hasProcessEnv('PORT')) {
        config.set('port', readIntFromProcessEnv('PORT'));
    }

    if (hasProcessEnv('UI_PORT')) {
        config.set('port', readIntFromProcessEnv('UI_PORT'));
    }
}

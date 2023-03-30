/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CommandExecutionContext } from '../../type';

export type UIStartCommandContext = CommandExecutionContext<{
    NUXT_PORT: number,

    NUXT_HOST: string,

    NUXT_API_URL: string
}>;

/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OutputOptions } from 'dycraft';

export type Config = {
    port: number,

    host: string,

    apiUrl: string,

    publicUrl?: string
} & Partial<OutputOptions>;

export type ConfigInput = Partial<Config>;

export type ConfigBuildContext = {
    data?: ConfigInput,
    env?: boolean
};

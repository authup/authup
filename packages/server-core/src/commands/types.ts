/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';

export type CommandContext = {
    dataSourceOptions?: DataSourceOptions
};

export type SetupCommandContext = CommandContext & {
    database?: boolean,
    databaseSchema?: boolean,
    databaseSeed?: boolean,

    documentation?: boolean
};

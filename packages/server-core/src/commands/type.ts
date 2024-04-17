/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, DataSourceOptions } from 'typeorm';
import type { Logger } from '@authup/server-kit';

export type CommandContext = {
    logger?: Logger,

    dataSourceOptions?: DataSourceOptions
};

export type StartCommandContext = CommandContext & {
    databaseAdminPasswordReset?: boolean,
    databaseRobotSecretReset?: boolean,
};

export type SetupCommandContext = CommandContext & {
    database?: boolean,
    databaseSchema?: boolean,
    databaseSeed?: boolean,

    documentation?: boolean
};

export type UpgradeCommandContext = CommandContext & {
    dataSource?: DataSource,
    databaseSeed?: boolean,
    dataSourceDestroyOnCompletion?: boolean
};

export type ResetCommandContext = CommandContext;

export type MigrationGenerateCommandContext = CommandContext & {
    name?: string,
    directory?: string,
    dataSource: DataSource
};

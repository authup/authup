/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { Logger, Spinner } from '../config';

export type CommandContext = {
    spinner?: Spinner,
    logger?: Logger,

    dataSourceOptions?: DataSourceOptions
};

export type StartCommandContext = CommandContext;

export type SetupCommandContext = CommandContext & {
    database?: boolean,
    databaseSeed?: boolean,

    documentation?: boolean
};

export type UpgradeCommandContext = CommandContext & {
    migrationsGenerate?: boolean,
    dataSource?: DataSource,
    dataSourceDestroyOnCompletion?: boolean
};

export type ResetCommandContext = CommandContext;

export type MigrationGenerateCommandContext = CommandContext & {
    name?: string,
    directory?: string,
    dataSource: DataSource
};

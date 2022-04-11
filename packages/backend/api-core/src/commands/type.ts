/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import { Config } from '../config';
import { DatabaseRootSeederOptions } from '../database';

export type Spinner = {
    start(text?: string) : Spinner,
    succeed(text?: string) : Spinner,
    stop() : Spinner,
    fail(text?: string) : Spinner,
    warn(text?: string) : Spinner,
    info(string?: string) : Spinner,
    [key: string] : any,
};

export type CommandContext = {
    config?: Config,
    databaseConnectionMerge?: boolean,
    databaseSeederOptions?: Partial<DatabaseRootSeederOptions>,
    spinner?: Spinner
};

export type StartCommandContext = CommandContext;

export type SetupCommandContext = CommandContext & {
    keyPair: boolean,
    database: boolean,
    databaseSeeder: boolean,
    documentation: boolean
};

export type UpgradeCommandContext = CommandContext & {
    migrationsGenerate?: boolean
};

export type ResetCommandContext = CommandContext;

export type CheckCommandContext = CommandContext;

export type MigrationGenerateCommandContext = CommandContext & {
    name?: string,
    directory?: string,
    dataSource: DataSource
};

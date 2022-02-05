/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Connection } from 'typeorm';
import { Config } from '../config';
import { DatabaseRootSeederOptions } from '../database';

export type CommandContext = {
    config?: Config,
    databaseConnectionMerge?: boolean,
    databaseSeederOptions?: Partial<DatabaseRootSeederOptions>
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
    connection?: Connection
};

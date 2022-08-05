/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { loadConfig, setConfig, setupCommand } from '@authelion/server-core';
import * as ora from 'ora';

import { DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions } from '../database/utils';

interface SetupArguments extends Arguments {
    root: string;
    database: boolean;
    databaseSchema: boolean;
    databaseSeed: boolean;
    documentation: boolean;
}

export class SetupCommand implements CommandModule {
    command = 'setup';

    describe = 'Run initial setup operation.';

    // eslint-disable-next-line class-methods-use-this
    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            })

            .option('database', {
                alias: 'db',
                describe: 'Create database.',
                type: 'boolean',
            })

            .option('databaseSchema', {
                alias: 'db:schema',
                describe: 'Setup the schema of database.',
                type: 'boolean',
            })

            .option('databaseSeed', {
                alias: 'db:seed',
                describe: 'Seed database.',
                type: 'boolean',
            })

            .option('documentation', {
                alias: 'docs',
                describe: 'Create swagger documentation.',
                type: 'boolean',
            });
    }

    // eslint-disable-next-line class-methods-use-this
    async handler(args: SetupArguments) {
        const config = await loadConfig(args.root);
        setConfig(config);

        const dataSourceOptions = await buildDataSourceOptions();

        if (process.env.NODE_ENV === 'test') {
            Object.assign(dataSourceOptions, {
                migrations: [],
            } as DataSourceOptions);
        }

        const spinner = ora.default({
            spinner: 'dots',
        });

        try {
            await setupCommand({
                spinner,
                dataSourceOptions,
                ...args,
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
            process.exit(1);
        }

        process.exit(0);
    }
}
